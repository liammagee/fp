"use strict";
define([
    "jquery",
    "three",
    "underscore",
    "astar",
    "dat.gui",
    "smoothie",
    "stats.min",
    "jstat.min",
    "Mirror",
    "WaterShader",
    "TerrainLoader",
    "THREEx.KeyboardState",
    "TrackballControls",
    "OrbitControls",
    "PointerLockControls",
    ], function($, THREE, _, astar) {

    /**
     * Extension to JQuery for URL param extraction - taken from: http://www.sitepoint.com/url-parameters-jquery/
     */
    $.urlParam = function(name){
        var results = new RegExp("[\\?&]" + name + "=([^&#]*)").exec(window.location.href);
        if ( results === null )
           return undefined;
        else
           return results[1] || 0;
    };

    $.sign = function(x) {
        return typeof x === 'number' ? x ? x < 0 ? -1 : 1 : x === x ? 0 : NaN : NaN;
    };


    /**
     * Overall Fierce Planet object.
     * @module fp
     * @namespace fp
     */
    var FiercePlanet = function() {

        var fp = this;
        this.container = null;
        this.scene = null;
        this.appConfig = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.mouse = { x: 0, y: 0, z: 1 };
        this.mouseVector = new THREE.Vector3();
        this.keyboard = new THREEx.KeyboardState();
        this.stats = null;
        this.terrain = null;
        this.controls = null;
        this.gui = null;
        this.chart = null;
        this.ray = new THREE.Raycaster( new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0) );
        this.skyBox = null;
        this.waterMesh = null;
        this.water = null;
        this.agentNetwork = null;
        this.pathNetwork = null;
        this.trailNetwork = null;
        this.cursor = null;
        this.sim = null;
        this.lightHemisphere = null;
        this.lightDirectional = null;

        /**
         * Represents a network of agents. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        this.AgentNetwork = function() {

            /**
             * Represents a specific network within the overall network configuration. Also provides factory and utility methods.
             * @constructor
             * @memberof fp.AgentNetwork
             * @inner
             */
            this.AgentNetworkNetwork = function( color ) {
                this.links = [];
                this.networkColor = color;
                this.networkMesh = null;

                this.AgentNetworkNetworkLink = function( agent1, agent2 ) {
                    this.agent1 = agent1;
                    this.agent2 = agent2;
                };

                /**
                 * Generates a set of vertices for connected agents.
                 * @return {vertices}
                 */
                this.generateFriendNetworkVertices = function() {
                    var vertices = [];
                    for (var i = 0; i < this.links.length; i++ ) {
                        var link = this.links[i];
                        var agent1 = link.agent1,
                            agent2 = link.agent2;
                        var p1 = fp.terrain.transformPointFromPlaneToSphere( agent1.position.clone(), fp.terrain.wrappedPercent ),
                            p2 = fp.terrain.transformPointFromPlaneToSphere( agent2.position.clone(), fp.terrain.wrappedPercent );
                        p1.y += fp.appConfig.agentOptions.size / 8;
                        p2.y += fp.appConfig.agentOptions.size / 8;
                        vertices.push(p2);
                        vertices.push(p1);
                    }
                    return vertices;
                };

                /**
                 * Generates a curved geometry to represent the agent network.
                 * @param  {Array} vertices
                 * @return {THREE.Geometry}
                 */
                this.friendNetworkGeometryCurved = function( vertices ) {
                    var networkGeometry = new THREE.Geometry();
                    var len = vertices.length;
                    var spline = new THREE.Spline( vertices );
                    var n_sub = fp.appConfig.displayOptions.networkCurvePoints;
                    var position, index;
                    for (var i = 0; i < len * n_sub; i ++ ) {
                        index = i / ( len * n_sub );
                        position = spline.getPoint( index );
                        networkGeometry.vertices[ i ] = new THREE.Vector3( position.x, position.y, position.z );
                    }
                    return networkGeometry;
                };

                /**
                 * Generates a geometry (curved or straight) to represent the agent network.
                 * @param  {Array} vertices
                 * @return {THREE.Geometry}
                 */
                this.friendNetworkGeometry = function( vertices ) {
                    if ( !fp.appConfig.displayOptions.networkCurve ) {
                        var networkGeometry = new THREE.Geometry();
                        networkGeometry.vertices = vertices;
                        return networkGeometry;
                    }
                    else
                        return this.friendNetworkGeometryCurved( vertices );
                };

                /**
                 * Returns a material for the network.
                 * @return {THREE.LineBasicMaterial}
                 */
                this.friendNetworkMaterial = function() {
                    return new THREE.LineBasicMaterial( {
                        color: this.networkColor || fp.appConfig.colorOptions.colorNightNetwork,
                        linewidth: 1,
                        opacity: 1.0,
                        blending: THREE.NormalBlending,
                        transparent: false
                    } );
                };

                /**
                 * Renders the agent network, creating an array of vertices and material and return a mesh of type THREE.Line.
                 * @return {THREE.Line}
                 */
                this.renderFriendNetwork = function() {
                    if ( !fp.AppState.runSimulation || !fp.appConfig.displayOptions.networkShow )
                        return;

                    if ( !_.isUndefined( this.networkMesh ) )
                        fp.scene.remove( this.networkMesh );
                    if ( fp.appConfig.displayOptions.networkCurve ) {
                        this.networkMesh = new THREE.Line(
                            this.friendNetworkGeometry( this.generateFriendNetworkVertices() ),
                            this.friendNetworkMaterial()
                        );
                    }
                    else {
                        this.networkMesh = new THREE.Line(
                            this.friendNetworkGeometry( this.generateFriendNetworkVertices() ),
                            this.friendNetworkMaterial(),
                            THREE.LinePieces
                        );
                    }
                    fp.scene.add( this.networkMesh );
                };

                /**
                 * Establish a link between two agents
                 */
                this.establishLink = function(agent1, agent2) {
                    // Introduce more variability by squaring the probability
                    var chance = Math.pow( fp.appConfig.agentOptions.chanceToJoinNetwork, 2 );
                    var chanceWithHome = Math.pow( fp.appConfig.agentOptions.chanceToJoinNetworkWithHome, 2 );
                    var chanceWithBothHomes = Math.pow( fp.appConfig.agentOptions.chanceToJoinNetworkWithBothHomes, 2 );
                    if ( Math.random() < chance ) {
                        // Add the other agent if it is not already contained in
                        // either agent's existing connections
                        var link1 = new this.AgentNetworkNetworkLink( agent1, agent2 );
                        var link2 = new this.AgentNetworkNetworkLink( agent2, agent1 );
                        if ( this.links.indexOf( link1 ) == -1 &&
                             this.links.indexOf( link2 ) == -1 ) {
                            this.links.push( link1 );
                        }
                    }
                    if ( Math.random() < chanceWithHome && ( agent1.home != null || agent2.home != null ) ) {
                        // Add the other agent if it is not already contained in
                        // either agent's existing connections
                        var link1 = new this.AgentNetworkNetworkLink( agent1, agent2 );
                        var link2 = new this.AgentNetworkNetworkLink( agent2, agent1 );
                        if ( this.links.indexOf( link1 ) == -1 &&
                             this.links.indexOf( link2 ) == -1 ) {
                            this.links.push( link1 );
                        }
                    }
                    if ( Math.random() < chanceWithBothHomes && agent1.home != null && agent2.home != null ) {
                        // Add the other agent if it is not already contained in
                        // either agent's existing connections
                        var link1 = new this.AgentNetworkNetworkLink( agent1, agent2 );
                        var link2 = new this.AgentNetworkNetworkLink( agent2, agent1 );
                        if ( this.links.indexOf( link1 ) == -1 &&
                             this.links.indexOf( link2 ) == -1 ) {
                            this.links.push( link1 );
                        }
                    }
                };

                /**
                 * Tries to enlist an agent in this network
                 * @param {fp.Agent} agent
                 */
                this.enlistAgent = function( agent ) {
                    var agents = fp.patchNetwork.patches[ fp.getPatchIndex( agent.position.x, agent.position.z )];
                    if ( _.isUndefined( agents ) )
                        return;
                    if ( agents.length <= 1 )
                        return;
                    for (var i = 0; i < agents.length; i++) {
                        if ( agents[ i ] == agent)
                            continue;
                        var otherAgent = agents[ i ];
                        this.establishLink( agent, otherAgent );
                    }
                };

                /**
                 * Updates the friend network at runtime, by building and rendering the network.
                 */
                this.updateAgentNetworkRendering = function() {
                    if ( !fp.AppState.runSimulation )
                        return;
                    this.renderFriendNetwork();
                };

            };

            /**
             * Creates an initial set of agents.
             */
            this.createInitialAgentPopulation = function() {
                for (var i = 0; i < fp.appConfig.agentOptions.initialPopulation; i++)
                    this.agents.push( this.createAgent() );
                this.buildAgentParticleSystem();
            };

            /**
             * Creates a single agent
             * @return {fp#Agent}
             */
            this.createAgent = function() {
                var position = new THREE.Vector3();
                var point = this.randomPointForAgent();
                var x = point.x;
                var z = point.z;
                var y = fp.getHeight(x, z) + fp.appConfig.agentOptions.terrainOffset;
                position.x = x;
                position.y = y;
                position.z = z;

                // Allow for the class to be overridden
                var agent = new fp.agentNetwork.agentClass();
                agent.setPosition( position );
                agent.setRandomDirection();

                agent.color = "#" + ( fp.appConfig.displayOptions.dayShow ?
                                      fp.appConfig.colorOptions.colorDayAgent.toString(16) :
                                      fp.appConfig.colorOptions.colorNightAgent.toString(16) );
                return agent;
            };

            /**
             * Finds a random point on the fp.terrain where the agent can be generated.
             *
             * @return {coordinate}
             */
            this.randomPointForAgent = function() {
                var extent = fp.appConfig.terrainOptions.gridExtent;
                var initExtent = ( fp.appConfig.agentOptions.initialExtent / 100 ) * extent * fp.appConfig.terrainOptions.multiplier;
                var initX = ( fp.appConfig.agentOptions.initialX / 100 ) * extent - ( extent / 2 );
                var initY = ( fp.appConfig.agentOptions.initialY / 100 ) * extent - ( extent / 2 );
                var x = Math.floor( ( Math.random() - 0.5 ) * initExtent ) + initX;
                var z = Math.floor( ( Math.random() - 0.5 ) * initExtent ) + initY;
                var point = null;

                if ( fp.appConfig.agentOptions.initialCircle ) {
                    var normX = x - initX, normZ = z - initY;
                    var radius = Math.sqrt(normX * normX + normZ * normZ);
                    while ( radius > initExtent  / 2 ) {
                        point = this.randomPointForAgent();
                        x = point.x;
                        z = point.z;
                        normX = x - initX;
                        normZ = z - initY;
                        radius = Math.sqrt(normX * normX + normZ * normZ);
                    }
                }

                var boundary = ( extent / 2 ) * fp.appConfig.terrainOptions.multiplier;
                while ( (x <  - boundary || x > boundary ) || (z <  - boundary || z > boundary ) ) {
                    point = this.randomPointForAgent();
                    x = point.x;
                    z = point.z;
                }

                if ( fp.appConfig.agentOptions.noWater ) {
                    var y = fp.getHeight(x, z);
                    while ( y <= 0 ) {
                        point = this.randomPointForAgent();
                        x = point.x;
                        z = point.z;
                        y = fp.getHeight(x, z);
                    }
                }
                return {x: x, z: z};
            };

            /**
             * Updates all agents belonging to this network.
             */
            this.updateAgents = function() {
                if ( !fp.AppState.runSimulation || _.isUndefined( this.particles ))
                    return;
                var agents = this.agents;

                if ( fp.appConfig.agentOptions.shuffle )
                    agents = _.shuffle( this.agents );

                for (var i = 0; i < agents.length; i++) {
                    var agent =  agents[ i ];

                    // Depending on the speed of the simulation, determine whether this agent needs to move
                    var timeToMove = Math.floor( ( i / this.agents.length) * fp.timescale.framesToYear );
                    var interval = fp.timescale.frameCounter % fp.timescale.framesToYear;
                    if ( timeToMove == interval )  {
                        var underConstruction = agent.build() || agent.buildRoad();

                        if ( underConstruction )
                            continue;

                        // No water around or home built? Move on...
                        agent.evaluateDirection();

                        // Enlist the agent in available networks
                        if ( fp.appConfig.agentOptions.establishLinks ) {
                            this.networks.forEach( function( network ) {
                                network.enlistAgent( agent );
                            } );
                        }

                        // Then add the position to this agent's trail
                        var ai = fp.getIndex( this.agents[i].lastPosition.x, this.agents[i].lastPosition.z );
                        if ( ai > -1 ) {
                            fp.trailNetwork.trails[ ai ] = ( fp.trailNetwork.trails[ai] ) ? fp.trailNetwork.trails[ai] + 1 : 1;
                        }

                        if ( agent.grounded )
                            agent.perturbDirection();

                        agent.updateTick();
                    }

                    // Move the agent
                    agent.move();

                    this.particles.geometry.vertices[ i ] = fp.terrain.transformPointFromPlaneToSphere( agent.position, fp.terrain.wrappedPercent );
                }
                this.particles.geometry.verticesNeedUpdate = true;
            };

            /**
             * Updates the agent network shader at runtime.
             */
            this.updateAgentShader = function() {
                if ( !_.isNull(this.agentParticleSystemAttributes) &&
                    typeof(this.agentParticleSystemAttributes.color) !== "undefined" &&
                    this.agentParticleSystemAttributes.color.value.length > 0) {
                    for( var i = 0; i < this.agents.length; i ++ ) {
                        if ( fp.appConfig.displayOptions.coloriseAgentsByHealth ) {
                            var agent = this.agents[i];
                            var health = this.agents[i].health;
                            var r = 0;
                            var g = fp.appConfig.displayOptions.dayShow ? 0.0 : 1.0;
                            var b = fp.appConfig.displayOptions.dayShow ? 1.0 : 0.0;
                            g *= (health / 100.0);
                            b *= (health / 100.0);
                            r = (100 - health) / 100.0;
                            var col = new THREE.Color(r, g, b);
                            this.agentParticleSystemAttributes.alpha.value[ i ] = 0.75;
                            this.agentParticleSystemAttributes.color.value[ i ] = new THREE.Color(col);
                        }
                        else {
                            this.agentParticleSystemAttributes.alpha.value[ i ] = (this.agents[i].health * 0.0075) + 0.025;
                            this.agentParticleSystemAttributes.color.value[ i ] = new THREE.Color( this.agents[i].color );
                        }
                    }
                    this.agentParticleSystemAttributes.color.needsUpdate = true; // important!
                }
            };

            /**
             * Updates the particle system representing this agent network.
             */
            this.updateAgentParticleSystem = function() {
                var agentGeometry = new THREE.Geometry();
                this.agents.forEach( function(agent) {
                    agentGeometry.vertices.push( fp.terrain.transformPointFromPlaneToSphere( agent.position, fp.terrain.wrappedPercent ) );
                } );

                // Shader approach from http://jsfiddle.net/8mrH7/3/
                this.agentParticleSystemAttributes = {
                    alpha: { type: "f", value: [] },
                    color: { type: "c", value: [] }
                };

                for( var i = 0; i < agentGeometry.vertices.length; i ++ ) {
                    this.agentParticleSystemAttributes.alpha.value[ i ] = ( fp.agentNetwork.agents[i].health * 0.0075) + 0.025;
                    this.agentParticleSystemAttributes.color.value[ i ] = new THREE.Color( fp.agentNetwork.agents[i].color );
                }

                // point cloud material
                var agentShaderMaterial = fp.agentNetwork.particles.material;
                agentShaderMaterial.attributes = this.agentParticleSystemAttributes;
                fp.scene.remove( fp.agentNetwork.particles );
                this.particles = new THREE.PointCloud( agentGeometry, agentShaderMaterial );
                this.particles.dynamic = true;
                this.particles.sortParticles = true;
                fp.scene.add( this.particles );
            };


            /**
             * Creates a set of attributes to represent each agent in the network.
             */
            this.buildAgentParticleSystem = function() {
                var agentGeometry = new THREE.Geometry();
                this.agents.forEach(function(agent) {
                    // agentGeometry.vertices.push( fp.terrain.transformPointFromPlaneToSphere( agent.vertex ), fp.terrain.wrappedPercent );
                    agentGeometry.vertices.push( fp.terrain.transformPointFromPlaneToSphere( agent.position, fp.terrain.wrappedPercent ) );
                } );

                // Shader approach from http://jsfiddle.net/8mrH7/3/
                this.agentParticleSystemAttributes = {
                    alpha: { type: "f", value: [] },
                    color: { type: "c", value: [] }
                };

                var discTexture = THREE.ImageUtils.loadTexture( "/images/sprites/stickman_180.png" );
                if ( !fp.appConfig.agentOptions.useStickman )
                    discTexture = THREE.ImageUtils.loadTexture( "/images/sprites/disc.png" );

                // uniforms
                var agentParticleSystemUniforms = {
                    texture:   { type: "t", value: discTexture },
                    size: { type: "f", value: Math.floor( fp.appConfig.agentOptions.size )}
                };

                for( var i = 0; i < agentGeometry.vertices.length; i ++ ) {
                    this.agentParticleSystemAttributes.alpha.value[ i ] = (this.agents[i].health * 0.0075) + 0.025;
                    this.agentParticleSystemAttributes.color.value[ i ] = new THREE.Color( this.agents[i].color );
                }

                // point cloud material
                var agentShaderMaterial = new THREE.ShaderMaterial( {
                    size: fp.appConfig.agentOptions.size,
                    uniforms: agentParticleSystemUniforms,
                    attributes: this.agentParticleSystemAttributes,
                    vertexShader:   fp.ShaderUtils.agentVertexShader(),
                    fragmentShader: fp.ShaderUtils.agentFragmentShader(),
                    sizeAttenuation: true,
                    fog: false,
                    blending: THREE.NormalBlending,
                    transparent: true,
                    alphaTest: 0.5
                });

                fp.scene.remove( this.particles );
                this.particles = new THREE.PointCloud( agentGeometry, agentShaderMaterial );
                this.particles.dynamic = true;
                this.particles.sortParticles = true;
                // fp.scene.add( this.particles );
            };

            /**
             * Wrapper method for updating individual agents, their network and the shader.
             */
            this.updateAgentNetwork = function() {
                this.updateAgents();
                this.networks.forEach( function(network) { network.updateAgentNetworkRendering() } );
                this.updateAgentShader();
            };

            this.agentClass = fp.Agent;
            this.agents = [];
            this.networks = [];
            this.networks.push( new this.AgentNetworkNetwork() );
            this.particles = null;
            this.agentParticleSystemAttributes = null;
        };

        this.BUILDING_FORMS = {
            names: [ "rectangle", "octagon", "fivesided", "triangle", "concave" ],
            rectangle: function(w, l, h) {
                var p1 = new THREE.Vector3(-w / 2, h, -l / 2);
                var p2 = new THREE.Vector3(w / 2, h, -l / 2);
                var p3 = new THREE.Vector3(w / 2, h, l / 2);
                var p4 = new THREE.Vector3(-w / 2, h, l / 2);
                return [p1, p2, p3, p4];
            },
            octagon: function(w, l, h) {
                var p1 = new THREE.Vector3(-w / 2, h, -l / 2);
                var p1_5 = new THREE.Vector3(0, h, -l / 1.5);
                var p2 = new THREE.Vector3(w / 2, h, -l / 2);
                var p2_5 = new THREE.Vector3(w / 1.5, h, 0);
                var p3 = new THREE.Vector3(w / 2, h, l / 2);
                var p3_5 = new THREE.Vector3(0, h, l / 1.5);
                var p4 = new THREE.Vector3(-w / 2, h, l / 2);
                var p4_5 = new THREE.Vector3(-w / 1.5, h, 0);
                return [p1,p1_5, p2,p2_5, p3,p3_5, p4,p4_5];
            },
            fivesided: function(w, l, h) {
                var p1 = new THREE.Vector3(-w / 2, h, -l / 2);
                var p2 = new THREE.Vector3(w / 2, h, -l / 2);
                var p3 = new THREE.Vector3(w / 2, h, l / 2);
                var p4 = new THREE.Vector3(-w / 2, h, l / 2);
                var p5 = new THREE.Vector3(-w, h, 0);
                return [p1, p2, p3, p4, p5];
            },
            triangle: function(w, l, h) {
                var p1 = new THREE.Vector3(-w / 2, h, -l / 2);
                var p2 = new THREE.Vector3(w / 2, h, -l / 2);
                var p3 = new THREE.Vector3(0, h, l / 2);
                return [p1, p2, p3];
            },
            concave: function(w, l, h) {
                var p1 = new THREE.Vector3(-w / 2, h, -l / 2);
                var p1_1 = new THREE.Vector3(-w / 4, h, -l / 2);
                var p1_2 = new THREE.Vector3(-w / 4, h, l / 4);
                var p1_3 = new THREE.Vector3(w / 4, h, l / 4);
                var p1_4 = new THREE.Vector3(w / 4, h, -l / 2);
                var p2 = new THREE.Vector3(w / 2, h, -l / 2);
                var p3 = new THREE.Vector3(w / 2, h, l / 2);
                var p4 = new THREE.Vector3(-w / 2, h, l / 2);
                return [p1, p1_1, p1_2, p1_3, p1_4, p2, p3, p4];
            }
        };

        /**
         * Represents a network of buildings. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        this.BuildingNetwork = function() {
            this.networkMesh = null;
            this.networkJstsCache = [];
            this.buildings = [];
            this.buildingHash = {};
            this.speedOfConstruction = 0.05;
            this.buildingObject = new THREE.Object3D();

            /**
             * Evaluation functions to determine proximities for developing buildings.
             * Currently evaluates for proximity of local roads, water, buildings and building height
             */
            this.proximityFunctions = function() {
                return [
                    // [ fp.checkProximityOfRoads, fp.appConfig.buildingOptions.roads ],
                    // [ fp.checkProximityOfWater, fp.appConfig.buildingOptions.water ],
                    [ fp.checkProximityOfBuildings, fp.appConfig.buildingOptions.otherBuildings ],
                    [ fp.checkNearestNeighbour, fp.appConfig.buildingOptions.distanceFromOtherBuildingsMin, fp.appConfig.buildingOptions.distanceFromOtherBuildingsMax ],
                    // [ fp.checkProximiteBuildingHeight, fp.appConfig.buildingOptions.buildingHeight  ]
                ];
             };

            /**
             * Generates a random number of levels, width and length for a building
             * @return {object} contains levels, width, length properties
             */
            this.generateRandomDimensions = function() {
                return {
                    levels: fp.appConfig.buildingOptions.minHeight + Math.floor( Math.random() * (fp.appConfig.buildingOptions.maxHeight - fp.appConfig.buildingOptions.minHeight) ) ,
                    width: fp.appConfig.buildingOptions.minWidth + Math.floor( Math.random() * (fp.appConfig.buildingOptions.maxWidth - fp.appConfig.buildingOptions.minWidth)) ,
                    length: fp.appConfig.buildingOptions.minLength + Math.floor( Math.random() * (fp.appConfig.buildingOptions.maxLength - fp.appConfig.buildingOptions.minLength))
                };
            };

            /**
             * Collision detection, based on the approach described here: http://stemkoski.github.io/Three.js/Collision-Detection.html.
             * // Simplified 2d alternative for collision detection
             */
            this.get2dPoints = function(building) {
                var points = [];
                var firstFloor = building.highResMeshContainer.children[0],
                    position = building.highResMeshContainer.position,
                    vertices = firstFloor.geometry.vertices,
                    ff0 = vertices[0].clone().applyMatrix4(firstFloor.matrix).add(building.highResMeshContainer.position),
                    ff1 = vertices[1].clone().applyMatrix4(firstFloor.matrix).add(building.highResMeshContainer.position),
                    ff2 = vertices[2].clone().applyMatrix4(firstFloor.matrix).add(building.highResMeshContainer.position),
                    ff3 = vertices[3].clone().applyMatrix4(firstFloor.matrix).add(building.highResMeshContainer.position),
                    wX = ff1.x - ff0.x, wZ = ff1.z - ff0.z, lX = ff3.x - ff0.x, lZ = ff3.z - ff0.z,
                    wXa = Math.abs(wX) + 1, wZa = Math.abs(wZ) + 1, lXa = Math.abs(lX) + 1, lZa = Math.abs(lZ) + 1,
                    wXi = Math.round(wX / wXa), wZi = Math.round(wZ / wZa), lXi = Math.round(lX / lXa), lZi = Math.round(lZ / lZa);
                var indexPrev = -1, offset = 1;
                for (var i = 0; i < wXa; i += offset) {
                    for (var j = 0; j < wZa; j += offset) {
                        var wXLocal = ff0.x + i * wXi, wZLocal = ff0.z + j * wZi;
                        for (var k = 0; k < lXa; k += offset) {
                            for (var l = 0; l < lZa; l += offset) {
                                var lXLocal = wXLocal + k * lXi, lZLocal = wZLocal + l * lZi;
                                var coordinate = { x: lXLocal, y: lZLocal };
                                if (points.indexOf(coordinate) == -1) {
                                    points.push(coordinate);
                                }
                            }
                        }
                    }
                }
                return points;
            };

            /**
             * Get a 2-dimensional array of points representing <em>all</em>
             * the points covered by the building.
             * @param  {fp~Building} building
             * @return {Array} points
             */
            this.get2dIndexPoints = function( building ) {
                return _.map( this.get2dPoints( building ), function(point) { return fp.getIndex(point.x, point.y); }  ) ;
            };

            /**
             * Get a 2-dimensional array of points representing the bounding box
             * of the building.
             * @param  {fp~Building} building
             * @return {Array} points
             */
            this.get2dPointsForBoundingBox = function( building ) {
                var points = [];
                // var firstFloor = building.highResMeshContainer.children[ 0 ],
                //     position = building.highResMeshContainer.position,
                //     vertices = firstFloor.geometry.vertices,
                //     verticesOnBase = vertices.length;
                var firstFloor = building.mockMesh,
                    position = building.highResMeshContainer.position,
                    vertices = firstFloor.geometry.vertices,
                    verticesOnBase = vertices.length;
                for (var i = 0; i < verticesOnBase / 2; i ++) {
                    // Adjust for the vertex's rotation, and add its position
                    var point  = vertices[ i ].clone().applyMatrix4( firstFloor.matrix );//.add( position );
                    points.push({ x: point.x, y: point.z });
                }
                return points;
            };

            /**
             * Creates a JSTS geometry from the bounding box of the building.
             * @param  {fp~Building} building
             * @return {jsts.geom.Polygon}
             */
            this.createJstsGeomFromBoundingBox = function( building ) {
                var points = this.get2dPointsForBoundingBox( building );
                var coords = _.map( points, function(p) { return new jsts.geom.Coordinate(p.x, p.y); } );
                var lineUnion, j = coords.length - 1;
                for (var i = 0; i < coords.length; i++ ) {
                    var line = new jsts.geom.LineString( [ coords[i], coords[ j ] ] );
                    j = i;
                    if ( _.isUndefined(lineUnion) )
                        lineUnion = line;
                    else
                        lineUnion = lineUnion.union( line );
                }
                var polygonizer = new jsts.operation.polygonize.Polygonizer();
                polygonizer.add( lineUnion );
                var polygon = polygonizer.getPolygons().toArray()[0];
                return polygon.buffer(0);
            };

            /**
             * Checks whether this building collides with any existing buildings.
             * @param  {fp~Building} building
             * @return {Boolean}
             */
            this.collidesWithOtherBuildings = function(building) {
                // Quick check
                if ( this.buildingHash[ fp.getIndex( building.lod.position.x, building.lod.position.z ) ] )
                    return true;
                var buildingGeometry = this.createJstsGeomFromBoundingBox( building );
                for (var i = 0; i < this.networkJstsCache.length; i ++) {
                    var b = this.networkJstsCache[i];
                    if ( b.intersects( buildingGeometry ) ) {
                        return true;
                    }
                }
                return false; // Be optimistic
            };

            /**
             * Checks whether this building collides with any parts of the road
             * network.
             * @param  {fp~Building} building
             * @return {Boolean}
             */
            this.collidesWithRoads = function( building ) {
                if ( _.isNull( fp.roadNetwork.networkGeometry ) )
                    return false;
                var buildingGeometry = this.createJstsGeomFromBoundingBox( building );
                return fp.roadNetwork.networkGeometry.crosses(buildingGeometry);
            };

            /**
             * Updates each building.
             */
            this.updateBuildings = function() {
                if ( !fp.AppState.runSimulation || !fp.appConfig.displayOptions.buildingsShow )
                    return;
                for (var i = 0; i < fp.buildingNetwork.buildings.length; i ++ ) {
                    var building = fp.buildingNetwork.buildings[i];
                    var likelihoodToGrow = Math.random();
                    if ( likelihoodToGrow > fp.likelihoodOfGrowth() )
                        building.updateBuilding();
                }
            };

            /**
             * Creates a new building, given a position and dimension
             * Some of the logic derived from: http://learningthreejs.com/blog/2013/08/02/how-to-do-a-procedural-city-in-100lines/
             */
            this.createBuilding = function( position, dimensions ) {

                // Give the building a form
                var buildingForm = fp.appConfig.buildingOptions.buildingForm;
                if (fp.appConfig.buildingOptions.randomForm)
                    buildingForm = fp.BUILDING_FORMS.names[Math.floor(Math.random() * fp.BUILDING_FORMS.names.length)];

                var rotateY = (fp.appConfig.buildingOptions.rotateSetAngle / 180) * Math.PI;
                if ( fp.appConfig.buildingOptions.rotateRandomly )
                    rotateY = Math.random() * Math.PI;
                var rotation = new THREE.Vector3( 0, rotateY, 0 );
                var building = new fp.Building( buildingForm, dimensions, position, rotation );

                // Before we add this, try to detect collision
                if ( fp.appConfig.buildingOptions.detectBuildingCollisions ) {
                    if ( fp.buildingNetwork.collidesWithOtherBuildings( building ) )
                        return undefined;
                }

                if (fp.appConfig.buildingOptions.detectRoadCollisions) {
                    if ( fp.buildingNetwork.collidesWithRoads( building ) )
                        return undefined;
                }

                // Handle building rotation
                var percent = fp.terrain.wrappedPercent;
                if ( percent > 0 ) {
                    var cv = _.clone( building.originPosition );
                    var nv = fp.terrain.transformPointFromPlaneToSphere( cv, 100 );
                    var v = fp.terrain.sphereOriginAngle( nv.x, nv.y, nv.z ).multiplyScalar( percent / 100 );
                    v.y = rotateY;
                    nv = fp.terrain.transformPointFromPlaneToSphere( cv, percent );
                    building.lod.rotation.set( v.x, v.y, v.z );
                    building.lod.position.set( nv.x, nv.y, nv.z );
                    building.highResMeshContainer.rotation.set( v.x, v.y, v.z );
                    building.highResMeshContainer.position.set( nv.x, nv.y, nv.z );
                    building.lowResMeshContainer.rotation.set( v.x, v.y, v.z );
                    building.lowResMeshContainer.position.set( nv.x, nv.y, nv.z );
                }

                // Add the building to caches
                fp.buildingNetwork.buildings.push( building );
                var index = fp.getIndex( position.x, position.z );
                fp.buildingNetwork.buildingHash[ index ] = building;
                // Add all ground floor vertices to hash, as crude collision detection
                // if ( fp.buildingNetwork.networkMesh.children.length == 0 ) {
                //     fp.buildingNetwork.networkMesh.add( clone );
                // }
                // else {
                //     console.log(fp.buildingNetwork.networkMesh.children[0].geometry.vertices.length);
                //     fp.buildingNetwork.networkMesh.children[0].geometry.merge( building.mesh.geometry, fp.buildingNetwork.networkMesh.children[0].matrix );
                //     console.log(fp.buildingNetwork.networkMesh.children[0].geometry.vertices.length);
                //     fp.buildingNetwork.networkMesh.children[0].geometry.verticesNeedUpdate = true;
                // }
                if ( fp.appConfig.buildingOptions.detectBuildingCollisions || fp.appConfig.buildingOptions.detectRoadCollisions )
                    fp.buildingNetwork.networkJstsCache.push( this.createJstsGeomFromBoundingBox( building ) );
                return building;
            };
        };

        /**
         * Represents a network of roads. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        this.RoadNetwork = function() {
            this.networkMesh = null;
            this.planeVertices = [];
            this.networkJstsCache = [];
            this.roads = {};
            this.indexValues = [];
            this.points = [];
            this.networkGeometry = null;
            this.intersections = [];

            /**
             * Creates a series of points from a start to end points.
             * The "road" will try to follow the path of least resistance
             * if the fp.terrain has variable height, effectively "curving"
             * around increases in height.
             * Taken from webgl_geometry_extrude_splines.html
             * @param  {THREE.Vector3} p1
             * @param  {THREE.Vector3} p2
             * @return {Array} points
             */
            this.getRoadTerrainPoints = function(p1, p2) {
                var points = [];
                var xLast = p1.x, yLast = 0, zLast = p1.z, lastChange = 0;
                var xd = p2.x - xLast, zd = p2.z - zLast;
                var distance = Math.sqrt(xd * xd + zd * zd) / fp.appConfig.roadOptions.roadSegments,
                    remaining = distance;
                p1 = new THREE.Vector3(p1.x, fp.getHeight(p1.x, p1.z), p1.z);
                p2 = new THREE.Vector3(p2.x, fp.getHeight(p2.x, p2.z), p2.z);
                points.push(p1);
                var yOffset = -10;
                for (var i = 0; i < distance; i++) {
                    var angle = Math.atan2(zd, xd),
                        angleLeft = angle - Math.PI / 2,
                        angleRight = angle + Math.PI / 2;
                    var x0 = xLast + xd * (1 / (remaining + 1)),
                        z0 = zLast + zd * (1 / (remaining + 1)),
                        y0 = fp.getHeight(x0, z0) + yOffset;
                    var x = x0, y = y0, z = z0, k;
                    for (var j = 1; j <= fp.appConfig.roadOptions.roadDeviation; j++) {
                        var xL = x0 + Math.cos(angleLeft) * j,
                            zL = z0 + Math.sin(angleLeft) * j,
                            yL = fp.getHeight(xL, zL) + yOffset;
                        if ( yL < y && yL > 0 ) {
                            x = xL;
                            y = yL;
                            z = zL;
                        }
                    }
                    for (k = 1; k <= fp.appConfig.roadOptions.roadDeviation; k++) {
                        var xR = x0 + Math.cos(angleRight) * k,
                            zR = z0 + Math.sin(angleRight) * k,
                            yR = fp.getHeight(xR, zR) + yOffset;
                        if ( yR < y && yR > 0 ) {
                            x = xR;
                            y = yR;
                            z = zR;
                        }
                    }
                    // Only create a point if there's a deviation from a straight line
                    if ( x != x0 || y != y0 || z != z0 ) {
                        x = Math.round(x);
                        y = Math.round(y);
                        z = Math.round(z);
                        var point = new THREE.Vector3(x, y, z);
                        points.push(point);
                        if (y != yLast) {
                            var yDiff = y - yLast;
                            var shift = i - lastChange + 1;
                            for (k = lastChange + 1; k < i; k ++) {
                                var change = yDiff * ((k - lastChange) / shift);
                                point.y += change;
                            }
                            lastChange = i;
                        }
                    }
                    xLast = x;
                    yLast = y;
                    zLast = z;
                    remaining--;
                    xd = p2.x - xLast;
                    zd = p2.z - zLast;
                }
                points.push(p2);
                return points;
            };

            /**
             * Creates a JSTS geometry from the points of the road.
             * @param  {fp~Road} road
             * @return {jsts.geom.Polygon}
             */
            this.createJstsGeomFromRoadPoints = function( points ) {
                var coords = _.map( points, function(p) { return new jsts.geom.Coordinate(p.x, p.y); } );
                var lineUnion, j = coords.length - 1;
                for (var i = 0; i < coords.length; i++ ) {
                    var line = new jsts.geom.LineString([coords[i], coords[j]]);
                    j = i;
                    if ( _.isUndefined(lineUnion) )
                        lineUnion = line;
                    else
                        lineUnion = lineUnion.union(line);
                }
                var polygonizer = new jsts.operation.polygonize.Polygonizer();
                polygonizer.add( lineUnion );
                var polygon = polygonizer.getPolygons().toArray()[0];
                return polygon.buffer(0);
            };

            /**
             * Adds a road between two points, with a given width.
             * @param {THREE.Vector3} p1
             * @param {THREE.Vector3} p2
             * @param {Number} roadWidth
             */
            this.addRoad = function( p1, p2, roadWidth ) {
                var points = this.getRoadTerrainPoints( p1, p2 );

                // Use a cut-off of 5 intersecting points to prevent this road being built
                var jstsCoords = _.map( points, function(p) { return new jsts.geom.Coordinate(p.x, p.z); } );
                var jstsGeom = new jsts.geom.LineString(jstsCoords);
                var overlap = fp.roadNetwork.countCollisions( jstsGeom );
                if ( overlap > fp.appConfig.roadOptions.overlapThreshold )
                    return false;

                // The above code probably should supercede this
                var thisIndexValues = _.map(points, function(p) { return fp.getIndex(p.x,p.z); });
                overlap = _.intersection( fp.roadNetwork.indexValues, thisIndexValues).length;
                if ( overlap > fp.appConfig.roadOptions.overlapThreshold )
                    return false;

                var extrudePath = new THREE.SplineCurve3( points );
                var roadColor = (fp.appConfig.displayOptions.dayShow) ? fp.appConfig.colorOptions.colorDayRoad : fp.appConfig.colorOptions.colorNightRoad;
                // var roadMaterial = new THREE.MeshBasicMaterial({ color: roadColor });
                var roadMaterial = new THREE.MeshLambertMaterial({ color: roadColor });
                roadMaterial.side = THREE.DoubleSide;
                var roadGeom = new THREE.TubeGeometry( extrudePath, points.length, roadWidth, fp.appConfig.roadOptions.roadRadiusSegments, false );

                var adjust = fp.appConfig.roadOptions.flattenAdjustment,
                    lift = fp.appConfig.roadOptions.flattenLift;
                var vertices = roadGeom.vertices;
                for (var i = 0; i <= vertices.length - fp.appConfig.roadOptions.roadRadiusSegments; i += fp.appConfig.roadOptions.roadRadiusSegments) {
                    var coil = vertices.slice(i, i + fp.appConfig.roadOptions.roadRadiusSegments);
                    var mean = jStat.mean( _.map(coil, function(p) { return p.y; } ) );
                    for (var j = 0; j < coil.length; j++) {
                        var y = coil[j].y;
                        var diff = y - mean;
                        var newDiff = diff * adjust;
                        vertices[i+j].y = lift + mean + newDiff;
                    }
                }

                // Cache the ordinary plane vertices
                fp.roadNetwork.planeVertices.push( vertices );

                // Transform vertices
                var percent = fp.terrain.wrappedPercent;
                if ( percent > 0 ) {
                    var transformedVertices = [];
                    for (var i = 0; i < vertices.length; i ++) {
                        transformedVertices.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ i ], percent ) );
                    }
                    roadGeom.vertices = transformedVertices;
                }

                // Add the road
                var roadMesh = new THREE.Mesh( roadGeom, roadMaterial );
                fp.roadNetwork.networkMesh.add( roadMesh );
                thisIndexValues.forEach(function(p) { fp.roadNetwork.roads[p] = roadMesh; });
                if ( _.isNull(this.networkGeometry) )
                    this.networkGeometry = new jsts.geom.LineString(jstsCoords);
                else {
                    try {
                        this.networkGeometry = this.networkGeometry.union( jstsGeom );
                    }
                    catch (e) { console.log(e); } // Sometimes get a TopologyError
                }
                fp.roadNetwork.indexValues = _.uniq( _.flatten( fp.roadNetwork.indexValues.push( thisIndexValues ) ) );
                return true;
            };

            /**
             * Counts the number of intersections this road has with the
             * existing network of roads.
             * @param  {fp~Road} road
             * @return {Number}
             */
            this.countCollisions = function( jstsGeom ) {
                if ( _.isNull( fp.roadNetwork.networkGeometry ) )
                    return 0;
                var intersections = fp.roadNetwork.networkGeometry.intersection( jstsGeom );
                if ( !_.isUndefined( intersections.geometries ) )
                    return intersections.geometries.length;
                else // most likely an instance of jsts.geom.Point
                    return 1;
            };

            /**
             * Returns an array of polygons representing the city "blocks",
             * where a block is an area completely and minimally contained by
             * roads.
             * @return {array} polygons
             */
            this.cityBlocks = function() {
                var polygonizer = new jsts.operation.polygonize.Polygonizer();
                polygonizer.add( this.networkGeometry );
                return polygonizer.getPolygons().toArray();
            };

            /**
             * Implementation of Surveyor's Formula - cf. http://www.mathopenref.com/coordpolygonarea2.html
             * @param  {jsts.geom.Polygon} polygon
             * @return {number}
             */
            this.getPolygonArea = function(polygon) {
                var points = polygon.shell.points;
                var area = 0;           // Accumulates area in the loop
                var j = points.length - 1;  // The last vertex is the 'previous' one to the first
                for ( var i = 0; i < points.length; i++ ) {
                    area = area + (points[j].x + points[i].x) * (points[j].y - points[i].y);
                    j = i;  //j is previous vertex to i
                }
                return area / 2;
            };
        };


        /**
         * Represents a square block of the fp.terrain. It has a value that can be used to represent some property of interest.
         * Using the default assumptions of the PatchNetwork functions, the value should be in the range [0, 1].
         * @constructor
         * @memberof fp
         * @inner
         */
        this.Patch = function( val ) {
            this.value = val;
            this.initialValue = val;

            /**
             * Updates the value of the patch.
             * @param  {Number} amount the amount to increment the value by.
             */
            this.updatePatchValue = function( amount ) {
                var val = this.value;
                if ( val + amount < 0.0001 )
                    val = 0.0001;
                else if ( val + amount > 1.0 )
                    val = 1.0;
                else
                    val += amount;
                this.value = val;
            };
        };

        /**
         * Represents a network of patches. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        this.PatchNetwork = function( func ) {
            this.plane = null;
            this.patches = {};
            this.patchValues = [];
            this.patchPlaneArray = [];
            this.patchSphereArray = [];
            this.patchMeanValue = 0;
            this.patchSize = fp.appConfig.terrainOptions.patchSize;
            this.initialisePatchFunction = !_.isUndefined( func ) ? func : function() { return Math.random(); };

            /**
             * Initialises each patch value with a random value.
             */
            this.initialisePatches = function() {
                var dim = Math.ceil( fp.terrain.gridPoints / fp.patchNetwork.patchSize ) - 1;
                fp.patchNetwork.patchValues = new Array( dim * dim );
                for (var i = 0; i < fp.patchNetwork.patchValues.length; i++ ) {
                    fp.patchNetwork.patchValues[i] = new fp.Patch( this.initialisePatchFunction() );
                }
            };

            /**
             * Construct a geometry with closed spaces.
             */
            this.cloneGeometry = function() {
                var clone = fp.terrain.plane.geometry.clone();
                var vertices = fp.terrain.plane.geometry.attributes.position.array;
                var dim = Math.ceil( fp.terrain.gridPoints / fp.patchNetwork.patchSize );
                var patchSize = fp.patchNetwork.patchSize;
                var size = fp.terrain.gridExtent * fp.appConfig.terrainOptions.multiplier;
                var newPoints = fp.terrain.gridPoints + dim;
                var geometry = new THREE.PlaneBufferGeometry( size, size, newPoints - 1, newPoints - 1 );
                // var geometry = new THREE.PlaneBufferGeometry( size, size, fp.terrain.gridPoints - 1, fp.terrain.gridPoints - 1 );
                var patchSizeOffset = fp.patchNetwork.patchSize + 1;
                var newOffset = 0, oldOffset = 0;
                var counter = 0;
                for ( var i = 0; i < fp.terrain.gridPoints; i++ ) {
                    for ( var j = 0; j < fp.terrain.gridPoints; j++ ) {
                        geometry.attributes.position.array[ newOffset + 0 ] = vertices[ oldOffset + 0 ];
                        geometry.attributes.position.array[ newOffset + 1 ] = vertices[ oldOffset + 1 ];
                        geometry.attributes.position.array[ newOffset + 2 ] = vertices[ oldOffset + 2 ];
                        if ( i % patchSize == 0 ) {
                            newOffset += newPoints * 3 ;
                            geometry.attributes.position.array[ newOffset + 0 ] = vertices[ oldOffset + 0 ];
                            geometry.attributes.position.array[ newOffset + 1 ] = vertices[ oldOffset + 1 ];
                            geometry.attributes.position.array[ newOffset + 2 ] = vertices[ oldOffset + 2 ];
                            if ( j % patchSize == 0 ) {
                                newOffset += 3;
                                geometry.attributes.position.array[ newOffset + 0 ] = vertices[ oldOffset + 0 ];
                                geometry.attributes.position.array[ newOffset + 1 ] = vertices[ oldOffset + 1 ];
                                geometry.attributes.position.array[ newOffset + 2 ] = vertices[ oldOffset + 2 ];
                                newOffset -= 3;
                            }
                            newOffset -= newPoints * 3;
                        }
                        if ( j % patchSize == 0 ) {
                            newOffset += 3;
                            geometry.attributes.position.array[ newOffset + 0 ] = vertices[ oldOffset + 0 ];
                            geometry.attributes.position.array[ newOffset + 1 ] = vertices[ oldOffset + 1 ];
                            geometry.attributes.position.array[ newOffset + 2 ] = vertices[ oldOffset + 2 ];
                        }
                        newOffset += 3;
                        oldOffset += 3;
                    }
                    if ( i % patchSize == 0 ) {
                        newOffset += newPoints * 3;
                    }
                }
                var len = geometry.attributes.position.array.length / 3,
                    heights = new Float32Array( len ),
                    trailPoints = new Float32Array( len ),
                    patchPoints = new Float32Array( len );
                geometry.addAttribute( "height", new THREE.BufferAttribute( heights, 1 ) );
                geometry.addAttribute( "trail", new THREE.BufferAttribute( trailPoints, 1 ) );
                geometry.addAttribute( "patch", new THREE.BufferAttribute( patchPoints, 1 ) );
                var patchAttributes = {
                    height: { type: "f", value: null },
                    trail: { type: "f", value: null },
                    patch: { type: "f", value: null },
                };
                for ( i = 0; i < len; i++ ) {
                    heights[i] = vertices[ i * 3 + 2 ];
                    trailPoints[i] = 0;
                    patchPoints[i] = 0;
                }
                var richTerrainMaterial = new THREE.ShaderMaterial({
                    uniforms: fp.ShaderUtils.lambertUniforms( fp.terrain.nightTerrainUniforms ),
                    attributes: patchAttributes,
                    vertexShader:   fp.ShaderUtils.lambertShaderVertex(
                        fp.ShaderUtils.terrainVertexShaderParams(),
                        fp.ShaderUtils.terrainVertexShaderMain()
                    ),
                    fragmentShader: fp.ShaderUtils.lambertShaderFragment(
                        fp.ShaderUtils.terrainFragmentShaderParams(),
                        fp.ShaderUtils.terrainFragmentShaderMain()
                    ),
                    lights: true
                });
                // richTerrainMaterial.wireframe = true;
                this.patchPlaneArray = geometry.attributes.position.clone();
                this.patchSphereArray = fp.terrain.constructSphere( this.patchPlaneArray );
                return new THREE.Mesh( geometry, richTerrainMaterial );
            };

            /**
             * Builds a plane mesh based on the current terrain geometry, but with its own material.
             */
            this.buildPatchMesh = function() {
                // var patchMaterial = new THREE.MeshBasicMaterial( { vertexColors: THREE.FaceColors } );
                this.plane = this.cloneGeometry();
                this.plane.rotation.set( -Math.PI / 2, 0, 0);
                this.plane.castShadow = true;
                this.plane.receiveShadow = true;
                this.updateTerrainPatchAttributes();
                fp.scene.add( this.plane );
            };

            /**
             * Default revision of the values of each patch.
             */
            this.defaultReviseValues = function() {
                this.patchMeanValue = 0;
                var popPatch = fp.patchNetwork.patchValues.length;
                var popAgent = fp.agentNetwork.agents.length;
                var r = popAgent / popPatch;
                for (var i = 0; i < this.patchValues.length; i++) {
                    var patch = this.patchValues[i];
                    if ( !_.isUndefined( this.patches[i] ) ) {
                        var len = this.patches[i].length;
                        var change = - len * ( 1 / ( Math.pow( r, 2 ) ) );
                        patch.updatePatchValue( change );
                    }
                    else { // if ( patch.value < patch.initialValue ) { // Recover
                        var change = Math.pow( r, 2 );
                        patch.updatePatchValue( Math.pow( r, 3 ) );
                    }
                    this.patchMeanValue += patch.value;
                }
                this.patchMeanValue /= this.patchValues.length;
            };

            /**
             * Update the cached count of patch agents.
             */
            this.updatePatchAgents = function() {
                this.patches = {};
                for (var i = 0; i < fp.agentNetwork.agents.length; i++) {
                    var agent =  fp.agentNetwork.agents[i];
                    var index = fp.getPatchIndex( agent.position.x, agent.position.z );
                    if ( !this.patches[index] )
                        this.patches[index] = [];
                    this.patches[index].push( agent );
                }
            };

            /**
             * Updates values of all patches in the network.
             */
            this.updatePatchValues = function() {
                if ( fp.appConfig.displayOptions.patchesUpdate && fp.AppState.runSimulation ) {
                    // Allow for overriding of the patch values
                    if ( !_.isUndefined( fp.patchNetwork.reviseValues ) ) {
                        fp.patchNetwork.reviseValues();
                    }
                    else {
                        fp.patchNetwork.defaultReviseValues();
                    }
                }

                if ( fp.appConfig.displayOptions.patchesShow ) {
                    if ( fp.appConfig.displayOptions.patchesUseShader ) {
                        if (this.plane !== null)
                            fp.scene.remove(this.plane);
                        this.updateTerrainPatchAttributes();
                    }
                    else
                        this.updatePlaneGeometryColors();
                }
            };

            /**
             * Updates the colours of the plane geometry.
             */
            this.updatePlaneGeometryColors = function() {
                if (this.plane === null)
                    return;
                var geometry = this.plane.geometry;
                if ( _.isUndefined( geometry.faces ) || geometry.faces[0] === null )
                    return;

                if (fp.scene.children.indexOf(this.plane) == -1)
                    fp.scene.add(this.plane);
                var dim = fp.terrain.gridPoints / this.patchSize;
                for (var y = 0; y < dim; y++) {
                    for (var x = 0; x < dim; x++) {
                        var baseIndex = y * dim + x;
                        var patch = this.patchValues[baseIndex];
                        var arrayX = x * fp.terrain.gridSize * 2;
                        var arrayY = y * fp.terrain.gridSize * 2;
                        var geoIndex = (( fp.terrain.gridPoints - 1) * arrayY) + arrayX;
                        if ( geometry.faces[ geoIndex ] === null)
                            return;
                        for ( var i = arrayY; i < arrayY + ( fp.terrain.gridSize * 2); i += 2 ) {
                            for ( var j = arrayX; j < arrayX + ( fp.terrain.gridSize * 2); j ++ ) {
                                var index = (( fp.terrain.gridPoints - 1) * i) + j;
                                if ( geometry.faces[index] ) {
                                    var c = geometry.faces[index].color;
                                    c.r = patch.value;
                                    c.g = patch.value;
                                    c.b = patch.value;
                                    geometry.faces[index].color = c;
                                }
                            }
                        }
                    }
                }
                geometry.colorsNeedUpdate = true;
            };

            /**
             * Updates the terrain's colors based on its patch attributes.
             */
            this.updateTerrainPatchAttributes = function() {
                if (_.isUndefined(this.patchValues))
                    return;
                var pl = Math.sqrt(this.patchValues.length);

                var counter = 0;
                var gridPoints = fp.terrain.gridPoints;
                var patchSize = fp.patchNetwork.patchSize;
                var dim = Math.ceil( gridPoints / patchSize );
                var newPoints = gridPoints + dim;
                var oldVal = 0;
                for ( var i = 0; i < this.patchValues.length; i++ ) {
                    var val = this.patchValues[ i ].value;
                    var patchCol = i % ( dim - 1 );
                    var patchRow = Math.floor( i / ( dim - 1 ) );
                    for ( var j = 0; j < patchSize + 3; j++ ) {
                        for ( var k = 0; k < patchSize + 3 ; k++ ) {
                            if ( j == 0 && patchRow != 0 )
                                continue;
                            if ( k == 0 && patchCol != 0 )
                                continue;
                            if ( j == this.patchSize + 2 && patchRow < ( dim - 2 ) )
                                continue;
                            if ( k == this.patchSize + 2 && patchCol < ( dim - 2 ) )
                                continue;
                            var colOffset = patchCol * ( patchSize + 1 ) + k;
                            var rowOffset = ( ( patchRow * ( patchSize + 1 ) ) + j ) * newPoints;
                            var cell = rowOffset + colOffset;
                            // var rows = ( ( this.patchSize + 1 ) * Math.floor( i / pl ) ) * newPoints + j * newPoints;
                            // var cols = (i % pl) * ( this.patchSize + 1 ) + k;
                            // var cell = rows + cols;
                            counter++;
                            if ( oldVal != val ) {
                                oldVal = val;
                            }
                            this.plane.geometry.attributes.patch.array[ cell ] = val;
                        }
                    }
                }
                this.plane.geometry.attributes.patch.needsUpdate = true;
            };

            /**
             * Toggles
             * @return {[type]} [description]
             */
            this.togglePatchesStateWithShader = function() {
                if (! fp.appConfig.displayOptions.patchesShow) {
                    fp.scene.remove( this.plane );

                    // for (var i = 0; i < fp.terrain.plane.geometry.attributes.patch.array.length; i++)
                    //     this.plane.geometry.attributes.patch.array[i] = 0.0;
                    // this.plane.geometry.attributes.patch.needsUpdate = true;

                    // fp.terrain.richTerrainMaterial.uniforms = fp.terrain.nightTerrainUniforms;
                    // fp.terrain.richTerrainMaterial.needsUpdate = true; // important!

                }
                else {
                    this.buildPatchMesh();
                    // this.updateTerrainPatchAttributes();
                    // fp.scene.add( this.plane );

                }
            };

            this.togglePatchesStateWithoutShader = function() {
                if ( fp.appConfig.displayOptions.patchesShow ) {
                    if ( this.plane === null )
                        this.buildPatchMesh();
                    else
                        fp.scene.add( this.plane );
                }
                else
                    fp.scene.remove( this.plane );
            };
        };

        /**
         * Represents a network of trails. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        this.TrailNetwork = function() {
            this.trails = {};
            this.trailMeshes = null;
            this.globalTrailLine = null;

            /**
             * Builds the initial trail network.
             */
            this.buildTrailNetwork = function( clone ) {
                var len = fp.appConfig.displayOptions.trailLength;
                var geom = new THREE.Geometry();
                if ( clone ) {
                    geom = fp.trailNetwork.globalTrailLine.geometry.clone();
                }
                for ( var i = 0; i < fp.agentNetwork.agents.length; i++ ) {
                    var vertices = new Array( len );
                    for (var j = 0; j < len ; j++) {
                        var index = i * len  + j;
                        if ( !clone || index > geom.vertices.length ) {
                            geom.vertices.push( fp.agentNetwork.agents[ i ].lastPosition );
                        }
                    }
                    var ai = fp.getIndex(
                        fp.agentNetwork.agents[i].lastPosition.x / fp.appConfig.terrainOptions.multiplier,
                        fp.agentNetwork.agents[i].lastPosition.z / fp.appConfig.terrainOptions.multiplier
                    );
                    if (ai > -1)
                        fp.trailNetwork.trails[ai] = 1;
                }
                var trailMaterial = new THREE.LineBasicMaterial({
                    color: fp.appConfig.colorOptions.colorNightTrail,
                    linewidth: 1.0,
                    opacity: 0.1,
                    blending: THREE.AdditiveBlending,
                    transparent: true
                });
                fp.trailNetwork.globalTrailLine = new THREE.Line( geom, trailMaterial, THREE.LinePieces );
                if ( fp.appConfig.displayOptions.trailsShowAsLines ) {
                    fp.scene.add( fp.trailNetwork.globalTrailLine );
                }
            };

            /**
             * Updates the trail network.
             */
            this.updateTrails = function() {
                if ( !fp.AppState.runSimulation )
                    return;

                if ( fp.appConfig.displayOptions.trailsShow ) {
                    if ( fp.appConfig.displayOptions.trailsShowAsLines ) {
                        for (var i = 0; i < fp.agentNetwork.agents.length; i++) {
                            var agent =  fp.agentNetwork.agents[i];
                            // Creates a cycle of trail 'pieces'
                            var len = fp.appConfig.displayOptions.trailLength;
                            var offset = agent.ticks * 2 % len;
                            if ( offset == 0 ) {
                                for ( var j = 0; j < len; j++ ) {
                                    fp.trailNetwork.globalTrailLine.geometry.vertices[ i * len + j ] = agent.lastPosition;
                                }
                            }
                            fp.trailNetwork.globalTrailLine.geometry.vertices[ i * len + offset ] = agent.lastPosition;
                            fp.trailNetwork.globalTrailLine.geometry.vertices[ i * len + offset + 1 ] = agent.position;
                        }
                        fp.trailNetwork.globalTrailLine.geometry.verticesNeedUpdate = true;
                    }
                    else {
                        var weightMax = _.chain( fp.trailNetwork.trails ).values().max().value();
                        for ( var j in fp.trailNetwork.trails ) {
                            var weight = fp.trailNetwork.trails[j];
                            var weightNormed = weight / weightMax;
                            var weightAdjusted = Math.pow( weightNormed, 0.2 );
                            fp.terrain.plane.geometry.attributes.trail.array[ k ] = weightAdjusted;
                        }
                    }
                }
                else if ( !fp.appConfig.displayOptions.trailsShowAsLines ) {
                    for ( var k in fp.trailNetwork.trails )  {
                        fp.terrain.plane.geometry.attributes.trail.array[ k ] = 0.0;
                    }
                    fp.terrain.plane.geometry.attributes.trail.needsUpdate = true;
                }
            };
        };

        /**
         * Represents a cursor operating on the world.
         * @constructor
         * @memberof fp
         * @inner
         */
        this.Cursor = function() {
            this.cell = null;

            /**
             * Creates a cell cursor
             * @param  {Number} x
             * @param  {Number} y
             */
            this.createCell = function(x, y) {
                var halfGrid = fp.terrain.gridExtent / 2;
                var cellSize = fp.terrain.gridExtent / ( fp.terrain.gridPoints - 1);
                var cellPixels = ( fp.terrain.gridSize  * cellSize);
                var cellX = Math.floor((x + halfGrid) / cellPixels );
                var cellY = Math.floor((y + halfGrid) / cellPixels);
                var ccX = (cellX * cellPixels) - halfGrid;
                var ccY = (cellY * cellPixels) - halfGrid;
                var ccZ = fp.getHeight(ccX, ccY);
                var material = new THREE.LineBasicMaterial({
                    color: 0xff0000,
                    linewidth: 2
                });

                var i, geometry = new THREE.Geometry();
                for (i = 0; i < fp.terrain.gridSize; i ++) {
                    geometry.vertices.push(new THREE.Vector3(ccX, ccY, ccZ) );
                    ccX += Math.round(cellSize);
                    ccZ = fp.getHeight(ccX, ccY) + 1;
                }
                for (i = 0; i < fp.terrain.gridSize; i ++) {
                    geometry.vertices.push(new THREE.Vector3(ccX, ccY, ccZ) );
                    ccY += Math.round(cellSize);
                    ccZ = fp.getHeight(ccX, ccY) + 1;
                }
                for (i = 0; i < fp.terrain.gridSize; i ++) {
                    geometry.vertices.push(new THREE.Vector3(ccX, ccY, ccZ) );
                    ccX -= Math.round(cellSize);
                    ccZ = fp.getHeight(ccX, ccY) + 1;
                }
                for (i = 0; i < fp.terrain.gridSize; i ++) {
                    geometry.vertices.push(new THREE.Vector3(ccX, ccY, ccZ) );
                    ccY -= Math.round(cellSize);
                    ccZ = fp.getHeight(ccX, ccY) + 1;
                }
                geometry.vertices.push(new THREE.Vector3(ccX, ccY, ccZ) + appConfig.agentOptions.size);
                if (this.cell)
                    fp.scene.remove( this.cell );
                this.cell = new THREE.Line( geometry, material );
                fp.scene.add( this.cell );
            };

            /**
             * Creates a filled-in cell cursor.
             * @param  {Number} x
             * @param  {Number} y
             */
            this.createCellFill = function(x, y) {
                var halfGrid = fp.terrain.gridExtent / 2;
                var cellSize = fp.terrain.gridExtent / ( fp.terrain.gridPoints - 1);
                var cellPixels = fp.terrain.gridSize  * cellSize;
                var cellX = Math.floor((x + halfGrid) / cellPixels );
                var cellY = Math.floor((y + halfGrid) / cellPixels);
                var ccX = (cellX * cellPixels) - halfGrid + cellPixels / 2;
                var ccY = (cellY * cellPixels) - halfGrid + cellPixels / 2;
                var ccZ = 0;

                var arrayDim = fp.terrain.gridPoints;
                var arraySize = fp.terrain.gridExtent / arrayDim;
                var arrayX = Math.floor((x / fp.appConfig.terrainOptions.multiplier + halfGrid) / arraySize );
                var arrayY = Math.floor((halfGrid + y / fp.appConfig.terrainOptions.multiplier) / arraySize );
                var vertices = fp.terrain.plane.geometry.attributes.position.array;
                var newVertices = [];
                var cellFill, cellMaterial;
                if (_.isUndefined(this.cell)) {
                    cellFill = new THREE.PlaneGeometry(cellPixels, cellPixels, fp.terrain.gridSize, fp.terrain.gridSize);
                    fp.scene.remove(this.cell);
                    cellMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000,  wireframe: false });
                    cellMaterial.side = THREE.DoubleSide;
                    this.cell = new THREE.Mesh(cellFill, cellMaterial);
                    this.cell.rotation.set( -Math.PI / 2, 0, 0);
                    this.cell.geometry.dynamic = true;
                    fp.scene.add(this.cell);
                }
                var halfCell = Math.round( fp.terrain.gridSize / 2);
                for (var i = arrayY, counter = 0; i < arrayY + fp.terrain.gridSize + 1; i ++) {
                    for (var j = arrayX; j < arrayX + fp.terrain.gridSize + 1; j ++, counter++) {
                        var index = 3 * (arrayDim * (i - halfCell) + (j - halfCell));
                        this.cell.geometry.vertices[counter] = new THREE.Vector3(
                            vertices[index], vertices[index + 1], vertices[index + 2] + fp.appConfig.agentOptions.terrainOffset
                        );
                    }
                }
                this.cell.geometry.verticesNeedUpdate = true;
            };
        };


        /**
         * Represents a network of paths. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        this.PathNetwork = function() {
            this.networkMesh = null;
            this.stepsPerNode = fp.terrain.ratioExtentToPoint;
            this.graphAStar = null;
            this.nodes = [];
            this.opts = null;

            this.setupAStarGraph = function() {
                this.opts = {
                    // wallFrequency: $selectWallFrequency.val(),
                    // fp.terrain.gridSize: $selectGridSize.val(),
                    // debug: $checkDebug.is("checked"),
                    diagonal: true,
                    closest: true
                };
                for (var i = 0; i < fp.terrain.gridPoints; i++) {
                    var nodeRow = [];
                    for (var j = 0; j < fp.terrain.gridPoints; j++) {
                        var weight = 1 - fp.terrain.getHeightForIndex( i * fp.terrain.gridPoints + j) / fp.terrain.maxTerrainHeight;
                        weight = (weight == 1 ? 0 : weight);
                        nodeRow.push(weight);
                    }
                    this.nodes.push(nodeRow);
                }
                this.graphAStar = new astar.Graph(this.nodes);
                this.graphAStar.diagonal = true;
            };

            this.nodeAt = function(position) {
                var index = fp.getIndex(position.x, position.z);
                var x = index % fp.terrain.gridPoints, y = Math.floor(index / fp.terrain.gridPoints);
                try {
                    return this.graphAStar.grid[x][y];
                }
                catch ( err ) {
                    return undefined;
                }
            };


            /**
             * Find path to the home of another agent in this network
             * @param  {fp.Agent} agent [description]
             * @return {Array}       Of nodes
             */
            this.findPathHome = function( agent ) {

                if ( !agent.home )
                    return [];
                var start = this.nodeAt( agent.position );
                var end = this.nodeAt( agent.home.lod.position );
                if ( _.isUndefined( start ) || _.isUndefined( end ) )
                    return [];
                var path = astar.astar.search( this.graphAStar, start, end, { closest: this.opts.closest } );
                return path;
            };


            /**
             * Find path to an agent's home
             * @param  {fp.Agent} agent [description]
             * @return {Array}       Of nodes
             */
            this.findPathToOtherAgentsHome = function( agent ) {
                var otherAgentHome = null;
                var networks = _.shuffle( fp.agentNetwork.networks );
                for ( var i = 0; i < networks.length; i++ ) {
                    var network = fp.agentNetwork.networks[ i ];
                    var links = _.shuffle( network.links );
                    for ( var j = 0; j < links.length; j++ ) {
                        var link = links[ j ];
                        if ( link.agent1 == agent )
                            otherAgentHome = link.agent2.home;
                        else if ( link.agent2 ==  agent )
                            otherAgentHome = link.agent1.home;
                    }
                }

                if ( !otherAgentHome )
                    return [];
                var start = this.nodeAt( agent.position );
                var end = this.nodeAt( otherAgentHome.lod.position );
                if ( _.isUndefined( start ) || _.isUndefined( end ) )
                    return [];
                var path = astar.astar.search( this.graphAStar, start, end, { closest: this.opts.closest } );
                return path;
            };


            /**
             * Draws a path between this agent and its home
             * @param  {Agent} agent
             * @return {Array}       of nodes describing the path
             */
            this.drawPathHome = function( agent ) {
                var path = agent.pathComputed;
                if ( _.isUndefined( path ) || path.length < 2 ) // Need 2 points for a line
                    return undefined;
                var pathGeom = new THREE.Geometry();
                var multiplier = fp.terrain.ratioExtentToPoint;
                var wrapPercent = fp.terrain.wrappedPercent;
                path.forEach( function( point ) {
                    var x = ( point.x * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier,
                        z = ( point.y * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier,
                        y = fp.getHeight(x, z) + fp.appConfig.agentOptions.terrainOffset,
                        point3d = new THREE.Vector3(x, y, z);

                    /*
                    // Transform vertices
                    var percent = fp.terrain.wrappedPercent;
                    if ( percent > 0 ) {
                        var transformedVertices = [];
                        for (var i = 0; i < vertices.length; i ++) {
                            transformedVertices.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ i ], percent ) );
                        }
                        roadGeom.vertices = transformedVertices;
                    }
                    */

                    var transformedPoint3d = fp.terrain.transformPointFromPlaneToSphere( point3d, wrapPercent )
                    pathGeom.vertices.push( transformedPoint3d );
                });

                var pathColor = ( fp.appConfig.displayOptions.dayShow ) ? fp.appConfig.colorOptions.colorDayPath : fp.appConfig.colorOptions.colorNightPath;
                var pathMaterial = new THREE.LineBasicMaterial( { color: pathColor, linewidth: 1.0 } );
                var pathLine = new THREE.Line( pathGeom, pathMaterial );
                this.networkMesh.add( pathLine );
                return pathLine;
            };

            /**
             * Update the visualisation of all agent paths.
             * @return {[type]} [description]
             */
            this.updatePath = function() {
                if ( !fp.AppState.runSimulation )
                    return;

                var children = fp.pathNetwork.networkMesh.children;
                for ( var i = children.length - 1; i >= 0; i-- ) {
                    fp.pathNetwork.networkMesh.remove( children[ i ] );
                }
                var agentsWithPaths = _.chain( fp.agentNetwork.agents ).
                    map( function( agent ) { if ( !_.isUndefined( agent.pathComputed ) && agent.pathComputed.length > 1 ) return agent; } ).
                        compact().
                        value();
                _.each( agentsWithPaths, function(agent) {
                    fp.pathNetwork.drawPathHome( agent );
                });
            };
        };

        this.TERRAIN_MAPS = [ "/assets/syd2.bin", "/assets/mel2.bin" ];

        /**
         * Represents the fp.terrain of the world.
         * @constructor
         * @memberof fp
         * @inner
         */
        this.Terrain = function() {
            this.plane = null;
            this.richTerrainMaterial = null;
            this.simpleTerrainMaterial = null;
            this.dayTerrainUniforms = null;
            this.nightTerrainUniforms = null;
            this.terrainMapIndex = fp.appConfig.terrainOptions.mapIndex;
            this.gridExtent = fp.appConfig.terrainOptions.gridExtent;
            this.halfExtent = this.gridExtent / 2;
            this.gridPoints = fp.appConfig.terrainOptions.gridPoints;
            this.ratioExtentToPoint = this.gridExtent / this.gridPoints;
            this.maxTerrainHeight = fp.appConfig.terrainOptions.maxTerrainHeight;
            this.gridSize = 4;
            /**
             * Used to cache the plane geometry array.
             */
            this.planeArray = null;
            /**
             * Used to cache the sphere geometry array.
             */
            this.sphereArray = null;
            /**
             * Specifies the percentage to which the plane is wrapped.
             */
            this.wrappedPercent = 0;
            /**
             * Specifies whether the plane is being wrapped, unwrapped or neither.
             */
            this.wrappingState = 0;

            /**
             * Initialises the terrain.
             */
            this.initTerrain = function( data ) {
                fp.scene.remove( fp.terrain.plane);
                var size = fp.terrain.gridExtent * fp.appConfig.terrainOptions.multiplier;
                var geometry = new THREE.PlaneBufferGeometry( size, size, fp.terrain.gridPoints - 1, fp.terrain.gridPoints - 1 );

                // Use logic from math.stackexchange.com
                var vertices = geometry.attributes.position.array;
                var i, j, l = vertices.length,
                    n = Math.sqrt(l),
                    k = l + 1;
                // Simple function to return the sign of a number - http://stackoverflow.com/questions/7624920/number-sign-in-javascript
                if ( fp.appConfig.terrainOptions.loadHeights ) {
                    for (i = 0, j = 0; i < l; i++, j += 3 ) {
                        geometry.attributes.position.array[ j + 2 ] =
                            data[ i ] / 65535 *
                            fp.terrain.maxTerrainHeight *
                            fp.appConfig.terrainOptions.multiplier;
                    }
                }
                else {
                    for (i = 0, j = 0; i < l; i++, j += 3 ) {
                        geometry.attributes.position.array[ j + 2 ] = fp.appConfig.terrainOptions.defaultHeight;
                    }
                }

                fp.terrain.simpleTerrainMaterial = new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: fp.appConfig.displayOptions.wireframeShow });
                fp.terrain.simpleTerrainMaterial.side = THREE.DoubleSide;
                fp.terrain.simpleTerrainMaterial.color.setHSL( 0.095, 1, 0.75 );

                var len = geometry.attributes.position.array.length / 3,
                    heights = new Float32Array(len),
                    trailPoints = new Float32Array(len),
                    patchPoints = new Float32Array(len);
                for (i = 0; i < len; i++) {
                    heights[i] = vertices[ i * 3 + 2 ];
                    trailPoints[i] = 0;
                    patchPoints[i] = 0;
                }
                var terrainAttributes = {
                    height: { type: "f", value: null },
                    trail: { type: "f", value: null },
                    patch: { type: "f", value: null },
                };
                geometry.addAttribute( "height", new THREE.BufferAttribute( heights, 1 ) );
                geometry.addAttribute( "trail", new THREE.BufferAttribute( trailPoints, 1 ) );
                geometry.addAttribute( "patch", new THREE.BufferAttribute( patchPoints, 1 ) );

                fp.terrain.dayTerrainUniforms = {
                    seaColor: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainSea ) },
                    lowland1Color: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainLowland1 ) },
                    lowland2Color: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainLowland2 ) },
                    midlandColor: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainMidland ) },
                    highlandColor: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainHighland ) },
                    size: { type: "f", value: Math.floor( fp.appConfig.agentOptions.size / 2)},
                    maxHeight: { type: "f", value: fp.terrain.maxTerrainHeight * fp.appConfig.terrainOptions.multiplier }
                };
                fp.terrain.nightTerrainUniforms = {
                    seaColor: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainSea ) },
                    lowland1Color: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainLowland1 ) },
                    lowland2Color: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainLowland2 ) },
                    midlandColor: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainMidland ) },
                    highlandColor: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainHighland ) },
                    size: { type: "f", value: Math.floor( fp.appConfig.agentOptions.size / 2)},
                    maxHeight: { type: "f", value: fp.terrain.maxTerrainHeight * fp.appConfig.terrainOptions.multiplier }
                };
                fp.terrain.richTerrainMaterial = new THREE.ShaderMaterial({
                    uniforms: fp.ShaderUtils.lambertUniforms( fp.terrain.nightTerrainUniforms ),
                    attributes: terrainAttributes,
                    vertexShader:   fp.ShaderUtils.lambertShaderVertex(
                        fp.ShaderUtils.terrainVertexShaderParams(),
                        fp.ShaderUtils.terrainVertexShaderMain()
                    ),
                    fragmentShader: fp.ShaderUtils.lambertShaderFragment(
                        fp.ShaderUtils.terrainFragmentShaderParams(),
                        fp.ShaderUtils.terrainFragmentShaderMain()
                    ),
                    lights: true
                });

                // Only use the shader material if we have variable heights
                if ( fp.appConfig.terrainOptions.shaderUse ) {
                    fp.terrain.plane = new THREE.Mesh( geometry, fp.terrain.richTerrainMaterial );
                }
                else {
                    fp.terrain.plane = new THREE.Mesh( geometry, fp.terrain.simpleTerrainMaterial );
                }
                // Cache the array
                fp.terrain.planeArray = fp.terrain.plane.geometry.attributes.position.clone();
                fp.terrain.plane.castShadow = true;
                fp.terrain.plane.receiveShadow = true;
                fp.terrain.plane.rotation.set( -Math.PI / 2, 0, 0);
                if ( fp.appConfig.displayOptions.terrainShow )
                    fp.scene.add( fp.terrain.plane );

                if ( fp.appConfig.displayOptions.patchesShow )
                    fp.patchNetwork.buildPatchMesh();
                // fp.terrain.createTerrainColors();
                fp.toggleDayNight();
                fp.pathNetwork.setupAStarGraph();

                // Construct the sphere, and switch it on
                if ( fp.appConfig.terrainOptions.renderAsSphere ) {
                    fp.terrain.sphereArray = fp.terrain.constructSphere( fp.terrain.planeArray );
                    // fp.terrain.wrapTerrainIntoSphere( 100 );
                }
            };

            /**
             * Gets the terrain height for a given co-ordinate index.
             * @memberof fp.Terrain
             * @param {Number} index The co-ordinate index
             * @return {Number} The corresponding y value
             */
            this.getHeightForIndex = function( index ) {
                var x = index % fp.terrain.gridPoints ;
                var y = fp.terrain.gridPoints - Math.floor( index / fp.terrain.gridPoints );
                var reversedIndex = y * fp.terrain.gridPoints + x;
                if ( index >= 0 && !_.isUndefined( fp.terrain.planeArray.array[index * 3 + 2] ) )
                    return fp.terrain.planeArray.array[ index * 3 + 2 ];
                return null;
            };

            /**
             * Gets the terrain coordinates for a given co-ordinate index.
             * @memberof fp.Terrain
             * @param {Number} index The co-ordinate index
             * @return {Number} The corresponding y value
             */
            this.getCoordinatesForIndex = function( index ) {
                var x = index % fp.terrain.gridPoints;
                var y = fp.terrain.gridPoints - Math.floor( index / fp.terrain.gridPoints ) - 1;
                var reversedIndex = y * fp.terrain.gridPoints + x;
                if ( reversedIndex >= 0 && !_.isUndefined( fp.terrain.planeArray.array[ reversedIndex * 3 + 0 ] ) ) {
                    var x = fp.terrain.planeArray.array[ reversedIndex * 3 + 0 ];
                    var z = fp.terrain.planeArray.array[ reversedIndex * 3 + 1 ];
                    return [ x, z ];
                }
                return null;
            };

            /**
             * Flattens out the terrain.
             * @return {[type]} [description]
             */
            this.flattenTerrain = function() {
                if ( !fp.appConfig.displayOptions.cursorShow )
                    return;

                var vertices = this.plane.geometry.attributes.position.array;
                var i, point, meanHeight = 0;
                for (i = 0; i < fp.cursor.cell.geometry.vertices.length; i++) {
                    point = fp.cursor.cell.geometry.vertices[i];
                    meanHeight += fp.getHeight(point.x, - point.y);
                }
                meanHeight /= fp.cursor.cell.geometry.vertices.length;
                for (i = 0; i < fp.cursor.cell.geometry.vertices.length; i++) {
                    point = fp.cursor.cell.geometry.vertices[i];
                    var index = fp.getIndex(point.x, - point.y);
                    this.plane.geometry.attributes.position.array[3 * index + 2] = meanHeight;
                }
                this.plane.geometry.attributes.position.needsUpdate = true;
                this.plane.geometry.verticesNeedUpdate = true;
            };

            /**
             * Creates a basic set of colors for the terrain.
             */
            this.createTerrainColors = function () {
                for (var y = 0; y < 99; y++) {
                    for (var x = 0; x < 99; x++) {
                        var r = Math.random();
                        var color = new THREE.Color(r, r, r);
                        var arrayX = x * fp.terrain.gridSize * 2;
                        var arrayY = y * fp.terrain.gridSize * 2;
                        for (var i = arrayY; i < arrayY + ( fp.terrain.gridSize * 2); i += 2) {
                            for (var j = arrayX; j < arrayX + ( fp.terrain.gridSize * 2); j ++) {
                                var index = (( fp.terrain.gridPoints - 1) * i) + j;
                                if ( fp.terrain.plane.geometry.attributes.uv.array[index]) {
                                    fp.terrain.plane.geometry.attributes.uv.array[index] = color;
                                    fp.terrain.plane.geometry.attributes.uv.array[index + 1] = color;
                                    fp.terrain.plane.geometry.attributes.uv.array[index + 1] = color;
                                }
                            }
                        }

                    }
                }
                return fp.terrain.plane.geometry.color;
            };

            /**
             * Retrieves the origin of the terrain sphere
             */
            this.sphereOrigin = function() {
                var size = fp.terrain.gridExtent * fp.appConfig.terrainOptions.multiplier;
                var he = size / 2;
                var diameter = ( he / Math.PI ) * 2, radius = diameter / 2;
                var origin = new THREE.Vector3( 0, - radius, 0 );
                return origin;
            }

            /**
             * Retrieves the angle to the origin of the terrain sphere.
             * @param {Number} x
             * @param {Number} y
             * @param {Number} z
             * @return {THREE.Vector3} A rotation vector in the order: pitch (x), yaw (y), roll (z)
             */
            this.sphereOriginAngle = function( x, y, z ) {
                // Retrieve standard variables about the sphere
                var size = fp.terrain.gridExtent * fp.appConfig.terrainOptions.multiplier;
                var he = size / 2;
                var diameter = ( he / Math.PI ) * 2, radius = diameter / 2;
                var origin = fp.terrain.sphereOrigin();
                // Obtain the difference between the coordinate and the sphere's origin.
                var diff = new THREE.Vector3( x, y, z ).sub( origin );
                // Get differences and signs of values.
                var dx = diff.x % radius, sx = $.sign( diff.x), rx = Math.floor( Math.abs( diff.x ) / radius );
                var dz = diff.z % radius, sz = $.sign( diff.z), rz = Math.floor( Math.abs( diff.z ) / radius );
                // Calculate the X and Z angle
                var angleX = Math.asin( dx / radius );
                var angleZ = Math.asin( dz / radius );
                // Reflect the X angle if we have on the other side of the sphere.
                if ( y < - radius ) {
                    angleX = ( sx * Math.PI ) - angleX;
                }
                // Rotation is in the order: pitch, yaw, roll
                var rotation = new THREE.Vector3( angleZ, 0, - angleX );
                return rotation;
            };

            /**
             * Transforms a single point from a plane to a sphere geometry.
             * @param {Number} x
             * @param {Number} y
             * @param {Number} z
             * @return {THREE.Vector3} The sphere position to transform the plane position to.
             */
            this.transformSpherePoint = function( x, y, z ) {
                // Retrieve standard variables about the sphere
                var size = fp.terrain.gridExtent * fp.appConfig.terrainOptions.multiplier;
                var he = size / 2;
                var diameter = ( he / Math.PI ) * 2, radius = diameter / 2;
                var origin = this.sphereOrigin();
                // Obtain the signs and absolute values for x and z values
                var sx = $.sign(x), sz = $.sign( z );
                var ax = Math.abs( x ), az = Math.abs( z );
                // Which is the highest absolute value?
                var mxz = ( ax > az ? ax : az );
                // Obtain the angle between the absolute values
                var angle = Math.atan2( ax, az );
                var ry = ( ( 1 + Math.sin( Math.PI * ( ( mxz / he ) - 0.5 ) ) ) / 2 ) * - diameter;
                var nry = -ry;
                var my = ( radius > nry ? radius - nry : nry - radius );
                var py = Math.cos( Math.asin( my / radius ) );
                var dx = sx * py;
                var dz = sz * py;
                var rx = dx * Math.sin( angle ) * radius;
                var rz = dz * Math.cos( angle ) * radius;
                // Adjust for existing terrain heights
                var v1 = new THREE.Vector3( rx, rz, ry );
                var v2 = new THREE.Vector3();
                v2.subVectors( origin, v2 ).normalize().multiplyScalar( y );
                return v1.add( v2 );
            };

            /**
             * Wraps planar point to sphere - calls transformSpherePoint,
             * but handles unpacking and applying the transformation to a certain percentage.
             * @param {THREE.Vector3} point    the point to transform
             * @param {Number} percent
             * @return {THREE.Vector3} The sphere position to transform the plane position to.
             */
            this.transformPointFromPlaneToSphere = function( point, percent ) {
                if ( percent <= 0 || percent > 100 )
                    return point; // Optimisation when no transform is needed.
                var x = point.x, y = point.y, z = point.z;
                var nv = new THREE.Vector3( x, y, z );
                var v2 = fp.terrain.transformSpherePoint( x, y, z );
                var dv = new THREE.Vector3( v2.x, v2.z, v2.y );
                dv.sub( nv ).multiplyScalar( percent / 100 );
                nv.add( dv );
                return nv;
            };


            /**
             * Wraps a plane into a sphere
             */
            this.constructSphere = function( planeArray ) {
                var sphereArray = planeArray.clone();//
                var l = sphereArray.array.length;
                for (var j = 0; j < l; j += 3 ) {
                    var x = planeArray.array[ j + 0 ];
                    var z = planeArray.array[ j + 1 ];
                    var y = planeArray.array[ j + 2 ];
                    var v = this.transformSpherePoint( x, y, z );
                    sphereArray.array[ j + 0 ] = v.x;
                    sphereArray.array[ j + 1 ] = v.y;
                    sphereArray.array[ j + 2 ] = v.z;
                }
                return sphereArray;
            };

            /**
             * Wraps the plane into a sphere, to a specified percent (0 unwraps back to a plane).
             */
            this.wrapTerrainIntoSphere = function( percent ) {
                this.wrappedPercent = percent;
                if ( !_.isUndefined( percent ) && percent <= 100 && percent >= 0 ) {
                    var l = fp.terrain.sphereArray.array.length;
                    for ( var i = 0; i < l; i++ ) {
                        var pv = fp.terrain.planeArray.array[ i ];
                        var sv = fp.terrain.sphereArray.array[ i ];
                        var nv = pv + ( sv - pv ) * ( percent / 100 );
                        fp.terrain.plane.geometry.attributes.position.array[ i ] = nv;
                    }
                    fp.patchNetwork.plane.geometry.attributes.position.needsUpdate = true;
                    l = fp.patchNetwork.patchSphereArray.array.length;
                    for ( var i = 0; i < l; i++ ) {
                        var pv = fp.patchNetwork.patchPlaneArray.array[ i ];
                        var sv = fp.patchNetwork.patchSphereArray.array[ i ];
                        var nv = pv + ( sv - pv ) * ( percent / 100 );
                        fp.patchNetwork.plane.geometry.attributes.position.array[ i ] = nv;
                    }
                    fp.patchNetwork.plane.geometry.attributes.position.needsUpdate = true;
                    fp.buildingNetwork.buildings.forEach( function( building ) {
                        building.lod.matrixAutoUpdate = false;
                        var cv = _.clone( building.originPosition );
                        var nv = fp.terrain.transformPointFromPlaneToSphere( cv, 100 );
                        var v = fp.terrain.sphereOriginAngle( nv.x, nv.y, nv.z ).multiplyScalar( percent / 100 );
                        nv = fp.terrain.transformPointFromPlaneToSphere( cv, percent );
                        building.lod.rotation.set( v.x, v.y, v.z );
                        building.lod.position.set( nv.x, nv.y, nv.z );
                        building.highResMeshContainer.rotation.set( v.x, v.y, v.z );
                        building.highResMeshContainer.position.set( nv.x, nv.y, nv.z );
                        building.lowResMeshContainer.rotation.set( v.x, v.y, v.z );
                        building.lowResMeshContainer.position.set( nv.x, nv.y, nv.z );
                    });
                    // Alter roards
                    for (var j = 0; j < fp.roadNetwork.planeVertices.length; j ++ ) {
                        var transformedVertices = [];
                        var vertices = fp.roadNetwork.planeVertices[j];
                        for (var i = 0; i < vertices.length; i ++) {
                            transformedVertices.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ i ], percent ) );
                        }
                        fp.roadNetwork.networkMesh.children[ j ].geometry.vertices = transformedVertices;
                        fp.roadNetwork.networkMesh.children[ j ].geometry.verticesNeedUpdate = true;
                    }
                    // Alter paths
                    for (var j = 0; j < fp.pathNetwork.networkMesh.children.length; j ++ ) {
                        var transformedVertices = [];
                        var vertices = fp.pathNetwork.networkMesh.children[j];
                        for (var i = 0; i < vertices.length; i ++) {
                            transformedVertices.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ i ], percent ) );
                        }
                        fp.pathNetwork.networkMesh.children[ j ].geometry.vertices = transformedVertices;
                        fp.pathNetwork.networkMesh.children[ j ].geometry.verticesNeedUpdate = true;
                    }
                    for (var j = 0; j < fp.agentNetwork.agents.length; j ++ ) {
                        var agent = fp.agentNetwork.agents[ j ];
                        var nv = fp.terrain.transformPointFromPlaneToSphere( agent.position, percent );
                        fp.agentNetwork.particles.geometry.vertices[ j ] = nv;
                    }
                    if ( !_.isNull( fp.agentNetwork.particles ) )
                        fp.agentNetwork.particles.geometry.verticesNeedUpdate = true;
                    for (var j = 0; j < fp.agentNetwork.networks.length; j ++ ) {
                        var transformedVertices = [];
                        var network = fp.agentNetwork.networks[ j ];
                        if ( !_.isNull( network.networkMesh) ) {
                            var vertices = network.networkMesh.geometry.vertices;
                            for (var i = 0; i < vertices.length; i ++) {
                                transformedVertices.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ i ], percent ) );
                            }
                            network.networkMesh.geometry.vertices = transformedVertices;
                            network.networkMesh.geometry.verticesNeedUpdate = true;
                        }
                    }
                }
            }

            /**
             * Updates terrain.
             */
            this.updateTerrain = function() {
                if ( this.wrappingState === 1 ) {
                    fp.appConfig.displayOptions.waterShow = false;
                    if ( fp.terrain.wrappedPercent < 100 ) {
                        fp.terrain.wrapTerrainIntoSphere( fp.terrain.wrappedPercent );
                        fp.terrain.wrappedPercent += this.wrappingState;
                    }
                    else {
                        this.wrappingState = 0;
                    }
                }
                else if ( this.wrappingState === -1 ) {
                    if ( fp.terrain.wrappedPercent > 0 ) {
                        fp.terrain.wrapTerrainIntoSphere( fp.terrain.wrappedPercent );
                        fp.terrain.wrappedPercent += this.wrappingState;
                    }
                    else {
                        fp.appConfig.displayOptions.waterShow = fp.appConfig.displayOptions.waterShow;
                        this.wrappingState = 0;
                    }
                }
                fp.toggleWaterState();
            };
        };

        /**
         * Represents the time scale used by the world.
         * @constructor
         * @memberof fp
         * @inner
         */
       this.Timescale = function() {     // Time variables
            this.initialYear = 1800;
            this.endYear = 2200;
            this.terminate = false;
            this.currentYear = this.initialYear;
            this.MAX_FRAMES_TO_YEAR = 480;
            this.MIN_FRAMES_TO_YEAR = 1;
            this.TOP_SPEED = 60 / this.MIN_FRAMES_TO_YEAR;
            this.MIN_FRAMES_TO_YEAR = null;
            this.framesToYear = 32;
            this.frameCounter = 0;
        };

        /**
         * Represents a mobile and alive agent
         * @constructor
         * @memberof fp
         * @inner
         */
        this.Agent = function() {

            /**
             * @memberof Agent
             */
            this.updateTick = function() {
                this.ticks++;
                this.age++;
            };

            /**
             * @memberof Agent
             */
            this.setDirection = function( dir ) {
                this.direction = dir;
            };

            /**
             * @memberof Agent
             */
            this.setPosition = function(v) {
                this.lastPosition = this.position = v;
            };

            /**
             * @memberof Agent
             */
            this.findBuilding = function() {
                var xl = this.lastPosition.x, zl = this.lastPosition.z;
                return fp.buildingNetwork.buildingHash[fp.getIndex(xl, zl)];
            };

            /**
             * @memberof Agent
             */
            this.goingUp = function(building) {
                return ( building == this.home ) ?
                    ( Math.random() < fp.appConfig.agentOptions.visitHomeBuilding ) :
                     ( Math.random() < fp.appConfig.agentOptions.visitOtherBuilding );
            };
            /**
             * @memberof Agent
             */
            this.updateGroundedState = function(building) {
                var xl = this.lastPosition.x, yl = this.lastPosition.y, zl = this.lastPosition.z,
                    xd = this.direction.x, yd = this.direction.y, zd = this.direction.z;

                if ( !this.grounded ) {
                    var base = fp.getHeight(xl, zl) + fp.appConfig.agentOptions.terrainOffset;
                    if (yl <= base && yd < 0)
                        this.grounded = true;
                }
                else if ( !_.isUndefined( building ) && this.goingUp( building ) ) { // grounded == true
                    this.grounded = false;
                }
            };

            /**
             * Determines the next step for a computed direction.
             * @memberof Agent
             */
            this.nextComputedDirection = function() {
                if ( !this.pathComputed )
                    return undefined;
                if ( this.pathPosition + 1 >= this.pathComputed.length ) {
                    this.pathPosition = 0;
                    this.pathComputed = undefined;
                    return this.randomDirection();
                }
                // If we have prearranged a path, ensure the current direction points towards that
                var multiplier = fp.terrain.ratioExtentToPoint;
                var nextNode = this.pathComputed[ this.pathPosition + 1 ],
                    x = ( nextNode.x * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier,
                    z = ( nextNode.y * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier;

                // Time to move position?
                if ( ( this.position.x + this.direction.x - x ) * $.sign( this.direction.x ) > 0  ||
                     ( this.position.z + this.direction.z - z ) * $.sign( this.direction.z ) > 0 ) {
                    this.pathPosition++;
                    if ( this.pathPosition + 1 < this.pathComputed.length ) {
                        nextNode = this.pathComputed[ this.pathPosition + 1 ];
                        x = ( nextNode.x * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier;
                        z = ( nextNode.y * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier;
                    }
                }
                var xd = x - this.position.x,
                    zd = z - this.position.z,
                    xDir = xd / ( Math.abs( xd ) + Math.abs( zd ) ),
                    zDir = zd / ( Math.abs( xd ) + Math.abs( zd ) ),
                    dir = new THREE.Vector3(xDir, 0, zDir);
                return dir;
            };


            /**
             * Generates candicate directions from an existing direction.
             * @memberof Agent
             */
            this.candidateDirections = function() {
                // Check if we are in a building, and offer possibility of going up
                var xl = this.lastPosition.x,
                    yl = this.lastPosition.y,
                    zl = this.lastPosition.z,
                    xd = this.direction.x,
                    yd = this.direction.y,
                    zd = this.direction.z,
                    isAlreadyOnRoad = fp.roadNetwork.indexValues.indexOf( fp.getIndex( xl, zl ) ) > -1;

                var directionCount = 10,
                    directions = new Array( directionCount );

                // Work out if we have a precomputed path
                var dir = this.nextComputedDirection();
                if ( !_.isUndefined( dir ) )
                    return [ [dir, 1.0] ];

                // Update whether we are in  a building, and should be going up or do wn
                var building = this.findBuilding();
                this.updateGroundedState( building );

                // Weight variables
                var weight = 1.0, weightForRoadIsSet = false;

                // Pre-calculate speed and current angle
                var newSpeed = Math.random() * this.speed / 2,
                    angle = Math.atan2(zd, xd),
                    hyp = Math.sqrt(xd * xd + zd * zd),
                    divisor = (directionCount - 2) / 2;

                for ( var i = 0; i < directionCount; i++ ) {
                    if ( ( i < 8 && ! this.grounded ) || ( i >= 8 && this.grounded ) )
                        continue; // Move horizontally if grounded, vertically if not

                    if ( i < 8 && this.grounded ) { // Horizonal directions
                        var newAngle = angle + (i * Math.PI / divisor);
                        xd = Math.cos(newAngle) * hyp;
                        yd = 0;
                        zd = Math.sin(newAngle) * hyp;
                    }
                    else if ( !this.grounded && i >= 8 ) { // Vertical directions
                        xd = 0;
                        yd = ( i == 8 ) ? newSpeed : -newSpeed;
                        zd = 0;
                    }

                    // Calculate new position
                    var xn = xl + xd, yn = yl + yd, zn = zl + zd,
                        isRoad = ( fp.roadNetwork.indexValues.indexOf( fp.getIndex(xn, zn)) > -1);

                    // If we've had a horizontal shift, for now neutralise the vertical to the fp.terrain height
                    if ( yd === 0 ) {
                        yn = fp.getHeight( xn, zn );
                        // Smooth the transition between heights
                        yd = ( ( fp.appConfig.agentOptions.terrainOffset + yn ) - yl ) / fp.terrain.ratioExtentToPoint;
                    }
                    if ( yn === null )
                        continue; // Off the grid - don't return this option

                    // Work out weights

                    if ( i === 0 ) { // Current direction most preferred
                        weight = 0.999;
                        if ( isRoad )
                            weightForRoadIsSet = true;
                    }
                    else {
                        if ( !weightForRoadIsSet && isRoad ) {
                            if ( !isAlreadyOnRoad )
                                weight = 0.999;
                            else
                                weight = 0.5;
                            weightForRoadIsSet = true;
                        }
                        else
                            weight = 0.001;
                    }

                    // If moving upward, decrease the preference
                    if ( yn > yl && this.grounded && fp.appConfig.agentOptions.noUphill )
                        weight *= yl / yn;

                    // If currect direction is moving to water, set the preference low
                    if ( i == 0 && yn <= 0 && fp.appConfig.agentOptions.noWater )
                        weight = 0.0;

                    // If inside a building, adjust weights
                    if ( !this.grounded && !_.isUndefined( building ) ) {
                        var buildingHeight = building.levels * fp.appConfig.buildingOptions.levelHeight + building.lod.position.y;
                        if (i == 8) {
                            if ( yl >= buildingHeight || this.direction.y < 0 )
                                weight = 0.0;
                            else
                                weight = 1.0;
                        }
                        else if ( i == 9 ) {
                            if ( yl >= buildingHeight || this.direction.y < 0 )
                                weight = 1.0;
                            else if ( this.direction.y > 0 && Math.random() > 0.99 )
                                weight = 1.0;
                            else
                                weight = 0.0;
                        }
                    }

                    // Set the direction
                    directions[ i ] = [ new THREE.Vector3( xd, yd, zd ), weight ];
                }

                // Compact directions and sort by weight descending
                directions = _.chain(directions).compact().sort(function(a,b) { return (a[1] > b[1]) ? 1 : (a[1] < b [1]? -1 : 0); }).value();

                // If no directions are found, reverse current direction
                if ( directions.length === 0 ) {
                    var x = -this.direction.x;
                    var z = -this.direction.z;
                    var direction = new THREE.Vector3( x, fp.getHeight( x, z ), z );
                    directions.push( [ direction, 1.0 ] );

                    // Random direction option
                    // directions.push([this.randomDirection(), 1.0]);
                }

                return directions;
            };

            /**
             * Generates directions and weights, given an agent's existing direction.
             */
            this.generateDirectionVectorsAndWeights = function( seed ) {
                var xl = this.lastPosition.x,
                    yl = this.lastPosition.y,
                    zl = this.lastPosition.z,
                    xd = this.direction.x,
                    yd = this.direction.y,
                    zd = this.direction.z,
                    isAlreadyOnRoad = fp.roadNetwork.indexValues.indexOf( fp.getIndex( xl, zl ) ) > -1;

                // Logic for handling pre-determined paths
                if ( _.isUndefined( this.pathComputed ) || this.pathComputed.length < 2 ) {
                    if ( Math.random() < fp.appConfig.agentOptions.chanceToFindPathToHome )  {
                        this.pathComputed = fp.pathNetwork.findPathHome( this );
                        this.pathPosition = 0;
                    }
                    else if ( Math.random() < fp.appConfig.agentOptions.chanceToFindPathToOtherAgentHome ) {
                        this.pathComputed = fp.pathNetwork.findPathToOtherAgentsHome( this );
                        this.pathPosition = 0;
                    }
                }

                // Work out if we have a precomputed path
                var dir = this.nextComputedDirection();
                if ( !_.isUndefined( dir ) )
                    return [ [dir, 1.0] ];

                var directionCount = 8,
                     directions = new Array( directionCount  );

                // Weight variables
                var weight = 1.0, weightForRoadIsSet = false;

                // Pre-calculate speed and current angle
                var newSpeed = Math.random() * this.speed / 2,
                    angle = Math.atan2( zd, xd ),
                    hyp = Math.sqrt( xd * xd + zd * zd ),
                    divisor = directionCount / 2;

                for ( var i = 0; i < directionCount; i++ ) {
                    // Slight rounding errors using above calculation
                    var newAngle = angle + ( i * Math.PI / divisor );
                    xd = Math.cos( newAngle ) * hyp;
                    yd = 0;
                    zd = Math.sin( newAngle ) * hyp;

                    // Calculate new position
                    var xn = xl + xd, yn = yl + yd, zn = zl + zd,
                        isRoad = ( fp.roadNetwork.indexValues.indexOf( fp.getIndex(xn, zn)) > -1);

                    // Work out weights - should be
                    switch( i ) {
                        case 0:
                            weight = Math.pow( seed, 1 );
                            break;
                        case 1:
                        case 7:
                            weight = Math.pow( seed, 3 );
                            break;
                        case 2:
                        case 4:
                        case 6:
                            weight = Math.pow( seed, 4 );
                            break;
                        case 3:
                        case 5:
                            weight = Math.pow( seed, 5 );
                            break;
                    }

                    yn = fp.getHeight( xn, zn );

                    // Smooth the transition between heights
                    yd = ( fp.appConfig.agentOptions.terrainOffset + yn - yl ) / fp.terrain.ratioExtentToPoint;

                    // If the new y position is zero, set the weight to zero
                    if ( yn === null ) {
                        continue;
                    }

                    // If the new y position is zero, set the weight to zero
                    if ( yn <= 0 )
                        weight = 0;

                    // Set the direction
                    directions[ i ] = [ new THREE.Vector3( xd, yd, zd ), weight ];
                }
                directions = _.chain(directions).
                                compact().
                                shuffle().
                                sort(function(a,b) { return (a[1] > b[1]) ? 1 : (a[1] < b [1]? -1 : 0); }).
                                value();

                return directions;
            };

            /**
             * @memberof Agent
             */
            this.bestCandidate = function() {
                var directions = this.generateDirectionVectorsAndWeights( 0.1 );

                // A direction is pulled from a weighted list of possibilities
                var total = _.chain( directions ).
                    map(function(d) { return d[ 1 ]; } ).
                    reduce(function(memo, num) { return memo + num; }, 0).
                    value();
                var weightsNormed = _.chain(directions).
                    map(function(d) { return d[ 1 ] / total; } ).
                    sort().
                    reverse().
                    value();
                var r = Math.random();
                var index = 0, runningTotal = 0, len = directions.length - 1;
                // Note the interval array is initialisaed with an addition zero
                for (var i = 0; i < weightsNormed.length; i++) {
                    var a = weightsNormed[ i ];
                    runningTotal += a;
                    if ( r < runningTotal && i < directions.length ) {
                        return directions[ len - i ][ 0 ];
                    }
                }
                return this.randomDirection();
            };

            /**
             * @memberof Agent
             */
            this.move = function() {
                var directionAtSpeed = this.direction.clone().multiplyScalar( 16 / fp.timescale.framesToYear );
                // Multiply relative to patch size
                var patchSize = fp.appConfig.terrainOptions.patchSize *
                                fp.appConfig.terrainOptions.multiplier *
                                ( fp.appConfig.agentOptions.movementInPatch / 100 );
                directionAtSpeed = directionAtSpeed.multiplyScalar( patchSize );
                var newPosition = this.position.clone().add( directionAtSpeed );
                var bound = fp.appConfig.terrainOptions.multiplier * fp.terrain.gridExtent / 2;
                // Simple check to ensure we're within terrain bounds
                if ( newPosition.x < -bound || newPosition.x >= bound || newPosition.z < -bound || newPosition.z >= bound ) {
                    this.setDirection( this.randomDirection() );
                }
                else {
                    this.position = newPosition;
                }
            };

            /**
             * @memberof Agent
             */
            this.evaluateDirection = function() {
                this.lastPosition = this.position;
                this.setDirection( this.bestCandidate() );
            };

            /**
             * Returns array of compass directions
             */
            this.compassDirections = function() {
                var direction = 0, directions = [];
                for ( var i = 0; i < 8; i++ ) {
                    var x = Math.cos( direction ) / 2;
                    var z = Math.sin( direction ) / 2;
                    directions.push( [ x, z ] );
                    direction += Math.PI / 4;
                }
                return directions;
            };

            /**
             * Genenerates a random vector.
             * @memberof Agent
             */
            this.randomDirection = function() {
                if ( fp.appConfig.agentOptions.movementRandom ) {
                    return new THREE.Vector3( this.speed * ( Math.random() - 0.5 ), 0, this.speed * ( Math.random() - 0.5 ) );
                }
                else {
                    var directions = this.compassDirections();
                    var index = Math.floor( Math.random() * 8 );
                    var pos = directions[ index ];
                    var vec = new THREE.Vector3( this.speed * pos[ 0 ], 0, this.speed * pos[ 1 ] )
                    return vec;
                }
            };

            /**
             * @memberof Agent
             */
            this.nearestNeighbour = function( ignoreHeight ) {
                var agents = fp.agentNetwork.agents;
                var x = this.position.x, y = this.position.y, z = this.position.z;
                var nearest = null, leastLen = 0;
                for ( var i = 0; i < agents.length; i++ ) {
                    var agent = agents[ i ];
                    if ( agent == this )
                        continue;
                    var ox = agent.position.x, oy = agent.position.y, oz = agent.position.z;
                    var len = Math.sqrt( Math.pow( ox - x, 2 ) + Math.pow( oz - z, 2 ) );
                    if ( ! ignoreHeight ) {
                        len = Math.sqrt( Math.pow( len, 2 ) + Math.pow( oy - y, 2 ) );
                    }
                    if ( leastLen == 0 || len < leastLen) {
                        nearest = agent;
                        leastLen = len;
                    }
                }
                return nearest;
            };

            /**
             * @memberof Agent
             */
            this.setRandomDirection = function() {
                this.setDirection( this.randomDirection() );
            };

            /**
             * Slightly changes to the direction of the agent.
             */
            this.perturbDirection = function() {
                this.direction.x += this.perturbBy * ( Math.random() - 0.5 );
                this.direction.z += this.perturbBy * ( Math.random() - 0.5 );
            };

            /**
             * Calculate likelihood of building a home
             */
            this.calculateLikelihoodOfHome = function( index ) {
                // Simple test of local roads, water, buildings and building height
                var proximityTests = fp.buildingNetwork.proximityFunctions();
                for (var i = proximityTests.length - 1; i >= 0; i--) {
                    var proximityTest = proximityTests[i];
                    var func = _.first( proximityTest );
                    var values = _.rest( proximityTest );
                    var response = func.apply( fp, _.union( [ index ], values ) );
                    if ( response )
                        return true;
                };
                return false;
            }

            /**
             * Builds a building on the agent's current position.
             * @return {Boolean} Whether the building construction was successful.
             */
            this.build = function() {
                if ( !fp.appConfig.buildingOptions.create )
                    return false;

                if ( this.home !== null )
                    return false;

                if ( this.position === null )
                    return false;

                var index = fp.getIndex( this.position.x, this.position.z );
                if ( _.isUndefined( index ) )
                    return false;

                // Don't build in an existing position
                if ( !_.isUndefined( fp.buildingNetwork.buildingHash[index]) )
                    return false;

                var dimensions = fp.buildingNetwork.generateRandomDimensions();

                if ( fp.buildingNetwork.buildings.length === 0 ) { // If there are no buildings, build an initial "seed"
                    this.home = fp.buildingNetwork.createBuilding( this.position, dimensions );
                    return ( !_.isUndefined( this.home ) );
                }
                else if ( fp.buildingNetwork.networkMesh.children.length >= fp.appConfig.buildingOptions.maxNumber )
                    return false;

                if ( !_.isNull( fp.stats ) && fp.statss <= 10 )
                    return false;

                var shouldBuildHome = this.calculateLikelihoodOfHome( index );
                if ( shouldBuildHome ) {
                    this.home = fp.buildingNetwork.createBuilding( this.position, dimensions );
                    return ( !_.isUndefined( this.home ) );
                }

                return false;
            };

            /**
             * Builds a road on the agent's current position.
             * @return {Boolean} Whether the road construction was successful.
             */
            this.buildRoad = function() {
                if ( !fp.appConfig.roadOptions.create )
                    return false;

                var xOrig = this.position.x,
                    zOrig = this.position.z,
                    index = fp.getIndex(xOrig, zOrig),
                    xInit = fp.appConfig.agentOptions.initialX,
                    zInit = fp.appConfig.agentOptions.initialY,
                    xd = (xOrig - xInit),
                    zd = (zOrig - zInit),
                    distanceFromInitialPoint = Math.sqrt(xd * xd + zd * zd),
                    buildingIndex = _.map( fp.buildingNetwork.buildings, function(building) { return fp.getIndex(building.lod.position.x, building.lod.position.z); } );

                if ( fp.roadNetwork.networkMesh.children.length >= fp.appConfig.roadOptions.maxNumber)
                    return false;

                if ( !_.isNull( fp.stats ) && fp.statss <= 10 )
                    return false;

                if (fp.appConfig.displayOptions.buildingsShow) {
                    if ( fp.buildingNetwork.buildings.length === 0 ) {
                        return false;
                    }
                    else if ( fp.buildingNetwork.buildings.length == 1 ) {
                        if ( buildingIndex.indexOf( index ) == -1 )
                            return false;
                    }
                }
                if ( fp.roadNetwork.indexValues.length === 0) {
                    if (distanceFromInitialPoint > fp.appConfig.roadOptions.initialRadius)
                        return false;
                }
                else {
                    if ( fp.roadNetwork.indexValues.indexOf(index) == -1)
                        return false;
                    if ( buildingIndex.indexOf( index ) == -1 ) {
                        var r = Math.random();
                        var chance = 1 / ( Math.log(distanceFromInitialPoint + 1) * fp.appConfig.roadOptions.probability );
                        if (chance < r)
                            return false;
                    }
                }

                // Pick a random direction to create a road
                var xr = Math.random() * 2 - 0.5,
                    zr = Math.random() * 2 - 0.5,
                    lenMinimum = fp.appConfig.roadOptions.lenMinimum,
                    lenMaximum = fp.appConfig.roadOptions.lenMaximum,
                    lenFactor = Math.random();
                var existingRoad = fp.roadNetwork.roads[index];
                if (existingRoad) {
                    var ps = _.first(existingRoad.geometry.vertices),
                        pe = _.last(existingRoad.geometry.vertices),
                        xChange = ps.x - pe.x,
                        zChange = ps.z - pe.z,
                        angle = Math.atan2(zChange, xChange),
                        turn = Math.round(Math.random()),
                        angle90 = angle + Math.PI / 2 + Math.PI * turn;
                    xr = Math.cos(angle90);
                    zr = Math.sin(angle90);
                }
                var totalLen = lenMinimum +
                                (lenMaximum - lenMinimum) *
                                ( 1 - jStat.exponential.cdf( lenFactor, fp.appConfig.roadOptions.lenDistributionFactor ) ),
                    xExtent = xr * totalLen,
                    zExtent = zr * totalLen,
                    xEnd = this.position.x + xExtent,
                    zEnd = this.position.z + zExtent,
                    yEnd = fp.getHeight(xEnd, zEnd),
                    endPoint = new THREE.Vector3(xEnd, yEnd, zEnd),
                    xe = xOrig - xEnd,
                    ze = zOrig - zEnd,
                    distanceFromEnd = Math.sqrt(xe * xe + ze * ze),
                    width = Math.ceil( ( ( ( 1 / Math.log(distanceFromInitialPoint + 10) ) ) * Math.log( distanceFromEnd ) ) * fp.appConfig.roadOptions.roadWidth );
                return fp.roadNetwork.addRoad(this.position, endPoint, width);
            };
            this.vertex = null;
            this.position = null;
            this.direction = null;
            this.speed = fp.appConfig.agentOptions.initialSpeed;
            this.perturbBy = fp.appConfig.agentOptions.initialPerturbBy;
            this.lastPosition = null;
            this.grounded = true;
            this.alpha =  0.5 + (Math.random() / 2);
            this.color = "#ff0000"; // Red. Alternative for this model is blue: "#0000ff"
            this.ticks = 0;
            this.age = 0;

            this.home = null;
            this.health = 100;
            this.gender = Math.random() < 0.5 ? "f": "m";
            this.children = [];
            this.friends = [];
            this.pathComputed = undefined;
            this.pathPosition = 0;
        };


        /**
         * Represents a building with a position, dimesions, and one or more floors.
         * @constructor
         * @memberof fp
         * @inner
         */
        this.Building = function( form, dimensions, position, rotation ) {

            /**
             * Sets the dimensions of the building.
             * @param  {object} dimensions object containing levels, width and length properties.
             */
            this.initDimensions = function( dimensions ) {
                this.lod = new THREE.LOD();
                this.yOffset = 0;
                this.levels = 0;
                this.localMaxLevels = dimensions.levels;
                this.localWidth = dimensions.width;
                this.localLength = dimensions.length;

                // Set up materials
                var fc, lc, wc;
                if (fp.appConfig.displayOptions.dayShow) {
                    fc = fp.buildColorVector(fp.appConfig.colorOptions.colorDayBuildingFill);
                    lc = fp.buildColorVector(fp.appConfig.colorOptions.colorDayBuildingLine);
                    wc = fp.buildColorVector(fp.appConfig.colorOptions.colorDayBuildingWindow);
                }
                else {
                    fc = fp.buildColorVector(fp.appConfig.colorOptions.colorNightBuildingFill);
                    lc = fp.buildColorVector(fp.appConfig.colorOptions.colorNightBuildingLine);
                    wc = fp.buildColorVector(fp.appConfig.colorOptions.colorNightBuildingWindow);
                }

                this.lineMaterial = new THREE.LineBasicMaterial({
                    color: lc,
                    linewidth: fp.appConfig.buildingOptions.linewidth
                });
                this.windowMaterial = new THREE.MeshBasicMaterial( { color: wc } );
                this.windowMaterial.side = THREE.DoubleSide;
                this.buildingMaterial = new THREE.MeshBasicMaterial( { color: fc } );
                this.buildingMaterial.side = THREE.DoubleSide;
                this.buildingMaterial.opacity = 1;

                this.geometry = new THREE.Geometry();
                // Pre-fill with enough vertices
                for (var i = 0; i < (fp.appConfig.maxLevels * 16 + 8); i++)
                    this.geometry.vertices.push(new THREE.Vector3(0,0,0));
                this.geometry.verticesNeedUpdate = true;

                // Set up containers
                this.highResMeshContainer = new THREE.Object3D();
                this.lowResMeshContainer = new THREE.Object3D();

                if (! fp.appConfig.buildingOptions.useShader) {
                    this.mesh = new THREE.Line( this.geometry, this.lineMaterial, THREE.LinePieces );
                    this.highResMeshContainer.add( this.mesh );

                    this.windowsOutlineContainer = new THREE.Object3D();
                    if (fp.appConfig.buildingOptions.windowsLine)
                        this.highResMeshContainer.add( this.windowsOutlineContainer );

                    this.windowsFillContainer = new THREE.Object3D();
                    if (fp.appConfig.buildingOptions.windowsFill)
                        this.highResMeshContainer.add( this.windowsFillContainer );
                }

                if ( fp.appConfig.buildingOptions.useLevelOfDetail ) {
                    this.lod.addLevel( this.highResMeshContainer, fp.appConfig.buildingOptions.highResDistance );
                    this.lod.addLevel( this.lowResMeshContainer, fp.appConfig.buildingOptions.lowResDistance );
                    this.lowResGeometry = new THREE.BoxGeometry(fp.appConfig.buildingOptions.width, (this.levels + 1) * fp.appConfig.buildingOptions.levelHeight, fp.appConfig.buildingOptions.length);
                    this.lowResGeometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, (this.levels + 1) * fp.appConfig.buildingOptions.levelHeight / 2, 0 ) );
                    this.lowResMesh = new THREE.Mesh(this.lowResGeometry, this.buildingMaterial);
                    this.lowResMeshContainer.add(this.lowResMesh);
                }
                else
                    this.lod.addLevel( this.highResMeshContainer, 1 );

                this.lod.updateMatrix();
                this.lod.matrixAutoUpdate = false;
            };

            /**
             * Adds a new floor to the current building
             */
            this.addFloor = function () {
                var base = this.levels * fp.appConfig.buildingOptions.levelHeight;
                var points = fp.BUILDING_FORMS[this.buildingForm]( this.localWidth, this.localLength, base );
                if ( !fp.appConfig.buildingOptions.useShader ) {
                    if (fp.appConfig.buildingOptions.showLines) {
                        this.geometry.dynamic = true;
                        this.generateSkeleton(points);
                        this.geometry.verticesNeedUpdate = true;
                    }
                    if (fp.appConfig.buildingOptions.showFill)
                        this.generateExtrudedShape(points);
                    if (fp.appConfig.buildingOptions.showWindows)
                        this.generateWindows(points);
                }
                else {
                    this.shadedShape( points );
                }

                this.levels++;
                // Update a low res model once the rest is complete
                this.updateSimpleBuilding();

                // Do tapering and staggering here
                if (fp.appConfig.buildingOptions.stagger) {
                    if (fp.appConfig.buildingOptions.taper) {
                        var percentage = this.levels / this.localMaxLevels;
                        var sq = Math.pow(percentage, fp.appConfig.buildingOptions.taperExponent);
                        var hurdle = jStat.exponential.cdf(sq, fp.appConfig.buildingOptions.taperDistribution);
                        if (Math.random() < hurdle) {
                            this.localWidth -= fp.appConfig.buildingOptions.staggerAmount;
                            this.localLength -= fp.appConfig.buildingOptions.staggerAmount;
                        }
                    }
                    else {
                        this.localWidth -= fp.appConfig.buildingOptions.staggerAmount;
                        this.localLength -= fp.appConfig.buildingOptions.staggerAmount;
                    }
                }
            };

            /**
             * Removes the top floor from the current building
             */
            this.removeFloor = function() {
                var topFloor = this.highResMeshContainer.children[ this.highResMeshContainer.children.length - 1 ];
                this.highResMeshContainer.remove(topFloor);
                this.levels--;
                // Update a low res model once the rest is complete
                this.updateSimpleBuilding();
            };

            this.generateSkeleton = function (points) {
                var i, base = points[0].y;
                var height = base + fp.appConfig.buildingOptions.levelHeight;
                var offset = fp.getOffset(this.levels, points.length);

                if (this.levels === 0) {
                    this.geometry.vertices[offset] = points[0];
                    for (i = 1; i < points.length; i ++) {
                        this.geometry.vertices[offset + i * 2 - 1] = points[i];
                        this.geometry.vertices[offset + i * 2] = points[i];
                    }
                    this.geometry.vertices[offset + points.length * 2 - 1] = points[0];
                    offset += points.length * 2;
                }

                for (i = 0; i < points.length; i ++) {
                    this.geometry.vertices[offset + i * 2] = points[i];
                    this.geometry.vertices[offset + i * 2 + 1] = new THREE.Vector3(points[i].x, height, points[i].z);
                }
                offset += points.length * 2;

                this.geometry.vertices[offset] = new THREE.Vector3(points[0].x, height, points[0].z);
                for (i = 1; i < points.length; i ++) {
                    this.geometry.vertices[offset + i * 2 - 1] = new THREE.Vector3(points[i].x, height, points[i].z);
                    this.geometry.vertices[offset + i * 2] = new THREE.Vector3(points[i].x, height, points[i].z);
                }
                this.geometry.vertices[offset + points.length * 2 - 1] = new THREE.Vector3(points[0].x, height, points[0].z);
            };

            this.generateExtrudedShape = function (points) {
                var base = points[0].y;
                var height = base + fp.appConfig.buildingOptions.levelHeight;
                var offset = fp.getOffset(this.levels, points.length);

                // EXTRUDED SHAPE FOR NON-BOX SHAPED BUILDINGS
                var shape = new THREE.Shape();
                shape.moveTo(points[0].x, points[0].z);
                for (var i = 1; i < points.length; i ++) {
                    shape.lineTo(points[i].x, points[i].z);
                }
                shape.lineTo(points[0].x, points[0].z);
                var extrudeSettings = { amount: fp.appConfig.buildingOptions.levelHeight * 1.0, bevelEnabled: false };
                var shapeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                shapeGeometry.faceVertexUvs[0][0][0].set( 0, 0 );
                shapeGeometry.faceVertexUvs[0][0][1].set( 0, 0 );
                shapeGeometry.faceVertexUvs[0][0][2].set( 0, 0 );
                shapeGeometry.faceVertexUvs[0][1][0].set( 0, 0 );
                shapeGeometry.faceVertexUvs[0][1][1].set( 0, 0 );
                shapeGeometry.faceVertexUvs[0][1][2].set( 0, 0 );
                shapeGeometry.faceVertexUvs[0][2][0].set( 0, 0 );
                shapeGeometry.faceVertexUvs[0][2][1].set( 0, 0 );
                shapeGeometry.faceVertexUvs[0][2][2].set( 0, 0 );
                shapeGeometry.faceVertexUvs[0][3][0].set( 0, 0 );
                shapeGeometry.faceVertexUvs[0][3][1].set( 0, 0 );
                shapeGeometry.faceVertexUvs[0][3][2].set( 0, 0 );
                shapeGeometry.computeBoundingBox();
                if (shapeGeometry.boundingBox) {
                    var fc = (fp.appConfig.displayOptions.dayShow) ? fp.appConfig.colorOptions.colorDayBuildingFill : fp.appConfig.colorOptions.colorNightBuildingFill;
                    var buildingMaterial = new THREE.MeshBasicMaterial({color: fc });
                    var box = new THREE.Mesh( shapeGeometry, buildingMaterial );
                    box.rotation.set(Math.PI / 2, 0, 0);
                    box.position.set(0, height, 0);
                    box.geometry.verticesNeedUpdate = true;
                    this.highResMeshContainer.add( box );
                }
            };

            this.generateWindows = function (points) {
                var base = points[0].y + fp.appConfig.agentOptions.terrainOffset;
                var offset = fp.getOffset(this.levels, points.length);

                // General calculable variables
                var windowHeight = ((fp.appConfig.buildingOptions.windowsEndY - fp.appConfig.buildingOptions.windowsStartY) / 100) * fp.appConfig.buildingOptions.levelHeight;
                var winActualWidth = (fp.appConfig.buildingOptions.windowPercent / 100) * fp.appConfig.buildingOptions.windowWidth;

                // Create the window shape template
                var shape = new THREE.Shape();
                shape.moveTo(0, 0);
                shape.lineTo(winActualWidth, 0);
                shape.lineTo(winActualWidth, windowHeight);
                shape.lineTo(0, windowHeight);
                shape.lineTo(0, 0);
                var extrudeSettings = { amount: 1.0, bevelEnabled: false };
                var shapeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                // var shapeGeometry = new THREE.ShapeGeometry(shape);
                var box = new THREE.Mesh( shapeGeometry, this.windowMaterial );

                var outlineGeometry = new THREE.ShapeGeometry(shape);
                var windowPoints = shape.createPointsGeometry();
                var windowOutline = new THREE.Line( windowPoints, this.lineMaterial );

                for (var i = 0; i < points.length; i ++) {
                    var previousPoint;
                    if (i === 0)
                        previousPoint = points[points.length - 1];
                    else
                        previousPoint = points[i - 1];
                    var currentPoint = points[i];
                    var xDiff = currentPoint.x - previousPoint.x;
                    var zDiff = currentPoint.z - previousPoint.z;
                    var lineLength = Math.sqrt(xDiff * xDiff + zDiff * zDiff);
                    var windowCount = Math.floor(lineLength / fp.appConfig.buildingOptions.windowWidth);
                    var winOffset = (fp.appConfig.buildingOptions.windowWidth - winActualWidth) / 2;
                    var windowStart = base + (fp.appConfig.buildingOptions.levelHeight * (fp.appConfig.buildingOptions.windowsStartY / 100));
                    var windowEnd = base + (fp.appConfig.buildingOptions.levelHeight * (fp.appConfig.buildingOptions.windowsEndY / 100));
                    var winW = winActualWidth * (xDiff / lineLength);
                    var winL = winActualWidth * (zDiff / lineLength);
                    var winOffsetW = winOffset * (xDiff / lineLength);
                    var winOffsetL = winOffset * (zDiff / lineLength);
                    var angle = Math.atan2(xDiff, zDiff) + Math.PI / 2;
                    for (var j = 0 ; j < windowCount; j++) {
                        var winX = previousPoint.x + (j * xDiff / windowCount) + winOffsetW;
                        var winZ = previousPoint.z + (j * zDiff / windowCount) + winOffsetL;

                        if (fp.appConfig.buildingOptions.windowsFill) {
                            var boxCopy = box.clone();
                            boxCopy.position.set(winX + winW, windowStart, winZ + winL);
                            boxCopy.rotation.set(0, angle, 0);
                            this.windowsFillContainer.add(boxCopy);
                        }

                        if (fp.appConfig.buildingOptions.windowsLine) {
                            var windowOutlineCopy = windowOutline.clone();
                            windowOutlineCopy.position.set(winX + winW, windowStart, winZ + winL);
                            windowOutlineCopy.rotation.set(0, angle, 0);
                            this.windowsOutlineContainer.add(windowOutlineCopy);
                        }
                    }
                }
            };


            this.shadedShapeMock = function( ) {
                var base = this.levels * fp.appConfig.buildingOptions.levelHeight + fp.appConfig.terrainOptions.defaultHeight;
                var points = fp.BUILDING_FORMS[this.buildingForm]( this.localWidth, this.localLength, base );
                var base = points[0].y;
                var height = base;// + this.lod.position.y;
                var offset = fp.getOffset( this.levels, points.length );
                var shape = new THREE.Shape();
                shape.moveTo(points[0].x, points[0].z);
                for (var i = 1; i < points.length; i ++)
                    shape.lineTo(points[i].x, points[i].z);
                shape.lineTo(points[0].x, points[0].z);
                var extrudeSettings = { amount: fp.appConfig.buildingOptions.levelHeight * 1.0, bevelEnabled: false };
                var shapeGeometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
                shapeGeometry.computeBoundingBox();
                var mesh;

                if ( shapeGeometry.boundingBox ) {
                    var dumbMaterial = new THREE.MeshBasicMaterial({ color: "#ff0000" });
                    dumbMaterial.visible = false;

                    mesh = new THREE.Mesh( shapeGeometry, dumbMaterial );
                    mesh.rotation.set( -Math.PI / 2, 0, 0 );
                    var height = fp.getHeight( this.highResMeshContainer.position.x, this.highResMeshContainer.position.z );
                    mesh.position.set( this.highResMeshContainer.position.x, height, this.highResMeshContainer.position.z );
                    mesh.updateMatrix();
                    return mesh;
                }
                return null;
            };

            this.shadedShapeGeometry = function( points ) {
                var shape = new THREE.Shape();
                shape.moveTo(points[0].x, points[0].z);
                for ( var i = 1; i < points.length; i++ )
                    shape.lineTo(points[i].x, points[i].z);
                shape.lineTo(points[0].x, points[0].z);
                return shape;
            };

            this.shadedShape = function( points ) {
                var base = points[0].y;
                var height = base;// + this.lod.position.y;
                var offset = fp.getOffset( this.levels, points.length );
                var shape = this.shadedShapeGeometry( points );
                var extrudeSettings = { amount: fp.appConfig.buildingOptions.levelHeight * 1.0, bevelEnabled: false };
                var shapeGeometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
                shapeGeometry.computeBoundingBox();

                if ( shapeGeometry.boundingBox ) {
                    // if ( this.highResMeshContainer.children.length == 0 ) {
                    // if ( this.levels < 1000 ) {
                    if ( this.levels === 0 ) {
                        var fc, lc, wc;
                        if (fp.appConfig.displayOptions.dayShow) {
                            fc = fp.buildColorVector(fp.appConfig.colorOptions.colorDayBuildingFill);
                            lc = fp.buildColorVector(fp.appConfig.colorOptions.colorDayBuildingLine);
                            wc = fp.buildColorVector(fp.appConfig.colorOptions.colorDayBuildingWindow);
                        }
                        else {
                            fc = fp.buildColorVector(fp.appConfig.colorOptions.colorNightBuildingFill);
                            lc = fp.buildColorVector(fp.appConfig.colorOptions.colorNightBuildingLine);
                            wc = fp.buildColorVector(fp.appConfig.colorOptions.colorNightBuildingWindow);
                        }
                        // Gets around a problem with rendering a single building with lines or windows
                        var showLines = ( fp.buildingNetwork.buildings.length > 1 && fp.appConfig.buildingOptions.showLines );
                        var showWindows = fp.appConfig.buildingOptions.showWindows;
                        this.uniforms = {
                            time: { type: "f", value: 1.0 },
                            location: { type: "v2", value: new THREE.Vector2( this.lod.position.x, this.lod.position.z ) },
                            resolution: { type: "v2", value: new THREE.Vector2() },
                            dimensions: { type: "v3", value: new THREE.Vector3(shapeGeometry.boundingBox.max.x - shapeGeometry.boundingBox.min.x, fp.appConfig.buildingOptions.levelHeight, shapeGeometry.boundingBox.max.y - shapeGeometry.boundingBox.min.y) },
                            bottomWindow: { type: "f", value: this.bottomWindow },
                            topWindow: { type: "f", value: this.topWindow },
                            windowWidth: { type: "f", value: this.windowWidth },
                            windowPercent: { type: "f", value: this.windowPercent },
                            floorLevel: { type: "f", value: this.levels },
                            //opacity: { type: "f", value: fp.appConfig.buildingOptions.opacity },
                            lineColor: { type: "v3", value: lc },
                            lineWidth: { type: "f", value: fp.appConfig.buildingOptions.linewidth },
                            fillColor: { type: "v3", value: fc },
                            windowColor: { type: "v3", value: wc },
                            showLines: { type: "i", value: showLines ? 1 : 0 },
                            showFill: { type: "i", value: fp.appConfig.buildingOptions.showFill ? 1 : 0 },
                            showWindows: { type: "i", value: showWindows ? 1 : 0 },
                            fillRooves: { type: "i", value: fp.appConfig.buildingOptions.fillRooves ? 1 : 0 }
                        };
                        var attributes = { mixin: { type: "f", value: [] } };
                        for ( var i = 0; i < shapeGeometry.vertices.length; i++ )
                            attributes.mixin.value[i] = Math.random() * 10;

                        var shaderMaterial = new THREE.ShaderMaterial( {
                            uniforms: fp.ShaderUtils.lambertUniforms( this.uniforms ),
                            attributes: attributes,
                            vertexShader: fp.ShaderUtils.lambertShaderVertex(
                                fp.ShaderUtils.buildingVertexShaderParams(),
                                fp.ShaderUtils.buildingVertexShaderMain()
                            ),
                            fragmentShader: fp.ShaderUtils.lambertShaderFragment(
                                fp.ShaderUtils.buildingFragmentShaderParams(),
                                fp.ShaderUtils.buildingFragmentShaderMain()
                            ),
                            lights: true
                        } );

                        shaderMaterial.side = THREE.DoubleSide;
                        shaderMaterial.wireframe = fp.appConfig.displayOptions.wireframeShow;

                        // this.mesh = new THREE.Mesh( shapeGeometry, dumbMaterial );
                        this.mesh = new THREE.Mesh( shapeGeometry, shaderMaterial );
                        this.mesh.castShadow = true;
                        this.mesh.receiveShadow = true;
                        this.mesh.children.forEach( function(b) {
                            b.castShadow = true;
                            b.receiveShadow = true;
                        } );
                        this.mesh.rotation.set( -Math.PI / 2, 0, 0 );
                        var height = fp.getHeight( this.highResMeshContainer.position.x, this.highResMeshContainer.position.z );
                        this.mesh.position.set( this.highResMeshContainer.position.x, height, this.highResMeshContainer.position.z );
                        this.mesh.updateMatrix();
                        // fp.buildingNetwork.networkMesh.add( this.highResMeshContainer );
                        fp.buildingNetwork.networkMesh.add( this.mesh );
                        this.highResMeshContainer.add( this.mesh.clone() );
                        /*
                        if ( fp.buildingNetwork.networkMesh.children.length == 0 ) {
                            this.mesh.rotation.set( -Math.PI / 2, 0, 0 );
                            this.mesh.position.set( this.highResMeshContainer.position.x, height, this.highResMeshContainer.position.z );
                            this.mesh.updateMatrix();
                            fp.buildingNetwork.networkMesh.add( this.mesh );
                        }
                        else {
                            // this.mesh.rotation.set( -Math.PI / 2, 0, 0 );
                            this.mesh.position.set( this.highResMeshContainer.position.x, this.highResMeshContainer.position.z, height );
                            this.mesh.updateMatrix();
                            fp.buildingNetwork.networkMesh.children[0].geometry.mergeMesh( this.mesh );
                            fp.buildingNetwork.networkMesh.children[ len ].geometry.verticesNeedUpdate = true;
                        }
                        */
                    }
                    else {
                        var dumbMaterial = new THREE.MeshBasicMaterial({ color: "#ff0000" });
                        var floorMesh = new THREE.Mesh( shapeGeometry, dumbMaterial );
                        floorMesh.position.set( 0, 0, height );
                        floorMesh.updateMatrix();
                        var newGeom = this.mesh.geometry.clone()
                        newGeom.mergeMesh( floorMesh )
                        newGeom.verticesNeedUpdate = true;
                        var newMesh = new THREE.Mesh( newGeom, this.mesh.material );
                        newMesh.castShadow = true;
                        newMesh.receiveShadow = true;
                        newMesh.children.forEach( function(b) {
                            b.castShadow = true;
                            b.receiveShadow = true;
                        } );
                        newMesh.rotation.set( -Math.PI / 2, 0, 0 );
                        var newHeight = fp.getHeight( this.highResMeshContainer.position.x, this.highResMeshContainer.position.z );
                        newMesh.position.set( this.highResMeshContainer.position.x, newHeight, this.highResMeshContainer.position.z );
                        newMesh.updateMatrix();
                        newMesh.geometry.verticesNeedUpdate = true;
                        fp.buildingNetwork.networkMesh.remove( this.mesh );
                        this.mesh = newMesh;
                        fp.buildingNetwork.networkMesh.add( this.mesh );
                    }
                }
            };


            this.canAddFloor = function() {
                return ( !this.destroying && this.levels < this.localMaxLevels && this.localWidth > 0 && this.localLength > 0 );
            };

            /**
             * Updates the building's state.
             */
            this.updateBuilding = function() {
                if ( this.canAddFloor() ) {
                    this.counter ++;
                    if ( this.counter % fp.appConfig.buildingOptions.riseRate === 0 || this.levels === 0 ) {
                        this.addFloor();
                    }

                    if (fp.appConfig.buildingOptions.falling) {
                        var y = - ( this.levelHeight /  (2 * fp.appConfig.buildingOptions.riseRate));
                        this.yOffset += y;
                        this.highResMeshContainer.translateY(y);
                        this.lowResMeshContainer.translateY(y);
                    }
                }
                // NOT WORKING YET
                else if ( !this.destroying && fp.appConfig.buildingOptions.destroyOnComplete) {
                    this.destroying = true;
                }
                else if ( this.destroying && this.levels > 0 ) {
                    this.counter ++;
                    if (this.counter % fp.appConfig.buildingOptions.riseRate === 0 ) {
                        this.removeFloor();
                    }
                }
                else if ( this.destroying && this.levels === 0 && fp.appConfig.buildingOptions.loopCreateDestroy ) {
                    this.destroying = false;
                }

                if (fp.appConfig.buildingOptions.turning) {
                    this.highResMeshContainer.rotation.x += 0.001;
                    this.highResMeshContainer.rotation.y += 0.01;
                    this.lowResMeshContainer.rotation.x += 0.001;
                    this.lowResMeshContainer.rotation.y += 0.01;
                    this.lowResMesh.rotation.x += 0.001;
                    this.lowResMesh.rotation.y += 0.01;
                }
                this.updateBuildingShader();
            };

            /**
             * Updates the building's shader.
             */
            this.updateBuildingShader = function() {
                if ( _.isUndefined( this.mesh ) || _.isNull( this.mesh ) )
                    return;
                var verticesPerLevel = this.mesh.geometry.vertices.length / this.levels;
                var shaderMaterial = this.mesh.material;
                for ( var i = 0; i < this.levels; i++ ) {
                    var r = Math.random() * 10;
                    var chance = fp.appConfig.buildingOptions.windowsFlickerRate;
                    if ( Math.random() < chance ) {
                        var v = i * verticesPerLevel;
                        for ( var j = v; j < v + verticesPerLevel; j++ ) {
                            shaderMaterial.attributes.mixin.value[ j ] = r;
                        }
                    }
                };
                shaderMaterial.attributes.mixin.needsUpdate = true; // important!
            };

            this.updateSimpleBuilding = function () {
                if (this.levels > 1) {
                    if (!this.destroying)
                        this.lowResMesh.scale.set(1, this.lowResMesh.scale.y * this.levels / (this.levels - 1), 1);
                    else
                        this.lowResMesh.scale.set(1, this.lowResMesh.scale.y * (this.levels - 1) / (this.levels), 1);
                }
                else if (this.destroying)
                    this.lowResMesh.scale.set(1, 1, 1);
            };

            this.translatePosition = function(x, y, z) {
                this.lod.position.set(x, y, z);
                this.highResMeshContainer.position.set(x, y, z);
                this.lowResMeshContainer.position.set(x, y, z);
            };

            this.windowsOutline = function(value) {
                if (value)
                    this.highResMeshContainer.add(this.windowsOutlineContainer);
                else
                    this.highResMeshContainer.remove(this.windowsOutlineContainer);
            };

            this.windowsFill = function(value) {
                if (value)
                    this.highResMeshContainer.add(this.windowsFillContainer);
                else
                    this.highResMeshContainer.remove(this.windowsFillContainer);
            };

            /**
             * Initialises the building.
             */
            this.init = function( form, dimensions, position, rotation ) {
                this.originPosition = position;
                // Use Poisson distribution with lambda of 1 to contour building heights instead
                var w = 1 - jStat.exponential.cdf( Math.random() * 9, 1 );
                var d = 1 - jStat.exponential.cdf( Math.random() * 9, 1 );
                // var h =  Math.floor(jStat.exponential.pdf(Math.random(), 50))
                var h = Math.floor(jStat.exponential.sample(fp.appConfig.buildingOptions.heightA) * fp.appConfig.buildingOptions.heightB);
                this.maxWidth = Math.floor(w * 9) + fp.appConfig.buildingOptions.heightB;
                this.maxDepth = Math.floor(d * 9) + 1;
                this.maxHeight = h + 1;

                this.bottomWindow = 1.0 - (fp.appConfig.buildingOptions.windowsEndY / 100.0);
                this.topWindow = 1.0 - (fp.appConfig.buildingOptions.windowsStartY/ 100.0);
                this.windowWidth = fp.appConfig.buildingOptions.windowWidth;
                this.windowPercent = fp.appConfig.buildingOptions.windowPercent / 100.0;
                if ( fp.appConfig.buildingOptions.windowsRandomise ) {
                    // Randomise based on a normal distribution
                    var bottomWindowTmp = jStat.normal.inv( Math.random(), this.bottomWindow, 0.1 );
                    var topWindowTmp = jStat.normal.inv( Math.random(), this.topWindow, 0.1 );
                    var windowWidthTmp = jStat.normal.inv( Math.random(), this.windowWidth, 0.1 );
                    var windowPercentTmp = jStat.normal.inv( Math.random(), this.windowPercent, 0.1 );
                    // Coerce value between a min and max
                    var coerceValue = function(num, min, max) {
                        if ( num < min )
                            return min;
                        if ( num > max )
                            return max;
                        return num;
                    };
                    this.bottomWindow = coerceValue( bottomWindowTmp, 0, 100 );
                    this.topWindow = coerceValue( topWindowTmp, 0, 100 );
                    this.windowWidth = coerceValue( windowWidthTmp, 0, 100 );
                    this.windowPercent = coerceValue( windowPercentTmp, 0, 100 );
                }

                if ( !_.isUndefined( form ) )
                    this.buildingForm = form;
                if ( !_.isUndefined( dimensions ) )
                    this.initDimensions( dimensions );
                if ( !_.isUndefined( position ) ) {
                    var posY = fp.getHeight(position.x, position.z) + fp.appConfig.buildingOptions.levelHeight;
                    this.originPosition = new THREE.Vector3( position.x, posY, position.z );
                    this.lod.position.set( position.x, posY, position.z );
                    this.highResMeshContainer.position.set(position.x, posY, position.z);
                    this.lowResMeshContainer.position.set(position.x, posY, position.z);
                }
                if ( !_.isUndefined( rotation ) ) {
                    this.lod.rotation.set( rotation.x, rotation.y, rotation.z );
                    this.highResMeshContainer.rotation.set( rotation.x, rotation.y, rotation.z );
                    this.lowResMeshContainer.rotation.set( rotation.x, rotation.y, rotation.z );
                }
                // Add an initial floor so the building is visible.
                this.mockMesh = this.shadedShapeMock();
                // this.addFloor();
            };

            this.mockMesh = null;
            this.mesh = null;
            this.lineMaterial = null;
            this.buildingMaterial = null;
            this.windowMaterial = null;
            this.lod = null;
            this.mesh = null;
            this.geometry = null;
            this.windowGeometry = null;
            this.windowMesh = null;
            this.windowsFillContainer = null;
            this.windowsOutlineContainer = null;
            this.lowResGeomtery = null;
            this.lowResMesh = null;
            this.highResMeshContainer = null;
            this.lowResMeshContainer = null;
            this.levels = 0;
            this.counter = 0;
            this.localMaxLevels = null;
            this.localWidth = null;
            this.localLength = null;
            this.yOffset = 0;
            this.uniforms = null;
            this.buildingForm = null;
            this.destroying = false;
            this.originPosition = null;

            this.init( form, dimensions, position, rotation );
        };

        /**
         * Represents a road or path between two points.
         * @constructor
         * @memberof fp
         * @inner
         */
        this.Road = function() {
            this.mesh = null;
            this.position = null;
            this.setupRoad = function(_x, _y, _z) {
                x = _x || 0;
                y = _y || 0;
                z = _z || 0;
            };
            this.shadedShape = function (points) {};
            this.update = function() { };
        };

        /**
         * Represents relevant state about the application.
         * @constructor
         * @memberof fp
         * @inner
         */
        this.AppState = {
            runSimulation: false,
            stepSimulation: false
        };

        /**
         * Represents configuration data about the application.
         * @constructor
         * @namespace AppConfig
         * @memberof fp
         * @inner
         */
        this.AppConfig = function() {
            /**
             * World options.
             * @namespace fp~AppConfig~worldOptions
             */
            this.worldOptions = {
                /**
                 * Maximum depth to search for land.
                 * @memberOf fp~AppConfig~worldOptions
                 * @inner
                 */
                maxLandSearchDepth: 2,

                /**
                 * Number of index points to use in search (depends on building size)
                 * @memberOf fp~AppConfig~worldOptions
                 * @inner
                 */
                searchIncrement: 2
            };
            /**
             * Agent options.
             * @namespace fp~AppConfig~agentOptions
             */
            this.agentOptions = {
                /**
                 * Initial population of agents.
                 * @type {Number}
                 * @memberOf fp~AppConfig~agentOptions
                 * @inner
                 */
                initialPopulation: 100,
                /**
                 * The <em>initial</em> extent, or diameter, around the point of origin, where agents can be
                spawned, expressed as a percentage (0-100).
                 * @type {Number}
                 * @memberOf fp~AppConfig~agentOptions
                 * @inner
                 */
                initialExtent: 10,
                /**
                 * The <em>maximum</em> extent, or diameter, around the point of origin, where agents can be
                spawed, expressed as a percentage (0-100).
                 * @type {Number}
                 * @memberOf fp~AppConfig~agentOptions
                 * @inner
                 */
                maxExtent: 100,
                // initialX: -500, initialY: -1500, // Melbourne
                /**
                 * The <em>x</em> co-ordinate of the point of origin, expressed as a percentage (0-100) of distance from the actual grid center.
                 * @type {Number}
                 * @memberOf fp~AppConfig~agentOptions
                 * @inner
                 */
                initialX: 50,
                /**
                 * The <em>y</em> co-ordinate of the point of origin, expressed as a percentage (0-100) of distance from the actual grid center.
                 * @type {Number}
                 * @memberOf fp~AppConfig~agentOptions
                 * @inner
                 */
                initialY: 50,
                randomAge: true,
                chanceToJoinNetwork: 0.05,
                chanceToJoinNetworkWithHome: 0.05,
                chanceToJoinNetworkWithBothHomes: 0.05,
                chanceToFindPathToHome: 0.00,
                chanceToFindPathToOtherAgentHome: 0.00,
                initialCircle: true,
                noWater: true,
                noUphill: false, // Eventually remove for more fine-grained weight control
                useStickman: true,
                visitHomeBuilding: 0.02,
                visitOtherBuilding: 0.002,
                establishLinks: false,
                size: 40,
                terrainOffset: 20,
                shuffle: false,
                movementInPatch: 1,
                movementRandom: false,
                initialSpeed: 2,
                initialPerturbBy: 0.05
            };
            this.buildingOptions = {
                create: true,

                maxNumber: 250, // Maximum number of buildings - for performance reasons

                // Carry over from generation
                heightA: 2,
                heightB: 10,

                // Influences
                roads: 0.0,
                water: 0.4,
                otherBuildings: 0.9,
                distanceFromOtherBuildingsMin: 800,
                distanceFromOtherBuildingsMax: 1000,
                buildingHeight: 0.1,

                // Building form
                buildingForm: "rectangle",
                spread: 10,
                randomForm: false,
                rotateRandomly: false,
                rotateSetAngle: 0,

                destroyOnComplete: false,
                loopCreateDestroy: false,

                // Visualisation
                turning: false,
                falling: false,
                riseRate: 10,

                // Dimensions
                minHeight: 10,
                maxHeight: 70,
                minWidth: 40,
                maxWidth: 200,
                minLength: 40,
                maxLength: 200,
                maxLevels: 0,
                width: 0,
                length: 0,
                levelHeight: 40,

                // View parameters
                useShader: true,
                useLevelOfDetail: true,
                highResDistance: 1000,
                lowResDistance: 7500,
                opacity: 1.0,

                // Fill parameters
                showFill: true,
                fillRooves: false,

                // Stroke parameters
                showLines: true,
                linewidth: 1.0,

                // Window parameters
                showWindows: true,
                windowsRandomise: false,
                windowsFlickerRate: 0.05,
                windowWidth: 15,
                windowPercent: 60,
                windowsStartY: 40,
                windowsEndY: 80,
                windowsLine: true,
                windowsFill: false,

                // Stagger
                stagger: true,
                staggerAmount: 40,

                // Taper
                taper: true,
                taperExponent: 2,
                taperDistribution: 1,

                // Collision detection
                detectBuildingCollisions: true,
                detectRoadCollisions: true
            };
            this.roadOptions = {
                create: true,
                maxNumber: 200,  // Maximum number of roads - for performance reasons
                roadWidth: 20,
                roadDeviation: 20,
                roadRadiusSegments: 10,
                roadSegments: 10,
                initialRadius: 100,
                probability: 1,
                lenMinimum: 100,
                lenMaximum: 2000,
                lenDistributionFactor: 3,
                overlapThreshold: 3,
                flattenAdjustment: 0.025,
                flattenLift: 20
            };
            this.displayOptions = {
                agentsShow: true,
                buildingsShow: true,
                roadsShow: true,
                waterShow: true,
                networkShow: false,
                networkCurve: true,
                networkCurvePoints: 20,
                patchesShow: false,
                patchesUpdate: true,
                patchesUseShader: true,
                trailsShow: false,
                trailsShowAsLines: false,
                trailLength: 10000,
                cursorShow: false,
                cursorShowCell: true,
                statsShow: true,
                hudShow: true,
                wireframeShow: false,
                dayShow: false,
                skyboxShow: true,
                chartShow: true,
                guiShow: true,
                guiShowControls: true,
                guiShowAgentFolder: true,
                guiShowBuildingsFolder: true,
                guiShowRoadsFolder: true,
                guiShowTerrainFolder: true,
                guiShowDisplayFolder: true,
                guiShowColorFolder: true,
                pathsShow: true,
                terrainShow: true,
                coloriseAgentsByHealth: false,
                firstPersonView: false,
                cameraOverride: false,
                cameraX: 0,
                cameraY: 200,
                cameraZ: 800,
                maximiseView: true,
            };
            this.terrainOptions = {
                renderAsSphere: true,
                loadHeights: true,
                gridExtent: 8000,
                gridPoints: 400,
                maxTerrainHeight: 400,
                shaderUse: true,
                multiplier: 1,
                mapIndex: 0,
                patchSize: 4,
                defaultHeight: 4
            };
            this.colorOptions = {
                colorDayBackground: 0x000000,
                colorDayRoad: 0x474747,
                colorDayAgent: 0x4747b3,
                colorDayNetwork: 0x474747,
                colorDayTrail: 0x474747,
                colorDayPath: 0x474747,
                colorDayBuildingFill: 0xb1abab,
                colorDayBuildingLine: 0x222222,
                colorDayBuildingWindow: 0x222222,
                colorDayTerrainSea: 0x969696,
                colorDayTerrainLowland1: 0x2d5828,
                colorDayTerrainLowland2: 0x6d915b,
                colorDayTerrainMidland: 0x89450e,
                colorDayTerrainHighland: 0x8c8c8c,
                // colorDayTerrainLowland1: 0x4d7848,
                // colorDayTerrainLowland2: 0x8db17b,
                // colorDayTerrainMidland: 0xa9752e,
                // colorDayTerrainHighland: 0xacacac,

                colorNightBackground: 0x636363,
                colorNightRoad: 0x474747,
                colorNightAgent: 0x47b347,
                colorNightNetwork: 0x47b347,
                colorNightTrail: 0x47b347,
                colorNightNetworPath: 0x47b347,
                colorNightTrail: 0x47b347,
                colorNightPath: 0x47b347,
                colorNightBuildingFill: 0x838383,
                colorNightBuildingLine: 0x838383,
                colorNightBuildingWindow: 0xffff8f,
                colorNightTerrainSea: 0x000000,
                colorNightTerrainLowland1: 0x000000,
                colorNightTerrainLowland2: 0x181818,
                colorNightTerrainMidland: 0x282828,
                colorNightTerrainHighland: 0x4c4c4c,
                colorGraphPopulation: 0x4747b3,
                colorGraphHealth: 0xb34747,
                colorGraphPatchValues: 0x47b347,

                colorLightHemisphereSky: 0xbfbfbf,
                colorLightHemisphereGround: 0xbfbfbf,
                colorLightHemisphereIntensity: 1.0,
                colorLightDirectional: 0xffffff,
                colorLightDirectionalIntensity: 0.5,
            };
            this.buildingOptions.maxHeight = (this.buildingOptions.minHeight > this.buildingOptions.maxHeight) ? this.buildingOptions.minHeight : this.buildingOptions.maxHeight;
            this.buildingOptions.maxWidth = (this.buildingOptions.minWidth > this.buildingOptions.maxWidth) ? this.buildingOptions.minWidth : this.buildingOptions.maxWidth;
            this.buildingOptions.maxLength = (this.buildingOptions.minLength > this.buildingOptions.maxLength) ? this.buildingOptions.minLength : this.buildingOptions.maxLength;
            this.buildingOptions.maxLevels = this.buildingOptions.minHeight + Math.floor(Math.random() * this.buildingOptions.maxHeight - this.buildingOptions.minHeight);
            this.buildingOptions.width = this.buildingOptions.minWidth + Math.floor(Math.random() * this.buildingOptions.maxWidth - this.buildingOptions.minWidth);
            this.buildingOptions.length = this.buildingOptions.minLength + Math.floor(Math.random() * this.buildingOptions.maxLength - this.buildingOptions.minLength);
            this.sunOptions  = {
                turbidity: 10,
                reileigh: 2,
                mieCoefficient: 0.005,
                mieDirectionalG: 0.8,
                luminance: 1,
                inclination: 0.49, // elevation / inclination
                azimuth: 0.25, // Facing front,
                sun: !true
            };

            /**
             * Resets the state of the fp object.
             */
            this.Reset = function() {
                // First coerce grid points to some multiple of patchSize, + 1
                fp.scene.remove(  fp.agentNetwork.particles  );
                fp.agentNetwork.agents = [];
                fp.agentNetwork.agentParticleSystemAttributes = null;
                fp.buildingNetwork.networkJstsCache = [];
                fp.buildingNetwork.buildings = [];
                fp.buildingNetwork.buildingHash = {};
                fp.roadNetwork.indexValues = [];
                fp.roadNetwork.roads = {};

                fp.timescale.currentYear = fp.timescale.initialYear;
                fp.updateYear();
                fp.timescale.frameCounter = 0;
                if ( fp.trailNetwork.trailMeshes )
                    fp.trailNetwork.trailMeshes.forEach(function(trail) { scene.remove(trail); });

                var len = fp.terrain.plane.geometry.attributes.position.array.length / 3,
                    trailPoints = new Float32Array(len),
                    patchPoints = new Float32Array(len);
                for (var i = 0; i < len; i++) {
                    trailPoints[i] = 0;
                    patchPoints[i] = 0;
                }
                fp.terrain.plane.geometry.addAttribute( "trail", new THREE.BufferAttribute( trailPoints, 1 ) );
                fp.terrain.plane.geometry.addAttribute( "patch", new THREE.BufferAttribute( patchPoints, 1 ) );
                fp.terrain.plane.geometry.attributes.trail.needsUpdate = true;
                fp.terrain.plane.geometry.attributes.patch.needsUpdate = true;

                fp.trailNetwork.trails = {};
                fp.agentNetwork.networks.forEach( function( network ) {
                    network.links = [];
                    fp.scene.remove( network.networkMesh );
                });
                fp.scene.remove( fp.buildingNetwork.networkMesh );
                fp.scene.remove( fp.roadNetwork.networkMesh );
                fp.scene.remove( fp.pathNetwork.networkMesh );
                fp.scene.remove( fp.trailNetwork.globalTrailLine );
                fp.patchNetwork.initialisePatches();
            };

            /**
             * Sets up the simulation.
             */
            this.Setup = function() {
                fp.appConfig.Reset();
                fp.agentNetwork.createInitialAgentPopulation();
                if ( fp.appConfig.displayOptions.agentsShow )
                    fp.scene.add( fp.agentNetwork.particles );

                fp.buildingNetwork.networkMesh = new THREE.Object3D();
                if ( fp.appConfig.displayOptions.buildingsShow )
                    fp.scene.add( fp.buildingNetwork.networkMesh );

                fp.roadNetwork.networkMesh = new THREE.Object3D();
                fp.roadNetwork.planeVertices = [];
                if ( fp.appConfig.displayOptions.roadsShow )
                    fp.scene.add( fp.roadNetwork.networkMesh );

                fp.pathNetwork.networkMesh = new THREE.Object3D();
                if ( fp.appConfig.displayOptions.pathsShow )
                    fp.scene.add( fp.pathNetwork.networkMesh );

                fp.trailNetwork.buildTrailNetwork( false );
                /*
                fp.trailNetwork.globalTrailGeometry = new THREE.Geometry();
                for (var i = 0; i < fp.appConfig.agentOptions.initialPopulation; i++) {
                    var vertices = new Array( fp.appConfig.displayOptions.trailLength );
                    for (var j = 0; j < fp.appConfig.displayOptions.trailLength ; j++) {
                        fp.trailNetwork.globalTrailGeometry.vertices.push( fp.agentNetwork.agents[i].lastPosition );
                    }
                    var ai = fp.getIndex( fp.agentNetwork.agents[i].lastPosition.x / fp.appConfig.terrainOptions.multiplier, fp.agentNetwork.agents[i].lastPosition.z / fp.appConfig.terrainOptions.multiplier);
                    if (ai > -1)
                        fp.trailNetwork.trails[ai] = 1;
                }
                var trailMaterial = new THREE.LineBasicMaterial({
                    color: fp.appConfig.colorOptions.colorNightTrail,
                var trailMaterial = new THREE.LineBasicMPath({
                    color: fp.appConfig.colorOptions.colorNightTrail,
                    linewidth: 0.1,
                    opacity: 0.1,
                    blending: THREE.NormalBlending,
                    transparent: true
                });
                fp.trailNetwork.globalTrailLine = new THREE.Line( fp.trailNetwork.globalTrailGeometry, trailMaterial, THREE.LinePieces );
                if ( fp.appConfig.displayOptions.trailsShowAsLines ) {
                    fp.scene.add( fp.trailNetwork.globalTrailLine );
                }
                */

                fp.sim.setup.call( fp.sim ); // Get around binding problem - see: http://alistapart.com/article/getoutbindingsituations
            };

            this.Run = function() {
                fp.AppState.runSimulation = !fp.AppState.runSimulation;
                fp.AppState.stepSimulation = false;
                if ( !_.isUndefined( fp.chart ) ) {
                    if ( fp.AppState.runSimulation)
                        fp.chart.start();
                    else
                        fp.chart.stop();
                }
            };

            this.Step = function() {
                fp.AppState.runSimulation = fp.AppState.stepSimulation = true;
            };

            /**
             * Increase the frame rate relative to the timescale interval.
             */
            this.SpeedUp = function() {
                if ( fp.timescale.framesToYear > fp.timescale.MIN_FRAMES_TO_YEAR)
                    fp.timescale.framesToYear = Math.ceil( fp.timescale.framesToYear / 2);
                console.log( "Speed: " + fp.timescale.framesToYear );
            };

            /**
             * Decrease the frame rate relative to the timescale interval.
             */
            this.SlowDown = function() {
                if ( fp.timescale.framesToYear < fp.timescale.MAX_FRAMES_TO_YEAR)
                    fp.timescale.framesToYear *= 2;
                console.log( "Speed: " + fp.timescale.framesToYear );
            };

            this.Snapshot = function() {
                var mimetype = mimetype  || "image/png";
                var url = fp.renderer.domElement.toDataURL(mimetype);
                window.open(url, "name-" + Math.random());
            };
            this.FullScreen = function() {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                } else if (document.documentElement.mozRequestFullScreen) {
                    document.documentElement.mozRequestFullScreen();
                } else if (document.documentElement.webkitRequestFullscreen) {
                    document.documentElement.webkitRequestFullscreen();
                } else if (document.documentElement.msRequestFullscreen) {
                    document.documentElement.msRequestFullscreen();
                }
            };
            this.SwitchTerrain = function() {
                fp.appConfig.Reset();
                fp.terrain.terrainMapIndex =
                    ( fp.terrain.terrainMapIndex == fp.TERRAIN_MAPS.length - 1 ) ?
                      0 :
                      fp.terrain.terrainMapIndex + 1;
                fp.loadTerrain();
            };
            this.WrapTerrain = function() {
                fp.appConfig.waterShow = false;
                fp.terrain.wrappingState = 1;
            };
            this.UnwrapTerrain = function() {
                fp.terrain.wrappingState = -1;
            };
        };

        /**
         * Singleton Chart object.
         * @type {Object}
         */
        this.Chart = {
            setupChart: function () {
                var agentDiv = fp.appConfig.agentOptions.initialPopulation * 2;
                fp.chart = new SmoothieChart( { maxValue: agentDiv, minValue: 0.0  } );
                var agentPopulationSeries = new TimeSeries();
                var agentHealthSeries = new TimeSeries();
                var patchValuesSeries = new TimeSeries();
                setInterval(function() {
                    if ( fp.AppState.runSimulation) {
                        agentPopulationSeries.append( new Date().getTime(), fp.agentNetwork.agents.length );
                        agentHealthSeries.append( new Date().getTime(), agentDiv * jStat( _.map( fp.agentNetwork.agents, function(agent) { return agent.health; } ) ).mean() / 100 );
                        patchValuesSeries.append( new Date().getTime(), agentDiv * fp.patchNetwork.patchMeanValue );
                    }
                }, 500);
                var chartCanvas = document.createElement("canvas");
                chartCanvas.setAttribute("id", "chartCanvas-" + fp.container.id);
                chartCanvas.setAttribute("width", "400");
                chartCanvas.setAttribute("height", "100");
                chartCanvas.setAttribute("style", "z-index: 1; position: absolute; left: 0px; bottom: 0px  ");
                fp.container.insertBefore(chartCanvas, fp.container.firstChild);
                fp.chart.addTimeSeries( agentPopulationSeries, { fillStyle: "rgba(0, 0, 255, 0.2)", lineWidth: 4 } );
                fp.chart.addTimeSeries( agentHealthSeries, { fillStyle: "rgba(255, 0, 0, 0.2)", lineWidth: 4 } );
                fp.chart.addTimeSeries( patchValuesSeries, { fillStyle: "rgba(0, 255, 0, 0.2)", lineWidth: 4 } );
                fp.updateChartColors();
                fp.chart.streamTo(chartCanvas, 500);
                this.updateGraph();
            },

            updateGraph: function() {
                $("#chartCanvas-" + fp.container.id).toggle( fp.appConfig.displayOptions.chartShow );
            }
        };

        /**
         * Creates a dat.GUI interface for controlling and configuring the simulation.
         * @param  {Object} config  An object representation of properties to override defaults for the fp.AppConfig object.
         */
        this.doGUI = function( config ) {
            fp.appConfig = new fp.AppConfig();

            fp.gui = new dat.GUI( { load: config } );

            fp.gui.remember( fp.appConfig );
            fp.gui.remember( fp.appConfig.agentOptions );
            fp.gui.remember( fp.appConfig.buildingOptions );
            fp.gui.remember( fp.appConfig.roadOptions );
            fp.gui.remember( fp.appConfig.displayOptions );
            fp.gui.remember( fp.appConfig.colorOptions );
            fp.gui.remember( fp.appConfig.terrainOptions );

            fp.gui.add( fp.appConfig, "Setup" );
            fp.gui.add( fp.appConfig, "Run" );
            fp.gui.add( fp.appConfig, "Step" );

            if ( fp.appConfig.displayOptions.guiShowControls ) {
                var controlPanel = fp.gui.addFolder("More controls");
                controlPanel.add( fp.appConfig, "SpeedUp" );
                controlPanel.add( fp.appConfig, "SlowDown" );
                controlPanel.add( fp.appConfig, "Snapshot" );
                controlPanel.add( fp.appConfig, "FullScreen" );
                controlPanel.add( fp.appConfig, "SwitchTerrain" );
                controlPanel.add( fp.appConfig, "WrapTerrain" );
                controlPanel.add( fp.appConfig, "UnwrapTerrain" );
            }

            if ( fp.appConfig.displayOptions.guiShowAgentFolder ) {
                var agentsFolder = fp.gui.addFolder("Agent Options");
                agentsFolder.add( fp.appConfig.agentOptions, "initialPopulation", 0, 10000 ).step( 1 );
                agentsFolder.add( fp.appConfig.agentOptions, "initialExtent", 1, 100 ).step( 1 );
                agentsFolder.add( fp.appConfig.agentOptions, "maxExtent", 1, 100 ).step( 1 );
                agentsFolder.add( fp.appConfig.agentOptions, "initialX",  0, 100 ).step( 1 );
                agentsFolder.add( fp.appConfig.agentOptions, "initialY",  0, 100 ).step( 1 );
                agentsFolder.add( fp.appConfig.agentOptions, "randomAge" );
                agentsFolder.add( fp.appConfig.agentOptions, "chanceToJoinNetwork", 0.0, 1.0).step( 0.01 );
                agentsFolder.add( fp.appConfig.agentOptions, "chanceToJoinNetworkWithHome", 0.0, 1.0).step( 0.01 );
                agentsFolder.add( fp.appConfig.agentOptions, "chanceToJoinNetworkWithBothHomes", 0.0, 1.0).step( 0.01 );
                agentsFolder.add( fp.appConfig.agentOptions, "chanceToFindPathToHome", 0.0, 1.0).step( 0.01 );
                agentsFolder.add( fp.appConfig.agentOptions, "chanceToFindPathToOtherAgentHome", 0.0, 1.0).step( 0.01 );
                agentsFolder.add( fp.appConfig.agentOptions, "initialCircle" );
                agentsFolder.add( fp.appConfig.agentOptions, "noWater" );
                agentsFolder.add( fp.appConfig.agentOptions, "noUphill" );
                agentsFolder.add( fp.appConfig.agentOptions, "useStickman" );
                agentsFolder.add( fp.appConfig.agentOptions, "visitHomeBuilding", 0.0, 1.0).step(0.001 );
                agentsFolder.add( fp.appConfig.agentOptions, "visitOtherBuilding", 0.0, 1.0).step(0.001 );
                agentsFolder.add( fp.appConfig.agentOptions, "establishLinks");
                agentsFolder.add( fp.appConfig.agentOptions, "shuffle" );
                agentsFolder.add( fp.appConfig.agentOptions, "size", 10, 1000  ).step( 10 );
                agentsFolder.add( fp.appConfig.agentOptions, "movementInPatch", 1, 100  ).step( 1 );
                agentsFolder.add( fp.appConfig.agentOptions, "movementRandom" );
                agentsFolder.add( fp.appConfig.agentOptions, "initialSpeed", 1, 10).step( 1 );
                agentsFolder.add( fp.appConfig.agentOptions, "initialPerturbBy", 0, 1).step( 0.05 );
            }

            if ( fp.appConfig.displayOptions.guiShowBuildingsFolder ) {
                var buildingsFolder = fp.gui.addFolder("Building Options");
                buildingsFolder.add( fp.appConfig.buildingOptions, "create" );
                buildingsFolder.add( fp.appConfig.buildingOptions, "maxNumber", 1, 100).step(1 );
                buildingsFolder.add( fp.appConfig.buildingOptions, "detectBuildingCollisions" );
                buildingsFolder.add( fp.appConfig.buildingOptions, "detectRoadCollisions" );
                var forms = buildingsFolder.addFolder("Form");
                forms.add( fp.appConfig.buildingOptions, "buildingForm", fp.BUILDING_FORMS.names );
                forms.add( fp.appConfig.buildingOptions, "spread", 1, 100).step(1 );
                forms.add( fp.appConfig.buildingOptions, "randomForm" );
                forms.add( fp.appConfig.buildingOptions, "rotateRandomly" );
                forms.add( fp.appConfig.buildingOptions, "rotateSetAngle", 0, 360).step(1 );
                var dimensions = buildingsFolder.addFolder("Dimensions");
                dimensions.add( fp.appConfig.buildingOptions, "minHeight", 1, 100).step(1 );
                dimensions.add( fp.appConfig.buildingOptions, "maxHeight", 2, 200).step(1 );
                dimensions.add( fp.appConfig.buildingOptions, "heightA", 0.1, 10.0).step(0.1 );
                dimensions.add( fp.appConfig.buildingOptions, "heightB", 1, 100).step(1 );
                dimensions.add( fp.appConfig.buildingOptions, "riseRate", 1, 100).step(1 );
                dimensions.add( fp.appConfig.buildingOptions, "levelHeight", 10, 100).step(1 );
                dimensions.add( fp.appConfig.buildingOptions, "minWidth", 1, 200).step(1 );
                dimensions.add( fp.appConfig.buildingOptions, "maxWidth", 41, 400).step(1 );
                dimensions.add( fp.appConfig.buildingOptions, "minLength", 1, 200).step(1 );
                dimensions.add( fp.appConfig.buildingOptions, "maxLength", 41, 400).step(1 );
                var influences = buildingsFolder.addFolder("Influences");
                influences.add( fp.appConfig.buildingOptions, "roads", 0.0, 1.0).step(0.1 );
                influences.add( fp.appConfig.buildingOptions, "water", 0.0, 1.0).step(0.1 );
                influences.add( fp.appConfig.buildingOptions, "otherBuildings", 0.0, 1.0).step(0.1 );
                influences.add( fp.appConfig.buildingOptions, "distanceFromOtherBuildingsMin", 0, 10000).step( 100 );
                influences.add( fp.appConfig.buildingOptions, "distanceFromOtherBuildingsMax", 0, 10000).step( 100 );
                influences.add( fp.appConfig.buildingOptions, "buildingHeight", 0.0, 1.0).step(0.1 );
                var view = buildingsFolder.addFolder("Appearance");
                view.add( fp.appConfig.buildingOptions, "useShader" );
                view.add( fp.appConfig.buildingOptions, "useLevelOfDetail" );
                view.add( fp.appConfig.buildingOptions, "lowResDistance", 2000, 20000).step(1000 );
                view.add( fp.appConfig.buildingOptions, "highResDistance", 100, 2000).step(100 );
                view.add( fp.appConfig.buildingOptions, "opacity", 0.0, 1.0).step(0.01 );
                var fill = view.addFolder("Fill");
                fill.add( fp.appConfig.buildingOptions, "showFill" );
                fill.add( fp.appConfig.buildingOptions, "fillRooves" );
                var line = view.addFolder("Line");
                line.add( fp.appConfig.buildingOptions, "showLines" );
                line.add( fp.appConfig.buildingOptions, "linewidth", 0.1, 8).step(0.1 );
                var windows = view.addFolder("Window");
                var showWindowsOptions = windows.add( fp.appConfig.buildingOptions, "showWindows" );
                showWindowsOptions.onChange(function(value) {
                    fp.buildingNetwork.buildings.forEach(function(b) {
                        b.uniforms.showWindows.value = value ? 1 : 0;
                    });
                });
                windows.add( fp.appConfig.buildingOptions, "windowsRandomise" );
                windows.add( fp.appConfig.buildingOptions, "windowsFlickerRate", 0, 1).step( 0.01 );
                windows.add( fp.appConfig.buildingOptions, "windowWidth", 1, 100).step(1 );
                windows.add( fp.appConfig.buildingOptions, "windowPercent", 1, 100).step(1 );
                windows.add( fp.appConfig.buildingOptions, "windowsStartY", 1, 100).step(1 );
                windows.add( fp.appConfig.buildingOptions, "windowsEndY", 1, 100).step(1 );
                var stagger = buildingsFolder.addFolder("Stagger");
                stagger.add( fp.appConfig.buildingOptions, "stagger" );
                stagger.add( fp.appConfig.buildingOptions, "staggerAmount", 1, 100 );
                var taper = buildingsFolder.addFolder("Taper");
                taper.add( fp.appConfig.buildingOptions, "taper" );
                taper.add( fp.appConfig.buildingOptions, "taperExponent", 1, 10).step(1 );
                taper.add( fp.appConfig.buildingOptions, "taperDistribution", 0.1, 5 );
                var animation = buildingsFolder.addFolder("Animation");
                animation.add( fp.appConfig.buildingOptions, "destroyOnComplete" );
                animation.add( fp.appConfig.buildingOptions, "loopCreateDestroy" );
                animation.add( fp.appConfig.buildingOptions, "turning" );
                animation.add( fp.appConfig.buildingOptions, "falling" );
            }

            if ( fp.appConfig.displayOptions.guiShowRoadsFolder ) {
                var roadsFolder = fp.gui.addFolder("Road Options");
                roadsFolder.add( fp.appConfig.roadOptions, "create" );
                roadsFolder.add( fp.appConfig.roadOptions, "maxNumber", 1, 100).step( 1 );
                roadsFolder.add( fp.appConfig.roadOptions, "roadWidth", 5, 50).step( 5 );
                roadsFolder.add( fp.appConfig.roadOptions, "roadDeviation", 0, 50).step( 1 );
                roadsFolder.add( fp.appConfig.roadOptions, "roadRadiusSegments", 2, 20).step( 1 );
                roadsFolder.add( fp.appConfig.roadOptions, "roadSegments", 1, 20).step( 1 );
                roadsFolder.add( fp.appConfig.roadOptions, "initialRadius", 0, 1000).step( 100 );
                roadsFolder.add( fp.appConfig.roadOptions, "probability", 50, 1000).step( 50 );
                roadsFolder.add( fp.appConfig.roadOptions, "lenMinimum", 0, 2000).step( 100 );
                roadsFolder.add( fp.appConfig.roadOptions, "lenMaximum", 100, 2000).step( 100 );
                roadsFolder.add( fp.appConfig.roadOptions, "lenDistributionFactor", 1, 10).step( 1 );
                roadsFolder.add( fp.appConfig.roadOptions, "overlapThreshold", 1, 100).step( 1 );
                roadsFolder.add( fp.appConfig.roadOptions, "flattenAdjustment", 0.025, 1.0).step( 0.025 );
                roadsFolder.add( fp.appConfig.roadOptions, "flattenLift", 0, 40).step( 1 );
            }

            if ( fp.appConfig.displayOptions.guiShowTerrainFolder ) {
                var terrainFolder = fp.gui.addFolder("Terrain Options");
                terrainFolder.add( fp.appConfig.terrainOptions, "loadHeights" ).onFinishChange( fp.loadTerrain );
                terrainFolder.add( fp.appConfig.terrainOptions, "gridExtent", 1000, 20000 ).step( 1000 ).onFinishChange( fp.loadTerrain );
                terrainFolder.add( fp.appConfig.terrainOptions, "gridPoints", 2, 2000 ).step( 100 ).onFinishChange( fp.loadTerrain );
                terrainFolder.add( fp.appConfig.terrainOptions, "maxTerrainHeight", 100, 2000 ).step( 100 ).onFinishChange( fp.loadTerrain );
                terrainFolder.add( fp.appConfig.terrainOptions, "shaderUse" ).onFinishChange( fp.loadTerrain );
                terrainFolder.add( fp.appConfig.terrainOptions, "multiplier", 0.1, 10 ).step(0.1 ).onFinishChange( fp.loadTerrain );
                terrainFolder.add( fp.appConfig.terrainOptions, "mapIndex", 0, 1 ).step(1 ).onFinishChange( fp.loadTerrain );
                terrainFolder.add( fp.appConfig.terrainOptions, "patchSize", 1, 100 ).step(1 ).onFinishChange( fp.loadTerrain );
            }

            if ( fp.appConfig.displayOptions.guiShowDisplayFolder ) {
                var displayFolder = fp.gui.addFolder("Display Options");
                displayFolder.add( fp.appConfig.displayOptions, "agentsShow").onFinishChange( fp.toggleAgentState );
                displayFolder.add( fp.appConfig.displayOptions, "buildingsShow").onFinishChange( fp.toggleBuildingState );
                displayFolder.add( fp.appConfig.displayOptions, "roadsShow").onFinishChange( fp.toggleRoadState );
                displayFolder.add( fp.appConfig.displayOptions, "waterShow").onFinishChange( fp.toggleWaterState );
                displayFolder.add( fp.appConfig.displayOptions, "networkShow").onFinishChange( fp.toggleAgentNetwork );
                displayFolder.add( fp.appConfig.displayOptions, "networkCurve" );
                displayFolder.add( fp.appConfig.displayOptions, "networkCurvePoints", 4, 20).step( 1 );
                displayFolder.add( fp.appConfig.displayOptions, "patchesUpdate" );
                displayFolder.add( fp.appConfig.displayOptions, "patchesShow").onFinishChange( fp.togglePatchesState );
                displayFolder.add( fp.appConfig.displayOptions, "patchesUseShader" );
                displayFolder.add( fp.appConfig.displayOptions, "trailsShow").onFinishChange( fp.toggleTrailState );
                displayFolder.add( fp.appConfig.displayOptions, "trailsShowAsLines").onFinishChange( fp.toggleTrailState );
                displayFolder.add( fp.appConfig.displayOptions, "trailLength", 1, 10000).step( 1 );
                displayFolder.add( fp.appConfig.displayOptions, "cursorShow").onFinishChange( fp.removeCursor );
                displayFolder.add( fp.appConfig.displayOptions, "statsShow").onFinishChange( fp.toggleStatsState );
                displayFolder.add( fp.appConfig.displayOptions, "hudShow").onFinishChange( fp.toggleHUDState );
                displayFolder.add( fp.appConfig.displayOptions, "wireframeShow").onFinishChange( fp.toggleWireframeState );
                displayFolder.add( fp.appConfig.displayOptions, "dayShow").onFinishChange( fp.toggleDayNight );
                displayFolder.add( fp.appConfig.displayOptions, "skyboxShow").onFinishChange( fp.toggleDayNight );
                displayFolder.add( fp.appConfig.displayOptions, "chartShow").onFinishChange( fp.updateGraph );
                displayFolder.add( fp.appConfig.displayOptions, "pathsShow").onFinishChange( fp.togglePathsState );
                displayFolder.add( fp.appConfig.displayOptions, "terrainShow").onFinishChange( fp.toggleTerrainPlane );
                displayFolder.add( fp.appConfig.displayOptions, "coloriseAgentsByHealth" );
                displayFolder.add( fp.appConfig.displayOptions, "firstPersonView").onFinishChange( fp.resetControls );
                displayFolder.add( fp.appConfig.displayOptions, "cameraOverride").onFinishChange( fp.resetControls );
                displayFolder.add( fp.appConfig.displayOptions, "cameraX", 0, 5000).onFinishChange( fp.resetControls );
                displayFolder.add( fp.appConfig.displayOptions, "cameraY", 0, 5000).onFinishChange( fp.resetControls );
                displayFolder.add( fp.appConfig.displayOptions, "cameraZ", 0, 5000).onFinishChange( fp.resetControls );
                displayFolder.add( fp.appConfig.displayOptions, "maximiseView");
                displayFolder.add( fp.appConfig.displayOptions, "guiShow");
                var folders = displayFolder.addFolder("Folder Options");
                folders.add( fp.appConfig.displayOptions, "guiShowControls");
                folders.add( fp.appConfig.displayOptions, "guiShowAgentFolder");
                folders.add( fp.appConfig.displayOptions, "guiShowBuildingsFolder");
                folders.add( fp.appConfig.displayOptions, "guiShowRoadsFolder");
                folders.add( fp.appConfig.displayOptions, "guiShowTerrainFolder");
                folders.add( fp.appConfig.displayOptions, "guiShowDisplayFolder");
                folders.add( fp.appConfig.displayOptions, "guiShowColorFolder");
            }

            if ( fp.appConfig.displayOptions.guiShowColorFolder ) {
                var colorFolder = fp.gui.addFolder("Color Options");
                var colorTerrainFolder = colorFolder.addFolder("Terrain Colors");
                colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorDayTerrainSea").onChange( fp.loadTerrain );
                colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorNightTerrainSea").onChange( fp.loadTerrain );
                colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorDayTerrainLowland1").onChange( fp.loadTerrain );
                colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorNightTerrainLowland1").onChange( fp.loadTerrain );
                colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorDayTerrainLowland2").onChange( fp.loadTerrain );
                colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorNightTerrainLowland2").onChange( fp.loadTerrain );
                colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorDayTerrainMidland").onChange( fp.loadTerrain );
                colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorNightTerrainMidland").onChange( fp.loadTerrain );
                colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorDayTerrainHighland").onChange( fp.loadTerrain );
                colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorNightTerrainHighland").onChange( fp.loadTerrain );
                var colorBuildingFolder = colorFolder.addFolder("Building Colors");
                colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorDayBuildingFill" );
                colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorNightBuildingFill" );
                colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorDayBuildingLine" );
                colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorNightBuildingLine" );
                colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorDayBuildingWindow" );
                colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorNightBuildingWindow" );
                var colorGraphFolder = colorFolder.addFolder("Graph Colors");
                colorGraphFolder.addColor( fp.appConfig.colorOptions, "colorGraphPopulation").onChange( fp.updateChartColors );
                colorGraphFolder.addColor( fp.appConfig.colorOptions, "colorGraphHealth").onChange( fp.updateChartColors );
                colorGraphFolder.addColor( fp.appConfig.colorOptions, "colorGraphPatchValues").onChange( fp.updateChartColors );
                var colorLightingFolder = colorFolder.addFolder("Lighting Colors");
                colorLightingFolder.addColor( fp.appConfig.colorOptions, "colorLightHemisphereSky").onChange( fp.updateLighting );
                colorLightingFolder.addColor( fp.appConfig.colorOptions, "colorLightHemisphereGround").onChange( fp.updateLighting );
                colorLightingFolder.add( fp.appConfig.colorOptions, "colorLightHemisphereIntensity", 0, 1).step( 0.01 ).onChange( fp.updateLighting );
                colorLightingFolder.addColor( fp.appConfig.colorOptions, "colorLightDirectional").onChange( fp.updateLighting );
                colorLightingFolder.add( fp.appConfig.colorOptions, "colorLightDirectionalIntensity", 0, 1).step( 0.01 ).onChange( fp.updateLighting );
                var colorOtherFolder = colorFolder.addFolder("Other Colors");
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorDayBackground" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorNightBackground" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorDayRoad" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorNightRoad" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorDayAgent" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorNightAgent" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorDayNetwork" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorNightNetwork" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorDayNetwork" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorNightNetwork" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorDayTrail" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorNightTrail" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorDayPath" );
                colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorNightPath" );
            }

            // Need to create the GUI to seed the parameters first.
            if ( !fp.appConfig.displayOptions.guiShow ) {
                fp.gui.destroy();
                return;
            }
        };

        /**
         * Generates a THREE.Vector3 object containing RGB values from either
         * a number or string color representation
         * @param  {string/number} color the color to convert
         * @return {THREE.Vector3}       [description]
         */
        this.buildColorVector = function(color) {
            var bc, r, g, b;
            if (!isNaN(parseInt(color))) {
                b = color % 256;
                g = ( (color - b) / 256 ) % 256;
                r = ( (color - (g * 256) - b) / (256 * 256) ) % 256;
            }
            else {
                bc = parseCSSColor(color);
                r = bc[0];
                g = bc[1];
                b = bc[2];
            }
            return new THREE.Vector3( r / 255.0, g / 255.0, b / 255.0 );
        };

        this.buildColorInteger = function(r, g, b) {
            return r * 256 * 256 + g * 256 + b;
        };

        this.getOffset = function(currentLevel, len) {
            var initOffset = (currentLevel > 0) ? len * 2 : 0;
            var offset = initOffset + (currentLevel) * len * 4;
            return offset;
        };

        /**
         * Resizes the renderer and camera aspect.
         */
        this.onWindowResize = function() {
            if ( fp.appConfig.displayOptions.maximiseView ) {
                fp.camera.aspect = window.innerWidth / window.innerHeight;
                fp.camera.updateProjectionMatrix();
                fp.renderer.setSize( window.innerWidth, window.innerHeight );
            }
            else {
                var width = $("#container1").width(), height = $("#container1").height();
                fp.camera.aspect = width / height;
                fp.camera.updateProjectionMatrix();
                fp.renderer.setSize( width, height );
            }
        };

        this.updateChartColors = function() {
            var colorPop = "#" + new THREE.Color( fp.appConfig.colorOptions.colorGraphPopulation ).getHexString(),
                colorHealth = "#" + new THREE.Color( fp.appConfig.colorOptions.colorGraphHealth ).getHexString(),
                colorPatches = "#" + new THREE.Color( fp.appConfig.colorOptions.colorGraphPatchValues ).getHexString();
            _.extend( fp.chart.seriesSet[0].options, { strokeStyle: colorPop } );
            _.extend( fp.chart.seriesSet[1].options, { strokeStyle: colorHealth } );
            _.extend( fp.chart.seriesSet[2].options, { strokeStyle: colorPatches } );
        };

        this.mostVisited = function() {
            return _.chain(trailNetwork.trails).pairs().sortBy(function(a) {return a[1];} ).last(100).value();
        };

        this.vertexCount = function(obj) {
            var count = 0;
            if ( !_.isUndefined(obj.geometry) ) {
                if ( !_.isUndefined(obj.geometry.vertices) )
                    count += obj.geometry.vertices.length;
                else if ( !_.isUndefined(obj.geometry.attributes.position) )
                    count += obj.geometry.attributes.position.array.length / 3;
            }
            if ( !_.isUndefined(obj.children) ) {
                obj.children.forEach( function(child) {
                    count += this.vertexCount(child);
                });
            }
            return count;
        };

        /**
         * Sets up the basic sim objects
         */
        this.setupSimObjects = function() {
            // Set up root objects
            fp.terrain = new fp.Terrain();
            fp.terrain.gridExtent = fp.appConfig.terrainOptions.gridExtent;

            fp.agentNetwork = new fp.AgentNetwork();
            fp.buildingNetwork = new fp.BuildingNetwork();
            fp.roadNetwork = new fp.RoadNetwork();
            fp.pathNetwork = new fp.PathNetwork();
            fp.trailNetwork = new fp.TrailNetwork();
            fp.patchNetwork = new fp.PatchNetwork();
            fp.timescale = new fp.Timescale();
            fp.cursor = new fp.Cursor();
        };

        /**
         * Sets up the THREE.js camera.
         */
        this.setupCamera = function() {
            fp.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000000 );
            if ( fp.appConfig.displayOptions.cameraOverride ) {
                fp.camera.position.x = fp.appConfig.displayOptions.cameraX;
                fp.camera.position.y = fp.appConfig.displayOptions.cameraY;
                fp.camera.position.z = fp.appConfig.displayOptions.cameraZ;
            }
            else if ( fp.appConfig.displayOptions.firstPersonView ) {
                fp.camera.position.x = 0;
                fp.camera.position.y = 50 * fp.appConfig.terrainOptions.multiplier;
                fp.camera.position.z = 0;
            }
            else {
                fp.camera.position.x = 0;
                fp.camera.position.y = 200 * fp.appConfig.terrainOptions.multiplier;
                fp.camera.position.z = 800 * fp.appConfig.terrainOptions.multiplier;
            }
        };

        /**
         * Sets up the controls.
         * @memberof fp
         */
        this.setupControls = function() {
            if ( fp.appConfig.displayOptions.firstPersonView ) {
                fp.controls = new THREE.PointerLockControls( fp.camera );
                fp.scene.add( fp.controls.getObject() );
                fp.controls.enabled = true;
                fp.container.requestPointerLock();
            }
            else {
                fp.controls = new THREE.TrackballControls( fp.camera, fp.container );
                // Works better - but has no rotation?
                // controls = new THREE.OrbitControls( fp.camera, fp.container );
                fp.controls.rotateSpeed = 0.15;
                fp.controls.zoomSpeed = 0.6;
                fp.controls.panSpeed = 0.3;

                fp.controls.noRotate = false;
                fp.controls.noZoom = false;
                fp.controls.noPan = false;
                fp.controls.noRoll = true;
                fp.controls.minDistance = 250.0;
                fp.controls.maxDistance = 10000.0;
            }
        };

        /**
         * Resets the state of the camera, controls and water object.
         * @memberof fp
         */
        this.resetControls = function() {
            fp.setupCamera();
            fp.setupControls();
            fp.setupWater();
        };


        /**
         * Sets up the THREE.js renderer.
         * @memberof fp
         */
        this.setupRenderer = function() {
            fp.renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: true,
                preserveDrawingBuffer: true  // to allow screenshot
            });
            fp.renderer.gammaInput = true;
            fp.renderer.gammaOutput = true;

            fp.renderer.shadowMapEnabled = true;
            fp.renderer.shadowMapType = THREE.PCFSoftShadowMap;
            fp.renderer.shadowMapCullFace = THREE.CullFaceBack;

            fp.renderer.setClearColor( fp.appConfig.colorOptions.colorNightBackground, 1);
            fp.onWindowResize();
            fp.container.appendChild( fp.renderer.domElement );
            fp.renderer.domElement.style.zIndex = 2;

            // We add the event listener to = function the domElement
            fp.renderer.domElement.addEventListener( "mousemove", fp.onMouseMove );
            fp.renderer.domElement.addEventListener( "mouseup", fp.onMouseUp );
        };

        /**
         * @memberof fp
         */
        this.setupLighting = function() {
            // Remove existing lights
            fp.scene.remove( fp.lightHemisphere );
            fp.scene.remove( fp.lightDirectional );

            fp.lightHemisphere = new THREE.HemisphereLight(
                new THREE.Color( fp.appConfig.colorOptions.colorLightHemisphereSky ),
                fp.appConfig.colorOptions.colorLightHemisphereGround,
                new THREE.Color( fp.appConfig.colorOptions.colorLightHemisphereIntensity )
            );
            // var fp.lightHemisphere = new THREE.HemisphereLight( 0xbfbfbf, 0xbfbfbf, 0.8 );
            // var fp.lightHemisphere = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
            // var fp.lightHemisphere = new THREE.HemisphereLight( 0xefeeb0, 0xefeeb0, 1.0 );
            fp.lightHemisphere.position.set( 0, 1000, 0 );
            // fp.scene.add( fp.lightHemisphere );

            fp.lightDirectional = new THREE.DirectionalLight(
                new THREE.Color( fp.appConfig.colorOptions.colorLightDirectional ),
                fp.appConfig.colorOptions.colorLightDirectionalIntensity
            );
            // var fp.lightDirectional = new THREE.DirectionalLight( 0x8f8f4f, 0.5 );
            fp.lightDirectional.position.set( 40000, 40000, 40000 );
            fp.lightDirectional.shadowDarkness = 0.25;
            fp.lightDirectional.castShadow = true;
            // these six values define the boundaries of the yellow box seen above
            fp.lightDirectional.shadowCameraNear = 250;
            fp.lightDirectional.shadowCameraFar = 80000;
            fp.lightDirectional.shadowMapWidth = 4096;
            fp.lightDirectional.shadowMapHeight = 4096;
            var d = 4000;
            fp.lightDirectional.shadowCameraLeft = -d;
            fp.lightDirectional.shadowCameraRight = d;
            fp.lightDirectional.shadowCameraTop = d;
            fp.lightDirectional.shadowCameraBottom = -d;
            fp.lightDirectional.shadowBias = -0.0001;
            //fp.lightDirectional.shadowCameraVisible = true; // for debugging
            fp.scene.add( fp.lightDirectional );
        };

        /**
         * @memberof fp
         */
        this.updateLighting = function() {
            if ( _.isNull( fp.lightHemisphere ) || _.isNull( fp.colorLightDirectional ) )
                return null;

            fp.lightHemisphere.color = new THREE.Color( fp.appConfig.colorOptions.colorLightHemisphereSky );
            fp.lightHemisphere.groundColor = new THREE.Color( fp.appConfig.colorOptions.colorLightHemisphereGround );
            fp.lightHemisphere.intensity = fp.appConfig.colorOptions.colorLightHemisphereIntensity;
            fp.lightDirectional.color = new THREE.Color( fp.appConfig.colorOptions.colorLightDirectional );
            fp.lightDirectional.intensity = fp.appConfig.colorOptions.colorLightDirectionalIntensity;
        };

        /**
         * @memberof fp
         */
        this.setupWater = function() {
            // Taken from Three.js examples, webgl_shaders_ocean.html
            var parameters = {
                width: 2000,
                height: 2000,
                widthSegments: 250,
                heightSegments: 250,
                depth: 1500,
                param: 4,
                filterparam: 1
            };
            var waterNormals = new THREE.ImageUtils.loadTexture( "/textures/waternormals.jpg" );
            waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
            fp.water = new THREE.Water( fp.renderer, fp.camera, fp.scene, {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: waterNormals,
                alpha:  1.0,
                //sunDirection: dirLight.position.normalize(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 50.0,
            } );
            if ( !_.isUndefined( fp.waterMesh ) )
                fp.scene.remove( fp.waterMesh );
            fp.waterMesh = new THREE.Mesh(
                new THREE.PlaneBufferGeometry( parameters.width * 500, parameters.height * 500, 50, 50 ),
                fp.water.material
            );
            fp.waterMesh.add( fp.water );
            fp.waterMesh.rotation.x = - Math.PI * 0.5;
            fp.waterMesh.position.y = 2;
            if ( fp.appConfig.displayOptions.waterShow )
                fp.scene.add( fp.waterMesh );
        };

        /**
         * @memberof fp
         */
        this.setupSky = function() {
            // load skybox
            var cubeMap = new THREE.CubeTexture( [] );
            cubeMap.format = THREE.RGBFormat;
            cubeMap.flipY = false;
            var loader = new THREE.ImageLoader();
            var skies = [   ["/textures/skyboxsun25degtest.png", 1024, 0],
                            ["/textures/skyboxsun5deg.png", 1024, 0],
                            ["/textures/skyboxsun5deg2.png", 1024, 0],
                            ["/textures/skyboxsun45deg.png", 1024, 0]
            ]; // Skies courtesy of http://reije081.home.xs4all.nl/skyboxes/
            var skyI = Math.floor(Math.random() * skies.length);
            loader.load( skies[skyI][0], function ( image ) {
                var getSide = function ( x, y ) {
                    var size = skies[skyI][1];
                    var canvas = document.createElement( "canvas" );
                    canvas.width = size;
                    canvas.height = size;

                    var context = canvas.getContext( "2d" );
                    context.drawImage( image, - x * size, - y * size );
                    return canvas;
                };
                cubeMap.images[ 0 ] = getSide( 2, 1 ); // px
                cubeMap.images[ 1 ] = getSide( 0, 1 ); // nx
                cubeMap.images[ 2 ] = getSide( 1, 0 ); // py
                cubeMap.images[ 3 ] = getSide( 1, 2 ); // ny
                cubeMap.images[ 4 ] = getSide( 1, 1 ); // pz
                cubeMap.images[ 5 ] = getSide( 3, 1 ); // nz
                cubeMap.needsUpdate = true;
            } );

            var cubeShader = THREE.ShaderLib["cube"];
            cubeShader.uniforms["tCube"].value = cubeMap;

            var skyBoxMaterial = new THREE.ShaderMaterial( {
                fragmentShader: cubeShader.fragmentShader,
                vertexShader: cubeShader.vertexShader,
                uniforms: cubeShader.uniforms,
                depthWrite: false,
                side: THREE.BackSide
            });
            fp.skyBox = new THREE.Mesh(
                new THREE.BoxGeometry( 1000000, 1000000, 1000000 ),
                skyBoxMaterial
            );
            fp.skyBox.position.set(0, skies[skyI][2], 0);
            if ( fp.appConfig.displayOptions.skyboxShow )
                fp.scene.add( fp.skyBox );
        };

        /**
         * @memberof fp
         */
        this.setOutputHUD = function() {
            $("#yearValue").html( fp.timescale.currentYear );
            $("#populationValue").html( fp.agentNetwork.agents.length );
        };

        /**
         * @memberof fp
         */
        this.setupGUI = function( config ) {
            if ( !_.isUndefined( config ) ) {
                fp.doGUI( config );
            }
            else if ( !_.isUndefined( $ ) && !_.isUndefined( $.urlParam ) ) {
                var recipe = $.urlParam("recipe"), recipeData = $.urlParam("recipeData");
                if ( !_.isUndefined( recipeData ) ) {
                    fp.doGUI( $.parseJSON( decodeURIComponent( recipeData ) ) );
                }
                else if ( !_.isUndefined( recipe ) ) {
                    $.getJSON("/recipes/" + recipe + ".json", function(data) {
                        fp.doGUI( data );
                    });
                }
                else
                    fp.doGUI();
            }
            else
                fp.doGUI();
        };

        /**
         * Initialises the simulation.
         * @memberof fp
         * @param  {Object}   config   An object containing overriden config parameters.
         * @param  {Object}   sim      An Object containing a setup() and a tick() function.
         * @param  {Function} callback Callback function to call at the end of initialisation.
         */
        this.init = function( config, sim, callback ) {
            fp.container = $( "#container" )[0] || config.container;
            fp.scene = new THREE.Scene();
            // fp.scene.add(new THREE.AxisHelper(100));
            // fp.scene.add(new THREE.GridHelper(100,10));
            fp.sim = sim || fp.simDefault();
            fp.setupGUI( config );
            fp.setupSimObjects();
            fp.setupCamera();
            fp.setupControls();
            fp.setupRenderer();
            fp.setupLighting();
            fp.setupWater();
            fp.setupSky();
            fp.setOutputHUD();
            fp.Chart.setupChart();
            fp.toggleStatsState(); // Add stats
            window.addEventListener( "resize", fp.onWindowResize, false );
            fp.loadTerrain( callback ); // Load the terrain asynchronously
            /*
            */
        };

        /**
         * The core simulation animation method.
         * @memberof fp
         */
        this.animate = function() {
            if ( fp.AppState.halt == true )
                return;
            // Must call this first!
            fp.patchNetwork.updatePatchAgents();
            if ( fp.AppState.runSimulation )
                fp.sim.tick.call( fp.sim ); // Get around binding problem - see: http://alistapart.com/article/getoutbindingsituations

            fp.agentNetwork.updateAgentNetwork();
            fp.buildingNetwork.updateBuildings();
            fp.patchNetwork.updatePatchValues();
            fp.trailNetwork.updateTrails();
            fp.terrain.updateTerrain();
            fp.pathNetwork.updatePath();
            fp.updateYear();
            fp.updateSimState();
            fp.updateGraph();
            fp.updateWater();

            fp.updateStats();
            fp.updateControls();
            fp.updateCamera();
            fp.updateKeyboard();
            requestAnimationFrame( fp.animate );
            fp.renderer.render( fp.scene, fp.camera );
        };

        /**
         * Factory method to generate a default sim object.
         * @memberof fp
         */
        this.simDefault = function() {
            return {
                counter: 0,
                setup: function() { /* console.log("Default sim set up"); */ },
                tick: function()  { /* console.log("Default sim tick: " + (++ this.counter)); */ }
            };
        };

        /**
         * Updates the simulation state.
         * @memberof fp
         */
        this.updateSimState = function() {
            if ( fp.AppState.stepSimulation )
                fp.AppState.runSimulation = false;
        };

        /**
         * Updates the water object, if it exists.
         * @memberof fp
         */
        this.updateWater = function() {
            if ( !_.isUndefined( fp.water ) && !_.isUndefined( fp.water.material.uniforms.time ) ) {
                fp.water.material.uniforms.time.value += 1.0 / 60.0;
                fp.water.render();
            }
        };

        /**
         * Updates the controls.
         * @memberof fp
         */
        this.updateControls = function() {
            if ( !fp.appConfig.displayOptions.cursorShow ) {
                fp.controls.update( fp.clock.getDelta() );

                if ( !_.isUndefined( fp.controls.getObject) ) {
                    var obj = fp.controls.getObject();
                    var height = fp.getHeight(obj.position.x, obj.position.z);
                    /*
                    if ( height < obj.position.y )
                        obj.position.y = obj.position.y - 1;
                    else if ( height > obj.position.y )
                        obj.position.y = obj.position.y + 1;
                    */
                    if (height != obj.position.y) {
                        obj.position.y = height;
                    }
                    //obj.translateY( fp.getHeight(obj.position.x, obj.position.z) );
                }
            }
        };

        /**
         * Adjusts the graph size if needed.
         * @memberof fp
         */
        this.updateGraph = function() {
            if ( fp.chart.options.maxValue <= fp.agentNetwork.agents.length )
                fp.chart.options.maxValue *= 2;
        };

        /**
         * Updates the stats widget.
         * @memberof fp
         */
        this.updateStats = function() {
            if ( fp.appConfig.displayOptions.statsShow )
                fp.stats.update();
        };

        /**
         * Updates the camera for the scene and its objects.
         * @memberof fp
         */
        this.updateCamera = function() {
            fp.scene.traverse( function(object) {
                if ( object instanceof THREE.LOD )
                    object.update( fp.camera );
            } );
            fp.scene.updateMatrixWorld();
        };

        /**
         * Ends the simulation.
         * @memberof fp
         */
        this.endSim = function() {
            fp.AppState.runSimulation = false;
            fp.appConfig.displayOptions.buildingsShow = false;
            fp.appConfig.displayOptions.patchesUpdate = false;
        };

        /**
         * Updates the year of the simulation.
         * @memberof fp
         */
        this.updateYear = function() {
            if ( !fp.AppState.runSimulation )
                return;
            fp.timescale.frameCounter++;
            if ( fp.timescale.frameCounter % fp.timescale.framesToYear === 0) {
                if ( !fp.timescale.terminate || fp.timescale.currentYear <  fp.timescale.endYear ) {
                    fp.timescale.currentYear++;
                    fp.setOutputHUD();
                }
                else
                    fp.endSim();
            }
        };

        /**
         * @memberof fp
         */
        this.getPatchIndex = function(x, y) {
            x = Math.floor( x / fp.appConfig.terrainOptions.multiplier );
            y = Math.floor( y / fp.appConfig.terrainOptions.multiplier );
            var dim = fp.terrain.gridPoints / fp.patchNetwork.patchSize;
            var halfGrid = fp.terrain.gridExtent / 2;
            var pX = Math.floor( dim * ( x + halfGrid ) / fp.terrain.gridExtent );
            var pY = Math.floor( dim * ( y + halfGrid ) / fp.terrain.gridExtent );
            var index = pY * dim + pX;
            index = ( index < 0 ) ? 0 : index;
            index = ( index >= fp.patchNetwork.patchValues.length ) ? fp.patchNetwork.patchValues.length - 1 : index;
            return index;
        };

        /**
         * Gets the terrain index point for a given (x, y) co-ordinate.
         * @memberof fp
         */
        this.getIndex = function( x, y ) {
            var multiplier = fp.appConfig.terrainOptions.multiplier;
            x = Math.floor( x / multiplier );
            y = Math.floor( y / multiplier );
            var maxExtent = ( fp.appConfig.agentOptions.maxExtent / 100 ) * fp.terrain.halfExtent;
            var xRel = Math.floor( x ) + fp.terrain.halfExtent;
            var yRel = Math.floor( y ) + fp.terrain.halfExtent;
            if ( xRel < fp.terrain.halfExtent - maxExtent || yRel < fp.terrain.halfExtent - maxExtent ||
                 xRel > fp.terrain.halfExtent + maxExtent || yRel > fp.terrain.halfExtent + maxExtent )
                return -1;
            var halfGrid = fp.terrain.gridExtent / 2;
            var gridRatio = fp.terrain.gridExtent / fp.terrain.gridPoints;
            // NOT SURE WHY THIS IS HERE?
            y += gridRatio / 2;
            //y = ( fp.terrain.gridPoints * fp.terrain.gridPoints) - y - 1;
            var xLoc = Math.floor( ( Math.round(x) + halfGrid ) / gridRatio );
            var yLoc = Math.floor( ( Math.round(y) + halfGrid ) / gridRatio );
            return Math.floor( fp.terrain.gridPoints * yLoc + xLoc );
        };

        /**
         * Gets the terrain height for a given (x, y) co-ordinate.
         * @memberof fp
         */
        this.getHeight = function( x, y ) {
            return fp.terrain.getHeightForIndex( fp.getIndex( x, y ) );
        };

        /**
         * @memberof fp
         */
        this.speedOfSim = function() {
            return true;
        };

        /**
         * @memberof fp
         */
        this.likelihoodOfGrowth = function() {
            return (1 - ( fp.buildingNetwork.speedOfConstruction * fp.speedOfSim()) );
        };

        /**
         * @memberof fp
         */
        this.checkProximityOfRoads = function( index ) {
            var cells = fp.surroundingCells( index );
            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                if ( fp.roadNetwork.indexValues.indexOf( fp.getIndex(cell.x, cell.y)) > -1)
                    return 1.0;
            }
            return 0.0;
        };

        /**
         * Count how many surrounding cells are also sea level
         * @memberof fp
         * @param  {Number} index
         * @return {Number}
         */
        this.checkProximityOfWater = function( index ) {
            // Now count how many surrounding are also sea level
            // We count in 8 directions, to maxDepth
            var seaLevelNeighbours = 0, totalNeighbours = 0;
            fp.surroundingCells( index ).forEach(function(cell) {
                if ( cell.z <= 0 )
                    seaLevelNeighbours++;
                totalNeighbours++;
            });
            return seaLevelNeighbours / totalNeighbours;
        };

        /**
         * Count how many surrounding cells are also buildings
         * @memberof fp
         * @param  {Number} index
         * @return {Number}
         */
        this.checkProximityOfBuildings = function( index, threshold ) {
            // Count number of positions
            var buildingNeighbours = 0, totalNeighbours = 0;
            var surroundingCells = fp.surroundingCells( index );
            surroundingCells.forEach( function( cell ) {
                if ( !_.isUndefined( fp.buildingNetwork.buildingHash[ fp.getIndex( cell.x, cell.y ) ] ) )
                    buildingNeighbours++;
                totalNeighbours++;
            } );
            var testValue = buildingNeighbours / totalNeighbours;
            var chance = Math.pow( testValue, Math.random() );
            // Return true if the probability is greater than 1 minus the target value
            return ( chance > ( 1 - threshold ) )
        };

        /**
         * Count how many surrounding cells are also buildings
         * @memberof fp
         * @param  {Number} index
         * @return {Number}
         */
        this.checkNearestNeighbour = function( index, min, max ) {
            // Get coordinates for index
            var coords = fp.terrain.getCoordinatesForIndex( index );
            if ( _.isNull( coords ) )
                return false;
            var x = coords[ 0 ], z = coords[ 1 ];
            // Get nearest neighbouring building
            var nnDistance = this.nearestNeighbouringBuildings( x, z );
            return ( min <= nnDistance && nnDistance <= max );
        };


        /**
         * Determines nearest neighbouring building.
         */
        this.nearestNeighbouringBuildings = function( x, z ) {
            var minSquaredDistance = -1;
            for (var i = 0; i < fp.buildingNetwork.buildings.length; i++) {
                var building = fp.buildingNetwork.buildings[i];
                var bx = building.lod.position.x, bz = building.lod.position.z;
                var squaredDistance = Math.pow( bx - x, 2 ) + Math.pow( bz - z, 2 );
                if ( minSquaredDistance == -1 || squaredDistance < minSquaredDistance )
                    minSquaredDistance = squaredDistance;
            };
            return Math.sqrt( minSquaredDistance );
        };


        /**
         * Now count how many surrounding are also sea level.
         * We count in 8 directions, to maxDepth.
         * @memberof fp
         * @param  {Number} index
         */
        this.checkProximiteBuildingHeight = function( index ) {
            if ( fp.buildingNetwork.buildings.length === 0 )
                return 0;

            var surrounding = fp.surroundingCells( index );
            // Count number of positions
            var buildingNeighbours = 0, totalNeighbours = 0;

            var allHeights = jStat(_.map( fp.buildingNetwork.buildings, function(building) {return building.maxHeight; } ));
            var meanHeights = allHeights.mean();
            var stdevHeights = allHeights.stdev();

            if (isNaN(meanHeights) || isNaN(stdevHeights))
                return 0;

            var localBuildings = [];
            for (var j = 0; j < surrounding.length; j++) {
                var cell = surrounding[j];
                if (cell !== null) {
                    // Also zero?
                    var key = fp.getIndex(cell.x, cell.y);
                    var building = fp.buildingNetwork.buildingHash[key];
                    if ( !_.isUndefined( building ) ) {
                        localBuildings.push(building);
                    }
                }
            }
            if (localBuildings.length > 0) {
                var localHeights = jStat(_.map(localBuildings, function(building) {return building.maxHeight; } ));
                var meanLocalHeights = localHeights.mean();

                // Take the difference between the local and total heights - return that difference as a multiple of total standard deviations
                return (meanLocalHeights - meanHeights) / stdevHeights;
            }
            else
                return 0;
        };

        /**
         * Retrieves a collection of THREE.Vector3 objects around a given
         * index point.
         * @memberof fp
         * @param  {Number} index
         * @return {Array} a collection of THREE.Vector3 objects
         */
        this.surroundingCells = function( index ) {
            // Now count how many surrounding are also sea level
            // We count in 8 directions, to maxDepth
            // We also try to ignore cases which go over grid boundaries
            var surroundingCells = [];
            var maxCells = fp.terrain.gridPoints * fp.terrain.gridPoints,
                positions = fp.terrain.planeArray.array;
            var indexY = Math.floor(index / fp.terrain.gridPoints),
                indexX = index % fp.terrain.gridPoints,
                //indexMirroredOnY = (indexY) * fp.terrain.gridPoints + indexX,
                indexMirroredOnY = ( fp.terrain.gridPoints - indexY) * fp.terrain.gridPoints + indexX,
                inc = fp.appConfig.terrainOptions.multiplier,
                threshold = fp.appConfig.worldOptions.maxLandSearchDepth * inc;

            for (var j = inc; j <= threshold; j += inc) {
                if (Math.floor((indexMirroredOnY - j) / fp.terrain.gridPoints) == Math.floor(indexMirroredOnY / fp.terrain.gridPoints)) {
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * (indexMirroredOnY - j - ( fp.terrain.gridPoints * j) ) + 0],
                            positions[3 * (indexMirroredOnY - j - ( fp.terrain.gridPoints * j) ) + 1],
                            positions[3 * (indexMirroredOnY - j - ( fp.terrain.gridPoints * j) ) + 2]
                    ) );
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * (indexMirroredOnY - j ) + 0],
                            positions[3 * (indexMirroredOnY - j ) + 1],
                            positions[3 * (indexMirroredOnY - j ) + 2]
                    ) );
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * (indexMirroredOnY - j + ( fp.terrain.gridPoints * j) ) + 0],
                            positions[3 * (indexMirroredOnY - j + ( fp.terrain.gridPoints * j) ) + 1],
                            positions[3 * (indexMirroredOnY - j + ( fp.terrain.gridPoints * j) ) + 2]
                    ) );
                }
                if (Math.floor((indexMirroredOnY + j) / fp.terrain.gridPoints) == Math.floor(indexMirroredOnY / fp.terrain.gridPoints)) {
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * ( indexMirroredOnY + j - ( fp.terrain.gridPoints * j) ) + 0],
                            positions[3 * ( indexMirroredOnY + j - ( fp.terrain.gridPoints * j) ) + 1],
                            positions[3 * ( indexMirroredOnY + j - ( fp.terrain.gridPoints * j) ) + 2]
                    ) );
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * ( indexMirroredOnY + j ) + 0],
                            positions[3 * ( indexMirroredOnY + j ) + 1],
                            positions[3 * ( indexMirroredOnY + j ) + 2]
                    ) );
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * ( indexMirroredOnY + j + ( fp.terrain.gridPoints * j) ) + 0],
                            positions[3 * ( indexMirroredOnY + j + ( fp.terrain.gridPoints * j) ) + 1],
                            positions[3 * ( indexMirroredOnY + j + ( fp.terrain.gridPoints * j) ) + 2]
                    ) );
                }
                surroundingCells.push( new THREE.Vector3(
                        positions[3 * ( indexMirroredOnY - ( fp.terrain.gridPoints * j) ) + 0],
                        positions[3 * ( indexMirroredOnY - ( fp.terrain.gridPoints * j) ) + 1],
                        positions[3 * ( indexMirroredOnY - ( fp.terrain.gridPoints * j) ) + 2]
                ) );
                surroundingCells.push( new THREE.Vector3(
                        positions[3 * ( indexMirroredOnY + ( fp.terrain.gridPoints * j) ) + 0],
                        positions[3 * ( indexMirroredOnY + ( fp.terrain.gridPoints * j) ) + 1],
                        positions[3 * ( indexMirroredOnY + ( fp.terrain.gridPoints * j) ) + 2]
                ) );
            }
            return _.compact(surroundingCells);
        };

        /**
         * @memberof fp
         */
        this.updateKeyboard = function() {
            if ( fp.keyboard.pressed("V") ) {
                fp.appConfig.displayOptions.firstPersonView = !fp.appConfig.displayOptions.firstPersonView;
                fp.resetControls();
            }
            if ( fp.appConfig.displayOptions.firstPersonView )
                return;
            if ( fp.keyboard.pressed("S") ) {
                fp.appConfig.Setup();
            }
            else if ( fp.keyboard.pressed("R") ) {
                fp.appConfig.Run();
            }
            else if ( fp.keyboard.pressed("U") ) {
                fp.appConfig.SpeedUp();
            }
            else if ( fp.keyboard.pressed("D") ) {
                fp.appConfig.SlowDown();
            }
            else if ( fp.keyboard.pressed("B") ) {
                fp.appConfig.displayOptions.buildingsShow = !fp.appConfig.displayOptions.buildingsShow;
                fp.toggleBuildingState();
            }
            else if ( fp.keyboard.pressed("O") ) {
                fp.appConfig.displayOptions.roadsShow = !fp.appConfig.displayOptions.roadsShow;
                fp.toggleRoadState();
            }
            else if ( fp.keyboard.pressed("M") ) {
                fp.appConfig.displayOptions.waterShow = !fp.appConfig.displayOptions.waterShow;
                fp.toggleWaterState();
            }
            else if ( fp.keyboard.pressed("N") ) {
                fp.appConfig.displayOptions.networkShow = !fp.appConfig.displayOptions.networkShow;
                fp.toggleAgentNetwork();
            }
            else if ( fp.keyboard.pressed("P") ) {
                fp.appConfig.displayOptions.patchesShow = !fp.appConfig.displayOptions.patchesShow;
                fp.togglePatchesState();
            }
            else if ( fp.keyboard.pressed("T") ) {
                fp.appConfig.displayOptions.trailsShow = !fp.appConfig.displayOptions.trailsShow;
                fp.toggleTrailState();
            }
            else if ( fp.keyboard.pressed("C") ) {
                fp.appConfig.displayOptions.cursorShow = !fp.appConfig.displayOptions.cursorShow;
                fp.removeCursor();
            }
            else if ( fp.keyboard.pressed("A") ) {
                fp.appConfig.displayOptions.statsShow = !fp.appConfig.displayOptions.statsShow;
                fp.toggleStatsState();
            }
            else if ( fp.keyboard.pressed("W") ) {
                fp.appConfig.displayOptions.wireframeShow = !fp.appConfig.displayOptions.wireframeShow;
                fp.toggleWireframeState();
            }
            else if ( fp.keyboard.pressed("Y") ) {
                fp.appConfig.displayOptions.dayShow = !fp.appConfig.displayOptions.dayShow;
                fp.toggleDayNight();
            }
            else if ( fp.keyboard.pressed("G") ) {
                fp.appConfig.displayOptions.chartShow = !fp.appConfig.displayOptions.chartShow;
                fp.updateGraph();
            }
            else if ( fp.keyboard.pressed("X") ) {
                fp.appConfig.displayOptions.pathsShow = !fp.appConfig.displayOptions.pathsShow;
                fp.togglePathsState();
            }
            else if ( fp.keyboard.pressed("E") ) {
                fp.appConfig.displayOptions.terrainShow = !fp.appConfig.displayOptions.terrainShow;
                fp.toggleTerrainPlane();
            }
        };

        /**
         * @memberof fp
         */
        this.mouseIntersects = function( eventInfo ) {
            //this where begin to transform the mouse cordinates to three,js cordinates
            fp.mouse.x = ( eventInfo.clientX / window.innerWidth ) * 2 - 1;
            fp.mouse.y = -( eventInfo.clientY / window.innerHeight ) * 2 + 1;

            //this vector caries the mouse click cordinates
            fp.mouseVector.set( fp.mouse.x, fp.mouse.y, fp.mouse.z );

            //the final step of the transformation process, basically this method call
            //creates a point in 3d space where the mouse click occurd
            fp.mouseVector.unproject( fp.camera );

            var direction = fp.mouseVector.sub( fp.camera.position ).normalize();

            fp.ray.set( fp.camera.position, direction );

            //asking the raycaster if the mouse click touched the sphere object
            var intersects = fp.ray.intersectObject( fp.terrain.plane );

            //the ray will return an array with length of 1 or greater if the mouse click
            //does touch the plane object
            var point;
            if ( intersects.length > 0 )
                point = intersects[0].point;

            return point;
        };

        /**
         * @memberof fp
         */
        this.onMouseMove = function( eventInfo ) {
            //stop any other event listener from recieving this event
            eventInfo.preventDefault();

            if ( !fp.appConfig.displayOptions.cursorShow )
                return;

            var planePoint = fp.mouseIntersects( eventInfo );
            if ( fp.appConfig.displayOptions.cursorShowCell )
                fp.cursor.createCellFill( planePoint.x, planePoint.z );
            else
                fp.cursor.createCell( planePoint.x, planePoint.z );

            if (eventInfo.which == 1)
                fp.terrain.flattenTerrain();
        };

        /**
         * @memberof fp
         */
        this.onMouseUp = function(eventInfo) {
            //stop any other event listener from recieving this event
            eventInfo.preventDefault();

            if (! eventInfo.metaKey)
                return;

            var planePoint = this.mouseIntersects( eventInfo ), p1, p2;
            if ( !_.isUndefined(planePoint) ) {
                if ( _.isUndefined(p1) )
                    p1 = planePoint;
                else if (_.isUndefined(p2)) {
                    p2 = planePoint;
                    fp.roadNetwork.addRoad(p1, p2, appConfig.roadOptions.roadWidth);
                    p1 = p2 = undefined;
                }
            }
        };


        /**
         * Toggles the visibility of the agent network.
         * @memberof fp
         */
        this.toggleAgentState = function() {
            if ( !fp.appConfig.displayOptions.agentsShow )
                fp.scene.remove(  fp.agentNetwork.particles  );
            else
                fp.scene.add(  fp.agentNetwork.particles  );
        };

        /**
         * Toggles the visibility of the building network.
         * @memberof fp
         */
        this.toggleBuildingState = function() {
            if ( !fp.appConfig.displayOptions.buildingsShow )
                fp.scene.remove( fp.buildingNetwork.networkMesh);
            else
                fp.scene.add( fp.buildingNetwork.networkMesh);
        };

        /**
         * Toggles the visibility of the raod network.
         * @memberof fp
         */
        this.toggleRoadState = function() {
            if ( !fp.appConfig.displayOptions.roadsShow )
                fp.scene.remove( fp.roadNetwork.networkMesh );
            else if ( !_.isUndefined( fp.roadNetwork.networkMesh ) )
                fp.scene.add( fp.roadNetwork.networkMesh );
        };

        /**
         * Toggles the visibility of water.
         * @memberof fp
         */
        this.toggleWaterState = function() {
            if ( !fp.appConfig.displayOptions.waterShow )
                fp.scene.remove( fp.waterMesh );
            else
                fp.scene.add( fp.waterMesh );
        };

        /**
         * Toggles the visibility of the agent network.
         * @memberof fp
         */
        this.toggleAgentNetwork = function() {
            if ( !fp.appConfig.displayOptions.networkShow ) {
                fp.agentNetwork.networks.forEach( function( network ) {
                    fp.scene.remove( network.networkMesh );
                });
            }
            else {
                fp.agentNetwork.networks.forEach( function( network ) {
                    if ( !_.isNull( network.networkMesh ) )
                        fp.scene.add( network.networkMesh );
                });
            }
        };

        /**
         * Toggles the visibility of fp.terrain patches.
         * @memberof fp
         */
        this.togglePatchesState = function() {
            // if ( fp.appConfig.displayOptions.patchesUseShader )
            //     fp.patchNetwork.togglePatchesStateWithShader();
            // else
            //     fp.patchNetwork.togglePatchesStateWithoutShader();
            fp.patchNetwork.togglePatchesStateWithoutShader();
        };

        /**
         * Toggles the visibility of the trail.
         * @memberof fp
         */
        this.toggleTrailState = function() {
            if ( !fp.appConfig.displayOptions.trailsShow ||
                !fp.appConfig.displayOptions.trailsShowAsLines ) {
                fp.scene.remove( fp.trailNetwork.globalTrailLine );
            }
            else if ( appConfig.displayOptions.trailsShowAsLines ) {
                fp.scene.add( fp.trailNetwork.globalTrailLine );
            }
        };

        /**
         * Toggles the visibility of the path network.
         * @memberof fp
         */
        this.togglePathsState = function() {
            if ( !fp.appConfig.displayOptions.pathsShow )
                fp.scene.remove( fp.pathNetwork.networkMesh );
            else
                fp.scene.add( fp.pathNetwork.networkMesh );
        };


        /**
         * Toggles the visibility of the terrain.
         * @memberof fp
         */
        this.toggleTerrainPlane = function() {
            if ( !fp.appConfig.displayOptions.terrainShow )
                fp.scene.remove( fp.terrain.plane );
            else
                fp.scene.add( fp.terrain.plane );
        };
        /**
         * Removes cursor.
         * @memberof fp
         */
        this.removeCursor = function()  {
            fp.scene.remove( fp.cursor.cell );
            fp.cursor.cell = undefined;
        };

        /**
         * Toggles the visibility of the stats widget.
         * @memberof fp
         */
        this.toggleStatsState = function() {
            if ( fp.appConfig.displayOptions.statsShow && fp.stats === null ) {
                fp.stats = new Stats();
                fp.stats.domElement.style.position = "absolute";
                fp.stats.domElement.style.top = "0px";
                fp.container.appendChild( fp.stats.domElement );
            }
            $( "#stats" ).toggle( fp.appConfig.displayOptions.statsShow );
        };

        /**
         * Toggles the visibility of the heads-up display.
         * @memberof fp
         */
        this.toggleHUDState = function() {
            $( "#hudDiv" ).toggle( fp.appConfig.displayOptions.hudShow );
        };

        /**
         * Toggles the visibility of the wireframe.
         * @memberof fp
         */
        this.toggleWireframeState = function() {
            fp.terrain.simpleTerrainMaterial.wireframe = fp.appConfig.displayOptions.wireframeShow;
            fp.terrain.richTerrainMaterial.wireframe = fp.appConfig.displayOptions.wireframeShow;
            fp.buildingNetwork.buildings.forEach(function(building) {
                building.highResMeshContainer.children.forEach(function(mesh) {
                    mesh.material.wireframe = fp.appConfig.displayOptions.wireframeShow;
                } );
            });
        };

        /**
         * Toggles day or night visibility.
         * @memberof fp
         */
        this.toggleDayNight = function() {
            var colorBackground, colorBuilding, colorRoad,
                colorAgent, colorNetwork, colorTrail,
                colorBuildingFill, colorBuildingLine, colorBuildingWindow;
            if ( fp.appConfig.displayOptions.dayShow ) {
                colorBackground = fp.appConfig.colorOptions.colorDayBackground;
                colorRoad = fp.appConfig.colorOptions.colorDayRoad;
                colorAgent = fp.appConfig.colorOptions.colorDayAgent;
                colorNetwork = fp.appConfig.colorOptions.colorDayNetwork;
                colorTrail = fp.appConfig.colorOptions.colorDayTrail;
                colorBuildingFill = fp.appConfig.colorOptions.colorDayBuildingFill;
                colorBuildingLine = fp.appConfig.colorOptions.colorDayBuildingLine;
                colorBuildingWindow = fp.appConfig.colorOptions.colorDayBuildingWindow;
                fp.terrain.richTerrainMaterial.uniforms = fp.ShaderUtils.lambertUniforms( fp.terrain.dayTerrainUniforms );
                fp.terrain.simpleTerrainMaterial.color = new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainLowland1 );
                if ( fp.appConfig.displayOptions.skyboxShow )
                    fp.scene.add( fp.skyBox );
            }
            else {
                colorBackground = fp.appConfig.colorOptions.colorNightBackground;
                colorRoad = fp.appConfig.colorOptions.colorNightRoad;
                colorAgent = fp.appConfig.colorOptions.colorNightAgent;
                colorNetwork = fp.appConfig.colorOptions.colorNightNetwork;
                colorTrail = fp.appConfig.colorOptions.colorNightTrail;
                colorBuildingFill = fp.appConfig.colorOptions.colorNightBuildingFill;
                colorBuildingLine = fp.appConfig.colorOptions.colorNightBuildingLine;
                colorBuildingWindow = fp.appConfig.colorOptions.colorNightBuildingWindow;
                fp.terrain.richTerrainMaterial.uniforms = fp.ShaderUtils.lambertUniforms( fp.terrain.nightTerrainUniforms );
                fp.terrain.simpleTerrainMaterial.color = new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainLowland1 );
                fp.scene.remove( fp.skyBox );
            }
            fp.terrain.richTerrainMaterial.needsUpdate = true; // important!
            fp.terrain.simpleTerrainMaterial.needsUpdate = true; // important!
            fp.terrain.plane.material.needsUpdate = true; // important!
            fp.renderer.setClearColor( colorBackground, 1);
            if ( fp.appConfig.buildingOptions.useShader ) {
                fp.buildingNetwork.buildings.forEach(function( building ) {
                    building.highResMeshContainer.children.forEach( function( floor ) {
                        floor.material.uniforms.fillColor.value = fp.buildColorVector( colorBuildingFill );
                        floor.material.uniforms.lineColor.value = fp.buildColorVector( colorBuildingLine );
                        floor.material.uniforms.windowColor.value = fp.buildColorVector( colorBuildingWindow );
                        floor.material.needsUpdate = true; // important!
                    });
                });
            }
            if ( !_.isNull( fp.roadNetwork.networkMesh ) ) {
                fp.roadNetwork.networkMesh.children.forEach(function(road) {
                    road.material.color = new THREE.Color( colorRoad );
                    road.material.colorsNeedUpdate = true;
                });
            }
            fp.agentNetwork.networks.forEach( function( network ) {
                if ( !_.isNull( network.networkMesh ) ) {
                    network.networkMesh.material.color = new THREE.Color( colorNetwork );
                    network.networkMesh.material.colorsNeedUpdate = true;
                }
            });
            if ( !_.isNull( fp.trailNetwork.globalTrailLine ) ) {
                fp.trailNetwork.globalTrailLine.material.color = new THREE.Color( colorTrail );
                fp.trailNetwork.globalTrailLine.material.colorsNeedUpdate = true;
            }
            if ( !_.isNull( fp.agentNetwork.particles ))
                fp.agentNetwork.agents.forEach(function(agent) { agent.color = colorAgent; });
        };

        /**
         * Loads the actual terrain, using the THREE.TerrainLoader class.
         * @param  {Function} callback A function that is called after the terrain is loaded successfully.
         */
        this.loadTerrain = function( callback ) {
            var terrainLoader = new THREE.TerrainLoader();
            terrainLoader.load( fp.TERRAIN_MAPS[fp.terrain.terrainMapIndex], function( data ) {
                fp.terrain.initTerrain( data );
                fp.animate(); // Kick off the animation loop
                if ( _.isFunction( callback ) )
                    callback(); // Run the callback
           });
        };

        this.ShaderUtils = {
            buildingVertexShaderParams: function() {
                return [
                    "varying vec3 pos; ",
                    "varying float vMixin; ",
                    "attribute float mixin; ",
                    "uniform float time; ",
                ].join("\n");
            },
            buildingVertexShaderMain: function() {
                return [
                    "pos = position;",
                    "vMixin = mixin;",
                    "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
                ].join("\n");
            },

            buildingFragmentShaderParams: function() {
                return [
                    "uniform float time;",
                    "uniform vec2 location;",
                    "uniform vec2 resolution;",
                    "uniform vec3 dimensions;",
                    "uniform float bottomWindow;",
                    "uniform float topWindow;",
                    "uniform float windowWidth;",
                    "uniform float windowPercent;",
                    "uniform float floorLevel;",
                    "uniform float lineWidth;",
                    "uniform int showLines;",
                    "uniform int showFill;",
                    "uniform int showWindows;",
                    "uniform int fillRooves;",
                    "uniform vec3 lineColor;",
                    "uniform vec3 fillColor;",
                    "uniform vec3 windowColor;",
                    "varying vec3 pos;",
                    "varying float vMixin;",

                    // Basic random generator, taken from http://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
                    // and http://stackoverflow.com/questions/12964279/whats-the-origin-of-this-glsl-rand-one-liner
                    // For something more sophisticated try github.com/ashima/webgl-noise
                    "float rand(vec2 co) {",
                        "return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);",
                    "}",

                ].join("\n");
            },
            buildingFragmentShaderMain: function() {
                return [
                    "vec3 darkGrey = vec3(0.1,0.1,0.1);",
                    "vec4 col = vec4(darkGrey, 1.);",
                    "float opacity = 1.;",
                    "if (showFill == 1) {",
                        "col = vec4( mix( fillColor, darkGrey, rand(location) ), opacity );",
                    "}",
                    "bool colorise = false;",
                    "float dimX = dimensions.x;",
                    "float dimY = dimensions.y;",
                    "float dimZ = dimensions.z;",
                    "float posX = pos.x;",
                    "float posY = mod(pos.z, dimY);",
                    "float levels = floor(pos.z / dimY);",
                    "float posZ = pos.y;",
                    "",
                    "// Paint windows",
                    "if (showWindows == 1) {",
                        "// Normalise height",
                        "float height = 1.0 - posY / dimY;",
                        "if (height > bottomWindow && height < topWindow ) {",
                            "float p = 0.;",
                            "if (posX < (floor(dimX / 2.0) - 1.0) && posX > -(floor(dimX / 2.0) - 1.0)) {",
                                "float width = (posX + dimX / 2.0);",
                                "float m = mod(width, windowWidth);",
                                "p = abs( floor(width / windowWidth) );",
                                "float offsetL = windowWidth * ((1.0 - windowPercent) / 2.0);",
                                "float offsetR = windowWidth - offsetL;",
                                "if (m > offsetL && m < offsetR)",
                                    "colorise = true;",
                            "}",
                            "if (posZ < (floor(dimZ / 2.0) - 1.0) && posZ > -(floor(dimZ / 2.0) - 1.0)) {",
                                "float width = (posZ + dimZ / 2.0);",
                                "float m = mod(width, windowWidth);",
                                "p = abs( floor(width / windowWidth) );",
                                "float offsetL = windowWidth * ((1.0 - windowPercent) / 2.0);",
                                "float offsetR = windowWidth - offsetL;",
                                "if (m > offsetL && m < offsetR)",
                                    "colorise = true;",
                            "}",
                            "if (colorise) {",
                                "col = vec4(mix(darkGrey, windowColor, pow( rand( vec2( p, levels ) ), vMixin ) ), opacity);",
                            "}",
                        "} ",
                    "}",
                    "if (showLines == 1) {",
                        "// Rules for horizontal lines",
                        "// IGNORE BOTTOM LINE FOR NOW:  || posY > dimY - lineWidth",
                        "if (posY == 0.0 && fillRooves == 1)  {",
                            "col = vec4(mix(windowColor, darkGrey, 0.5), opacity);",
                        "}",
                        "else if (posY < lineWidth) {",
                            "// This gives just lines",
                            "if (posZ < - (dimZ / 2.0) + lineWidth || posZ > (dimZ / 2.0) - lineWidth) ",
                                "col = vec4(lineColor, opacity);",
                            "if (posX < - (dimX / 2.0) + lineWidth || posX > (dimX / 2.0) - lineWidth)",
                                "col = vec4(lineColor, opacity);",
                        "}",
                        "else {",
                            "// Rules for vertical lines",
                            "if (posZ < - (dimZ / 2.0) + lineWidth) ",
                                "if (posX < - (dimX / 2.0) + lineWidth || posX > (dimX / 2.0) - lineWidth)",
                                    "col = vec4(lineColor, opacity);",
                            "if (posZ > (dimZ / 2.0) - lineWidth) ",
                                "if (posX < - (dimX / 2.0) + lineWidth || posX > (dimX / 2.0) - lineWidth)",
                                    "col = vec4(lineColor, opacity);",
                        "}",
                    "}",
                    "gl_FragColor = col;",


                ].join("\n");
            },

            terrainVertexShaderParams: function() {
                return [
                    "uniform float size;",
                    "uniform float maxHeight;",
                    "attribute float height;",
                    "attribute float trail;",
                    "attribute float patch;",
                    "varying float vHeight;",
                    "varying float vTrail;",
                    "varying float vPatch;",
                ].join("\n");
            },
            terrainVertexShaderMain: function() {
                return [
                    "vHeight = height;",
                    "vTrail = trail;",
                    "vPatch = patch;",
                    "gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);",

                ].join("\n");
            },

            terrainFragmentShaderParams: function() {
                return [
                    "uniform float size;",
                    "uniform float maxHeight;",
                    "varying float vHeight;",
                    "varying float vTrail;",
                    "varying float vPatch;",
                    "// Terrain colors",
                    "uniform vec3 seaColor;",
                    "uniform vec3 lowland1Color;",
                    "uniform vec3 lowland2Color;",
                    "uniform vec3 midlandColor;",
                    "uniform vec3 highlandColor;",
                ].join("\n");
            },
            terrainFragmentShaderMain: function() {
                return [
                    "vec4 sea = vec4(seaColor, 1.0);",
                    "vec4 lowland1 = vec4(lowland1Color, 0.75);",
                    "vec4 lowland2 = vec4(lowland2Color, 0.75);",
                    "vec4 midland = vec4(midlandColor, 0.75);",
                    "vec4 highland = vec4(highlandColor, 0.75);",
                    "vec4 col;",
                    "",
                    "float elevation = vHeight / maxHeight;",
                    "if (vPatch > 0.0) {",
                        "col = vec4(vPatch, vPatch, vPatch, 1.0);",
                    "}",
                    "else if (vTrail > 0.0) {",
                        "col = vec4(vTrail, vTrail, vTrail, 1.0);",
                    "}",
                    "else{",
                        "if (elevation < 0.01) {",
                            "col = mix(sea, lowland1, elevation * 100.0);",
                        "}",
                        "else if (elevation < 0.25) {",
                            "col = mix(lowland1, lowland2, (elevation - 0.01) * 4.0);",
                        "}",
                        "else if (elevation < 0.75) {",
                            "col = mix(lowland2, midland, (elevation - 0.1) * 2.0);",
                        "}",
                        "else if (elevation < 1.0) { ",
                            "col = mix(midland, highland, (elevation - 0.5) * 4.0);",
                        "}",
                    "}",
                    "gl_FragColor = col;",

                ].join("\n");
            },

            agentVertexShader: function() {
                return [
                    "uniform float size;",
                    "attribute float alpha;",
                    "attribute vec3 color;",
                    "varying float vAlpha;",
                    "varying vec3 vColor;",
                    "",
                    "void main() {",
                        "vAlpha = alpha;",
                        "vColor = color; // set RGB color associated to vertex; use later in fragment shader.",
                        "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
                        "// option (1): draw particles at constant size on screen",
                        "// gl_PointSize = size;",
                        "// option (2): scale particles as objects in 3D space",
                        "gl_PointSize = 1.0 * size * ( 300.0 / length( mvPosition.xyz ) );",
                        "gl_Position = projectionMatrix * mvPosition;",
                    "}",

                ].join("\n");
            },
            agentFragmentShader: function() {
                return [
                    "varying vec3 vColor;",
                    "uniform sampler2D texture;",
                    "varying float vAlpha;",
                    "",
                    "void main() {",
                        "gl_FragColor = vec4(vColor, vAlpha);",
                        "// sets a white particle texture to desired color",
                        "gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );",
                    "}",

                ].join("\n");
            },

            // LAMBERT SHADER OVERRIDE FOR SHADOWS
            /**
             * Generates a vertex shader for a Lambert shader.
             */
            lambertShaderVertex: function ( customParams, customCode ) {
                var vertexShader = [
                    customParams,

                "#define LAMBERT",

                "varying vec3 vLightFront;",

                "#ifdef DOUBLE_SIDED",

                "   varying vec3 vLightBack;",

                "#endif",

                THREE.ShaderChunk[ "map_pars_vertex" ],
                THREE.ShaderChunk[ "lightmap_pars_vertex" ],
                THREE.ShaderChunk[ "envmap_pars_vertex" ],
                THREE.ShaderChunk[ "lights_lambert_pars_vertex" ],
                THREE.ShaderChunk[ "color_pars_vertex" ],
                THREE.ShaderChunk[ "morphtarget_pars_vertex" ],
                THREE.ShaderChunk[ "skinning_pars_vertex" ],
                THREE.ShaderChunk[ "shadowmap_pars_vertex" ],
                THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ],

                "void main() {",

                    customCode,

                    THREE.ShaderChunk[ "map_vertex" ],
                    THREE.ShaderChunk[ "lightmap_vertex" ],
                    THREE.ShaderChunk[ "color_vertex" ],

                    THREE.ShaderChunk[ "morphnormal_vertex" ],
                    THREE.ShaderChunk[ "skinbase_vertex" ],
                    THREE.ShaderChunk[ "skinnormal_vertex" ],
                    THREE.ShaderChunk[ "defaultnormal_vertex" ],

                    THREE.ShaderChunk[ "morphtarget_vertex" ],
                    THREE.ShaderChunk[ "skinning_vertex" ],
                    THREE.ShaderChunk[ "default_vertex" ],
                    THREE.ShaderChunk[ "logdepthbuf_vertex" ],

                    THREE.ShaderChunk[ "worldpos_vertex" ],
                    THREE.ShaderChunk[ "envmap_vertex" ],
                    THREE.ShaderChunk[ "lights_lambert_vertex" ],
                    THREE.ShaderChunk[ "shadowmap_vertex" ],

                "}"

                ].join("\n");

                return vertexShader;
            },
            lambertShaderFragment: function ( customParams, customCode ) {
                var fragmentShader = [

                customParams,
                "uniform float opacity;",

                "varying vec3 vLightFront;",

                "#ifdef DOUBLE_SIDED",

                "   varying vec3 vLightBack;",

                "#endif",

                THREE.ShaderChunk[ "color_pars_fragment" ],
                THREE.ShaderChunk[ "map_pars_fragment" ],
                THREE.ShaderChunk[ "alphamap_pars_fragment" ],
                THREE.ShaderChunk[ "lightmap_pars_fragment" ],
                THREE.ShaderChunk[ "envmap_pars_fragment" ],
                THREE.ShaderChunk[ "fog_pars_fragment" ],
                THREE.ShaderChunk[ "shadowmap_pars_fragment" ],
                THREE.ShaderChunk[ "specularmap_pars_fragment" ],
                THREE.ShaderChunk[ "logdepthbuf_pars_fragment" ],

                "void main() {",

                    customCode, // must set gl_FragColor!
                    //"gl_FragColor = vec4( vec3 ( 1.0 ), opacity );",

                    THREE.ShaderChunk[ "logdepthbuf_fragment" ],
                    THREE.ShaderChunk[ "map_fragment" ],
                    THREE.ShaderChunk[ "alphamap_fragment" ],
                    THREE.ShaderChunk[ "alphatest_fragment" ],
                    THREE.ShaderChunk[ "specularmap_fragment" ],

                "   #ifdef DOUBLE_SIDED",

                        //"float isFront = float( gl_FrontFacing );",
                        //"gl_FragColor.xyz *= isFront * vLightFront + ( 1.0 - isFront ) * vLightBack;",

                "       if ( gl_FrontFacing )",
                "           gl_FragColor.xyz *= vLightFront;",
                "       else",
                "           gl_FragColor.xyz *= vLightBack;",

                "   #else",

                "       gl_FragColor.xyz *= vLightFront;",

                "   #endif",

                    THREE.ShaderChunk[ "lightmap_fragment" ],
                    THREE.ShaderChunk[ "color_fragment" ],
                    THREE.ShaderChunk[ "envmap_fragment" ],
                    THREE.ShaderChunk[ "shadowmap_fragment" ],

                    THREE.ShaderChunk[ "linear_to_gamma_fragment" ],

                    THREE.ShaderChunk[ "fog_fragment" ],

                "}"

                ].join("\n");

                return fragmentShader;
            },

            /**
             * Returns an array of Lambert uniforms.
             * @param  {Array} otherUniforms
             * @return {Array} Merged array of uniforms
             */
            lambertUniforms: function(otherUniforms) {
                var uniforms = THREE.UniformsUtils.merge( [
                        THREE.UniformsLib[ "common" ],
                        THREE.UniformsLib[ "fog" ],
                        THREE.UniformsLib[ "lights" ],
                        THREE.UniformsLib[ "shadowmap" ],
                        {
                            "ambient"  : { type: "c", value: new THREE.Color( 0xffffff ) },
                            "emissive" : { type: "c", value: new THREE.Color( 0x000000 ) },
                            "wrapRGB"  : { type: "v3", value: new THREE.Vector3( 1, 1, 1 ) }
                        }
                    ]);
                return _.extend(uniforms, otherUniforms);
            },

            /**
             * Generates a list of shaders for debugging.
             * @return {string} all the shaders
             */
            allShaders: function() {
                return [
                    fp.ShaderUtils.lambertShaderVertex(
                        fp.ShaderUtils.buildingVertexShaderParams(),
                        fp.ShaderUtils.buildingVertexShaderMain()
                    ),
                    fp.ShaderUtils.lambertShaderFragment(
                        fp.ShaderUtils.buildingFragmentShaderParams(),
                        fp.ShaderUtils.buildingFragmentShaderMain()
                    ),
                    fp.ShaderUtils.lambertShaderVertex(
                        fp.ShaderUtils.terrainVertexShaderParams(),
                        fp.ShaderUtils.terrainVertexShaderMain()
                    ),
                    fp.ShaderUtils.lambertShaderFragment(
                        fp.ShaderUtils.terrainFragmentShaderParams(),
                        fp.ShaderUtils.terrainFragmentShaderMain()
                    ),
                    fp.ShaderUtils.agentVertexShader(),
                    fp.ShaderUtils.agentFragmentShader(),
                ].join("\n")
            }

        }
    }
    var fp = new FiercePlanet();
    if (typeof(window) !== "undefined") {
        window.FiercePlanet = FiercePlanet;
        window.fp = new FiercePlanet();
    }
    return fp;
});


