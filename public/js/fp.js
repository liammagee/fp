require.config({

    baseUrl: "/js",

    paths: {

        jquery: "utils/jquery",
        astar: "utils/astar",
        underscore: "utils/underscore",
        three: "three-72",
        jstat: "utils/jstat.min",
        smoothie: "ux/smoothie",
        stats: "ux/stats.min",
        javascriptUtil: "utils/javascript.util",
        jsts: "utils/jsts",
        datGui: "ux/dat.gui",
        water: "objects/water-material",
        KeyboardState: "controls/THREEx.KeyboardState",
        TerrainLoader: "loaders/TerrainLoader",
        TrackballControls: "controls/TrackballControls",
        OrbitControls: "controls/OrbitControls",
        PointerLockControls: "controls/PointerLockControls",

        PointerLockControls: "controls/PointerLockControls",
        FiercePlanet: "fp/fp-whole"

    },

    shim: {

        jquery: { exports: "$" },
        three: { exports: "THREE" },
        underscore: { exports: "_" },
        jstat: { exports: "jStat" },
        datGui: { exports: "dat.gui" },
        smoothie: { exports: "SmoothieChart" },
        stats: { exports: "Stats" },
        jsts: { deps: [ "javascriptUtil" ] },
        water: { exports: "THREE.Water", deps: [ "three" ] },
        KeyboardState: { deps: [ "three" ] },
        TerrainLoader: { deps: [ "three" ] },
        TrackballControls: { deps: [ "three" ] },
        OrbitControls: { deps: [ "three" ] },
        PointerLockControls: { deps: [ "three" ] }

    },

    waitSeconds: 200

});

define(

    [
        // NEED TO BE NAMED
        "astar",
        "jquery",
        "three",
        "underscore",
        "FiercePlanet",

        // DO NOT NEED TO BE NAMED
        "jstat",
        "jsts",
        "ux/dat.gui",
        "smoothie",
        "stats",
        "water",
        "TerrainLoader",
        "KeyboardState",
        "TrackballControls",
        "OrbitControls",
        "PointerLockControls",

    ],

    function( astar, $, THREE, _, FiercePlanet ) {

        "use strict";

        /**
         * Extension to JQuery for URL param extraction - taken from: http://www.sitepoint.com/url-parameters-jquery/ .
         */
        $.urlParam = function( name ){

            var results = new RegExp( "[ \\?& ]" + name + "=( [ ^&# ]* )" ).exec( window.location.href );

            if ( results === null ) {

               return undefined;

            }
            else {

               return results[ 1 ] || 0;

            }

        };

        $.sign = function( x ) {

            return typeof x === "number" ? x ? x < 0 ? -1 : 1 : x === x ? 0 : NaN : NaN;

        };


        /**
         * The Fierce Planet object.
         *
         * @module fp
         * @namespace fp
         */
        //var FiercePlanet = {};


        var fp = FiercePlanet.Simulation;

        /**
         * Represents a network of agents. Also provides factory and utility methods.
         *
         * @constructor
         * @memberof fp
         * @inner
         */
        fp.AgentNetwork = function() {

            /**
             * Represents a specific network within the overall network configuration. Also provides factory and utility methods.
             *
             * @constructor
             * @memberof fp.AgentNetwork
             * @inner
             */
            this.AgentNetworkNetwork = function( color ) {
                this.links = [ ];
                this.networkColor = color;
                this.networkMesh = null;

                this.AgentNetworkNetworkLink = function( agent1, agent2 ) {
                    this.agent1 = agent1;
                    this.agent2 = agent2;
                };

                /**
                 * Generates a set of vertices for connected agents.
                 *
                 * @return {vertices}
                 */
                this.generateFriendNetworkVertices = function() {
                    var vertices = [ ];
                    for ( var i = 0; i < this.links.length; i++ ) {
                        var link = this.links[ i ];
                        var agent1 = link.agent1,
                            agent2 = link.agent2;
                        var p1 = fp.terrain.transformPointFromPlaneToSphere( agent1.position.clone(), fp.terrain.wrappedPercent ),
                            p2 = fp.terrain.transformPointFromPlaneToSphere( agent2.position.clone(), fp.terrain.wrappedPercent );
                        p1.y += fp.appConfig.agentOptions.size / 8;
                        p2.y += fp.appConfig.agentOptions.size / 8;
                        vertices.push( p2 );
                        vertices.push( p1 );
                    }
                    return vertices;
                };

                /**
                 * Generates a curved geometry to represent the agent network.
                 *
                 * @param  {Array} vertices
                 * @return {THREE.Geometry}
                 */
                this.friendNetworkGeometryCurved = function( vertices ) {
                    var networkGeometry = new THREE.Geometry();
                    var len = vertices.length;
                    var spline = new THREE.Spline( vertices );
                    var subN = fp.appConfig.displayOptions.networkCurvePoints;
                    var position, index;
                    for ( var i = 0; i < len * subN; i++ ) {
                        index = i / ( len * subN );
                        position = spline.getPoint( index );
                        networkGeometry.vertices[ i ] = new THREE.Vector3( position.x, position.y, position.z );
                    }
                    return networkGeometry;
                };

                /**
                 * Generates a geometry ( curved or straight ) to represent the agent network.
                 *
                 * @param  {Array} vertices
                 * @return {THREE.Geometry}
                 */
                this.friendNetworkGeometry = function( vertices ) {
                    if ( !fp.appConfig.displayOptions.networkCurve ) {
                        var networkGeometry = new THREE.Geometry();
                        networkGeometry.vertices = vertices;
                        return networkGeometry;
                    }
                    else {
                        return this.friendNetworkGeometryCurved( vertices );
                    }
                };

                /**
                 * Returns a material for the network.
                 *
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
                 *
                 * @return {THREE.Line}
                 */
                this.renderFriendNetwork = function() {

                    if ( !fp.AppState.runSimulation || !fp.appConfig.displayOptions.networkShow ) {
                        return;
                    }

                    if ( !_.isUndefined( this.networkMesh ) ) {
                        fp.scene.remove( this.networkMesh );
                    }
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
                            THREE.LineSegments
                        );
                    }
                    fp.scene.add( this.networkMesh );

                };

                /**
                 * Establish a link between two agents.
                 *
                 * @param  {fp.Agent} agent1
                 * @param  {fp.Agent} agent2
                 */
                this.establishLink = function( agent1, agent2 ) {

                    // Introduce more variability by squaring the probability
                    var chance = Math.pow( fp.appConfig.agentOptions.chanceToJoinNetwork, 2 );
                    var chanceWithHome = Math.pow( fp.appConfig.agentOptions.chanceToJoinNetworkWithHome, 2 );
                    var chanceWithBothHomes = Math.pow( fp.appConfig.agentOptions.chanceToJoinNetworkWithBothHomes, 2 );
                    var link1, link2;
                    if ( Math.random() < chance ) {
                        // Add the other agent if it is not already contained in
                        // either agent's existing connections
                        link1 = new this.AgentNetworkNetworkLink( agent1, agent2 );
                        link2 = new this.AgentNetworkNetworkLink( agent2, agent1 );
                        if ( this.links.indexOf( link1 ) === -1 &&
                             this.links.indexOf( link2 ) === -1 ) {
                            this.links.push( link1 );
                        }
                    }
                    if ( Math.random() < chanceWithHome && ( agent1.home !== null || agent2.home !== null ) ) {
                        // Add the other agent if it is not already contained in
                        // either agent's existing connections
                        link1 = new this.AgentNetworkNetworkLink( agent1, agent2 );
                        link2 = new this.AgentNetworkNetworkLink( agent2, agent1 );
                        if ( this.links.indexOf( link1 ) === -1 &&
                             this.links.indexOf( link2 ) === -1 ) {
                            this.links.push( link1 );
                        }
                    }
                    if ( Math.random() < chanceWithBothHomes && agent1.home !== null && agent2.home !== null ) {
                        // Add the other agent if it is not already contained in
                        // either agent's existing connections
                        link1 = new this.AgentNetworkNetworkLink( agent1, agent2 );
                        link2 = new this.AgentNetworkNetworkLink( agent2, agent1 );
                        if ( this.links.indexOf( link1 ) === -1 &&
                             this.links.indexOf( link2 ) === -1 ) {
                            this.links.push( link1 );
                        }
                    }
                };

                /**
                 * Tries to enlist an agent in this network.
                 *
                 * @param {fp.Agent} agent
                 */
                this.enlistAgent = function( agent ) {

                    var agents = fp.patchNetwork.patches[ fp.getPatchIndex( agent.position.x, agent.position.z ) ];

                    if ( _.isUndefined( agents ) ) {

                        return;

                    }

                    if ( agents.length <= 1 ) {

                        return;

                    }

                    for ( var i = 0; i < agents.length; i++ ) {

                        if ( agents[ i ] === agent ) {

                            continue;

                        }
                        var otherAgent = agents[ i ];
                        this.establishLink( agent, otherAgent );

                    }

                };

                /**
                 * Updates the friend network at runtime, by building and rendering the network.
                 */
                this.updateAgentNetworkRendering = function() {
                    if ( !fp.AppState.runSimulation ) {
                        return;
                    }

                    this.renderFriendNetwork();
                };

            };

            /**
             * Creates an initial set of agents.
             */
            this.createInitialAgentPopulation = function() {
                for ( var i = 0; i < fp.appConfig.agentOptions.initialPopulation; i++ ) {
                    this.agents.push( this.createAgent() );
                }
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
                var y = fp.getHeight( x, z ) +
                        fp.appConfig.agentOptions.terrainOffset +
                        fp.appConfig.agentOptions.size / 2;
                position.x = x;
                position.y = y;
                position.z = z;

                // Allow for the class to be overridden
                var agent = new fp.agentNetwork.AgentClass();
                agent.setPosition( position );
                agent.setRandomDirection();

                agent.color = ( fp.appConfig.displayOptions.dayShow ?
                                      fp.appConfig.colorOptions.colorDayAgent :
                                      fp.appConfig.colorOptions.colorNightAgent );

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
                    var radius = Math.sqrt( normX * normX + normZ * normZ );
                    while ( radius > initExtent / 2 ) {
                        point = this.randomPointForAgent();
                        x = point.x;
                        z = point.z;
                        normX = x - initX;
                        normZ = z - initY;
                        radius = Math.sqrt( normX * normX + normZ * normZ );
                    }
                }

                var boundary = ( extent / 2 ) * fp.appConfig.terrainOptions.multiplier;
                while ( ( x < -boundary || x > boundary ) || ( z < -boundary || z > boundary ) ) {
                    point = this.randomPointForAgent();
                    x = point.x;
                    z = point.z;
                }

                if ( fp.appConfig.agentOptions.noWater ) {
                    var y = fp.getHeight( x, z );
                    while ( y < 0 ) {
                        point = this.randomPointForAgent();
                        x = point.x;
                        z = point.z;
                        y = fp.getHeight( x, z );
                    }
                }
                return { x: x, z: z };
            };


            /**
             * Updates all agents belonging to this network.
             */
            this.updateAgents = function() {

                if ( !fp.AppState.runSimulation || _.isUndefined( this.particles ) ) {

                    return;

                }

                var agents = this.agents;
                if ( fp.appConfig.agentOptions.shuffle ) {

                    agents = _.shuffle( this.agents );

                }

                for ( var i = 0; i < agents.length; i++ ) {

                    var agent = agents[ i ];

                    // Depending on the speed of the simulation, determine whether this agent needs to move
                    var timeToMove = Math.floor( ( i / this.agents.length ) * fp.timescale.framesToYear );
                    var interval = fp.timescale.frameCounter % fp.timescale.framesToYear;

                    if ( timeToMove === interval ) {

                        var underConstruction = agent.build() || agent.buildRoad();

                        if ( underConstruction ) {
                            continue;
                        }

                        // No water around or home built? Move on...
                        agent.evaluateDirection();

                        // Enlist the agent in available networks
                        if ( fp.appConfig.agentOptions.establishLinks ) {

                            for ( var j = this.networks.length - 1; j >= 0; j-- ) {

                                this.networks[ j ].enlistAgent( agent );

                            }

                        }

                        // Then add the position to this agent's trail
                        var ai = fp.getIndex( this.agents[ i ].lastPosition.x, this.agents[ i ].lastPosition.z );
                        if ( ai > -1 ) {

                            fp.trailNetwork.trails[ ai ] = ( fp.trailNetwork.trails[ ai ] ) ? fp.trailNetwork.trails[ ai ] + 1 : 1;

                        }

                        if ( agent.grounded ) {

                            agent.perturbDirection();

                        }

                        agent.updateTick();
                    }

                    // Move the agent
                    agent.move();

                }

            };


            /**
             * Updates the particle system representing this agent network.
             */
            this.updateAgentParticleSystem = function() {

                if ( _.isNull( this.particles ) )
                    return;

                var geometry = this.particles.geometry;

                var positionValues = new Float32Array( this.agents.length * 3 );
                var alphaValues = new Float32Array( this.agents.length * 1 );
                var colourValues = new Float32Array( this.agents.length * 3 );

                for ( var i = 0 ; i < this.agents.length; i++ ) {

                    var agent = this.agents[ i ];

                    var position = fp.terrain.transformPointFromPlaneToSphere( agent.position, fp.terrain.wrappedPercent );

                    geometry.attributes.position.array[ i * 3 + 0 ] = position.x;
                    geometry.attributes.position.array[ i * 3 + 1 ] = position.y;
                    geometry.attributes.position.array[ i * 3 + 2 ] = position.z;

                    if ( fp.appConfig.displayOptions.coloriseAgentsByHealth ) {

                        var health = agent.health;
                        var r = ( 100 - health ) / 100.0;
                        var g = fp.appConfig.displayOptions.dayShow ? 0.0 : 1.0;
                        var b = fp.appConfig.displayOptions.dayShow ? 1.0 : 0.0;
                        g *= ( health / 100.0 );
                        b *= ( health / 100.0 );

                        geometry.attributes.color.array[ i * 3 + 0 ] = r;
                        geometry.attributes.color.array[ i * 3 + 1 ] = g;
                        geometry.attributes.color.array[ i * 3 + 2 ] = b;

                        geometry.attributes.alpha.array[ i ] = 0.75;

                    }
                    else {

                        var color = new THREE.Color( this.agents[ i ].color );
                        geometry.attributes.color.array[ i * 3 + 0 ] = color.r;
                        geometry.attributes.color.array[ i * 3 + 1 ] = color.g;
                        geometry.attributes.color.array[ i * 3 + 2 ] = color.b;

                        geometry.attributes.alpha.array[ i ] = ( this.agents[ i ].health * 0.0075 ) + 0.025;

                    }

                }

                this.particles.geometry.attributes.position.needsUpdate = true;
                this.particles.geometry.attributes.color.needsUpdate = true;
                this.particles.geometry.attributes.alpha.needsUpdate = true;

            };


            /**
             * Creates a set of attributes to represent each agent in the network.
             */
            this.buildAgentParticleSystem = function() {

                var agentGeometry = new THREE.BufferGeometry();

                var positionValues = new Float32Array( this.agents.length * 3 );
                var colourValues = new Float32Array( this.agents.length * 3 );
                var alphaValues = new Float32Array( this.agents.length * 1 );

                for ( var i = 0 ; i < this.agents.length; i++ ) {

                    var agent = this.agents[ i ];

                    var position = fp.terrain.transformPointFromPlaneToSphere( agent.position, fp.terrain.wrappedPercent );

                    positionValues[ i * 3 + 0 ] = position.x;
                    positionValues[ i * 3 + 1 ] = position.y;
                    positionValues[ i * 3 + 2 ] = position.z;

                    alphaValues[ i ] = ( this.agents[ i ].health * 0.0075 ) + 0.025;

                    var colour = new THREE.Color( this.agents[ i ].color );
                    colourValues[ i * 3 + 0 ] = colour.r;
                    colourValues[ i * 3 + 1 ] = colour.g;
                    colourValues[ i * 3 + 2 ] = colour.b;
                }

                agentGeometry.addAttribute( 'position', new THREE.BufferAttribute( positionValues, 3 ) );
                agentGeometry.addAttribute( 'color', new THREE.BufferAttribute( colourValues, 3 ) );
                agentGeometry.addAttribute( 'alpha', new THREE.BufferAttribute( alphaValues, 1 ) );

                var discTexture = THREE.ImageUtils.loadTexture( "/images/sprites/stickman_180.png" );
                if ( !fp.appConfig.agentOptions.useStickman ) {

                    discTexture = THREE.ImageUtils.loadTexture( "/images/sprites/disc.png" );

                }
                discTexture.minFilter = THREE.LinearFilter;

                // uniforms
                var agentParticleSystemUniforms = {

                    texture: { type: "t", value: discTexture },
                    size: { type: "f", value: Math.floor( fp.appConfig.agentOptions.size )}

                };

                var attributes = [ 'alpha', 'color' ];

                // point cloud material
                var agentShaderMaterial = new THREE.ShaderMaterial( {
                    size: fp.appConfig.agentOptions.size,
                    uniforms: agentParticleSystemUniforms,
                    attributes: attributes, // r072
                    vertexShader: FiercePlanet.ShaderUtils.agentVertexShader(),
                    fragmentShader: FiercePlanet.ShaderUtils.agentFragmentShader(),
                    sizeAttenuation: true,
                    fog: false,
                    blending: THREE.NormalBlending,
                    transparent: true,
                    alphaTest: 0.5
                } );

                fp.scene.remove( this.particles );

                this.particles = new THREE.PointCloud( agentGeometry, agentShaderMaterial );
                this.particles.dynamic = true;
                this.particles.sortParticles = true;

            };

            /**
             * Wrapper method for updating individual agents, their network and the shader.
             */
            this.updateAgentNetwork = function() {

                this.updateAgents();

                this.networks.forEach( function( network ) {

                    network.updateAgentNetworkRendering();

                } );

                this.updateAgentParticleSystem();

            };

            this.AgentClass = fp.Agent;
            this.agents = [ ];
            this.networks = [ ];
            this.networks.push( new this.AgentNetworkNetwork() );
            this.particles = null;
            this.agentParticleSystemAttributes = null;
        };

        fp.BUILDING_FORMS = {
            names: [ "rectangle", "octagon", "fivesided", "triangle", "concave" ],
            rectangle: function( w, l, h ) {
                var p1 = new THREE.Vector3( -w / 2, h, -l / 2 );
                var p2 = new THREE.Vector3( w / 2, h, -l / 2 );
                var p3 = new THREE.Vector3( w / 2, h, l / 2 );
                var p4 = new THREE.Vector3( -w / 2, h, l / 2 );
                return [ p1, p2, p3, p4 ];
            },
            octagon: function( w, l, h ) {
                var p1 = new THREE.Vector3( -w / 2, h, -l / 2 );
                var p1_5 = new THREE.Vector3( 0, h, -l / 1.5 );
                var p2 = new THREE.Vector3( w / 2, h, -l / 2 );
                var p2_5 = new THREE.Vector3( w / 1.5, h, 0 );
                var p3 = new THREE.Vector3( w / 2, h, l / 2 );
                var p3_5 = new THREE.Vector3( 0, h, l / 1.5 );
                var p4 = new THREE.Vector3( -w / 2, h, l / 2 );
                var p4_5 = new THREE.Vector3( -w / 1.5, h, 0 );
                return [ p1,p1_5, p2,p2_5, p3,p3_5, p4,p4_5 ];
            },
            fivesided: function( w, l, h ) {
                var p1 = new THREE.Vector3( -w / 2, h, -l / 2 );
                var p2 = new THREE.Vector3( w / 2, h, -l / 2 );
                var p3 = new THREE.Vector3( w / 2, h, l / 2 );
                var p4 = new THREE.Vector3( -w / 2, h, l / 2 );
                var p5 = new THREE.Vector3( -w, h, 0 );
                return [ p1, p2, p3, p4, p5 ];
            },
            triangle: function( w, l, h ) {
                var p1 = new THREE.Vector3( -w / 2, h, -l / 2 );
                var p2 = new THREE.Vector3( w / 2, h, -l / 2 );
                var p3 = new THREE.Vector3( 0, h, l / 2 );
                return [ p1, p2, p3 ];
            },
            concave: function( w, l, h ) {
                var p1 = new THREE.Vector3( -w / 2, h, -l / 2 );
                var p1_1 = new THREE.Vector3( -w / 4, h, -l / 2 );
                var p1_2 = new THREE.Vector3( -w / 4, h, l / 4 );
                var p1_3 = new THREE.Vector3( w / 4, h, l / 4 );
                var p1_4 = new THREE.Vector3( w / 4, h, -l / 2 );
                var p2 = new THREE.Vector3( w / 2, h, -l / 2 );
                var p3 = new THREE.Vector3( w / 2, h, l / 2 );
                var p4 = new THREE.Vector3( -w / 2, h, l / 2 );
                return [ p1, p1_1, p1_2, p1_3, p1_4, p2, p3, p4 ];
            }
        };

        /**
         * Represents a network of buildings. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        fp.BuildingNetwork = function() {
            this.networkMesh = null;
            this.networkJstsCache = [ ];
            this.buildings = [ ];
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
                    levels: fp.appConfig.buildingOptions.minHeight + Math.floor( Math.random() * ( fp.appConfig.buildingOptions.maxHeight - fp.appConfig.buildingOptions.minHeight ) ) ,
                    width: fp.appConfig.buildingOptions.minWidth + Math.floor( Math.random() * ( fp.appConfig.buildingOptions.maxWidth - fp.appConfig.buildingOptions.minWidth )) ,
                    length: fp.appConfig.buildingOptions.minLength + Math.floor( Math.random() * ( fp.appConfig.buildingOptions.maxLength - fp.appConfig.buildingOptions.minLength ))
                };
            };

            /**
             * Collision detection, based on the approach described here: http://stemkoski.github.io/Three.js/Collision-Detection.html.
             * // Simplified 2d alternative for collision detection
             */
            this.get2dPoints = function( building ) {
                var points = [ ];
                var firstFloor = building.highResMeshContainer.children[ 0 ],
                    position = building.highResMeshContainer.position,
                    vertices = firstFloor.geometry.vertices,
                    ff0 = vertices[ 0 ].clone().applyMatrix4( firstFloor.matrix ).add( building.highResMeshContainer.position ),
                    ff1 = vertices[ 1 ].clone().applyMatrix4( firstFloor.matrix ).add( building.highResMeshContainer.position ),
                    ff2 = vertices[ 2 ].clone().applyMatrix4( firstFloor.matrix ).add( building.highResMeshContainer.position ),
                    ff3 = vertices[ 3 ].clone().applyMatrix4( firstFloor.matrix ).add( building.highResMeshContainer.position ),
                    wX = ff1.x - ff0.x, wZ = ff1.z - ff0.z, lX = ff3.x - ff0.x, lZ = ff3.z - ff0.z,
                    wXa = Math.abs( wX ) + 1, wZa = Math.abs( wZ ) + 1, lXa = Math.abs( lX ) + 1, lZa = Math.abs( lZ ) + 1,
                    wXi = Math.round( wX / wXa ), wZi = Math.round( wZ / wZa ), lXi = Math.round( lX / lXa ), lZi = Math.round( lZ / lZa );
                var indexPrev = -1, offset = 1;
                for ( var i = 0; i < wXa; i += offset ) {
                    for ( var j = 0; j < wZa; j += offset ) {
                        var wXLocal = ff0.x + i * wXi, wZLocal = ff0.z + j * wZi;
                        for ( var k = 0; k < lXa; k += offset ) {
                            for ( var l = 0; l < lZa; l += offset ) {
                                var lXLocal = wXLocal + k * lXi, lZLocal = wZLocal + l * lZi;
                                var coordinate = { x: lXLocal, y: lZLocal };
                                if ( points.indexOf( coordinate ) == -1 ) {
                                    points.push( coordinate );
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
                return _.map( this.get2dPoints( building ), function( point ) { return fp.getIndex( point.x, point.y ); }  ) ;
            };

            /**
             * Get a 2-dimensional array of points representing the bounding box
             * of the building.
             * @param  {fp~Building} building
             * @return {Array} points
             */
            this.get2dPointsForBoundingBox = function( building ) {
                var points = [ ];
                // var firstFloor = building.highResMeshContainer.children[ 0 ],
                //     position = building.highResMeshContainer.position,
                //     vertices = firstFloor.geometry.vertices,
                //     verticesOnBase = vertices.length;
                var firstFloor = building.mockMesh,
                    position = building.highResMeshContainer.position,
                    vertices = firstFloor.geometry.vertices,
                    verticesOnBase = vertices.length;
                for ( var i = 0; i < verticesOnBase / 2; i++ ) {
                    // Adjust for the vertex's rotation, and add its position
                    var point  = vertices[ i ].clone().applyMatrix4( firstFloor.matrix );//.add( position );
                    points.push( { x: point.x, y: point.z } );
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
                var coords = _.map( points, function( p ) { return new jsts.geom.Coordinate( p.x, p.y ); } );
                var lineUnion, j = coords.length - 1;
                for ( var i = 0; i < coords.length; i++ ) {
                    var line = new jsts.geom.LineString( [ coords[ i ], coords[ j ] ] );
                    j = i;
                    if ( _.isUndefined( lineUnion ) )
                        lineUnion = line;
                    else
                        lineUnion = lineUnion.union( line );
                }
                var polygonizer = new jsts.operation.polygonize.Polygonizer();
                polygonizer.add( lineUnion );
                var polygon = polygonizer.getPolygons().toArray()[ 0 ];
                return polygon.buffer( 0 );
            };

            /**
             * Checks whether this building collides with any existing buildings.
             * @param  {fp~Building} building
             * @return {Boolean}
             */
            this.collidesWithOtherBuildings = function( building ) {
                // Quick check
                if ( this.buildingHash[ fp.getIndex( building.lod.position.x, building.lod.position.z ) ] )
                    return true;
                var buildingGeometry = this.createJstsGeomFromBoundingBox( building );
                for ( var i = 0; i < this.networkJstsCache.length; i++ ) {
                    var b = this.networkJstsCache[ i ];
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
                return fp.roadNetwork.networkGeometry.crosses( buildingGeometry );
            };

            /**
             * Updates each building.
             */
            this.updateBuildings = function() {
                if ( !fp.AppState.runSimulation || !fp.appConfig.displayOptions.buildingsShow )
                    return;
                for ( var i = 0; i < fp.buildingNetwork.buildings.length; i++ ) {
                    var building = fp.buildingNetwork.buildings[ i ];
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
                if ( fp.appConfig.buildingOptions.randomForm )
                    buildingForm = fp.BUILDING_FORMS.names[ Math.floor( Math.random() * fp.BUILDING_FORMS.names.length ) ];

                var rotateY = ( fp.appConfig.buildingOptions.rotateSetAngle / 180 ) * Math.PI;
                if ( fp.appConfig.buildingOptions.rotateRandomly )
                    rotateY = Math.random() * Math.PI;
                var rotation = new THREE.Vector3( 0, rotateY, 0 );
                var building = new fp.Building( buildingForm, dimensions, position, rotation );

                // Before we add this, try to detect collision
                if ( fp.appConfig.buildingOptions.detectBuildingCollisions ) {
                    if ( fp.buildingNetwork.collidesWithOtherBuildings( building ) )
                        return undefined;
                }

                if ( fp.appConfig.buildingOptions.detectRoadCollisions ) {
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
                    building.mesh.rotation.set( -Math.PI / 2 + v.x, -v.z, v.y );
                    building.mesh.position.set( nv.x, nv.y, nv.z );
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
                // if ( fp.buildingNetwork.networkMesh.children.length === 0 ) {
                //     fp.buildingNetwork.networkMesh.add( clone );
                // }
                // else {
                //     console.log( fp.buildingNetwork.networkMesh.children[ 0 ].geometry.vertices.length );
                //     fp.buildingNetwork.networkMesh.children[ 0 ].geometry.merge( building.mesh.geometry, fp.buildingNetwork.networkMesh.children[ 0 ].matrix );
                //     console.log( fp.buildingNetwork.networkMesh.children[ 0 ].geometry.vertices.length );
                //     fp.buildingNetwork.networkMesh.children[ 0 ].geometry.verticesNeedUpdate = true;
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
        fp.RoadNetwork = function() {
            this.networkMesh = null;
            this.planeVertices = [ ];
            this.networkJstsCache = [ ];
            this.roads = {};
            this.indexValues = [ ];
            this.points = [ ];
            this.networkGeometry = null;
            this.intersections = [ ];

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
            this.getRoadTerrainPoints = function( p1, p2 ) {
                var points = [ ];
                var xLast = p1.x, yLast = 0, zLast = p1.z, lastChange = 0;
                var xd = p2.x - xLast, zd = p2.z - zLast;
                var distance = Math.sqrt( xd * xd + zd * zd ) / fp.appConfig.roadOptions.roadSegments,
                    remaining = distance;
                var yOffset = fp.appConfig.terrainOptions.defaultHeight + 20; //fp.appConfig.buildingOptions.levelHeight - 10;
                p1 = new THREE.Vector3( p1.x, fp.getHeight( p1.x, p1.z ) + yOffset, p1.z );
                p2 = new THREE.Vector3( p2.x, fp.getHeight( p2.x, p2.z ) + yOffset, p2.z );
                points.push( p1 );
                for ( var i = 0; i < distance; i++ ) {
                    var angle = Math.atan2( zd, xd ),
                        angleLeft = angle - Math.PI / 2,
                        angleRight = angle + Math.PI / 2;
                    var x0 = xLast + xd * ( 1 / ( remaining + 1 )),
                        z0 = zLast + zd * ( 1 / ( remaining + 1 )),
                        y0 = fp.getHeight( x0, z0 ) + yOffset;
                    var x = x0, y = y0, z = z0, k;
                    for ( var j = 1; j <= fp.appConfig.roadOptions.roadDeviation; j++ ) {
                        var xL = x0 + Math.cos( angleLeft ) * j,
                            zL = z0 + Math.sin( angleLeft ) * j,
                            yL = fp.getHeight( xL, zL ) + yOffset;
                        if ( yL < y && yL > 0 ) {
                            x = xL;
                            y = yL;
                            z = zL;
                        }
                    }
                    for ( k = 1; k <= fp.appConfig.roadOptions.roadDeviation; k++ ) {
                        var xR = x0 + Math.cos( angleRight ) * k,
                            zR = z0 + Math.sin( angleRight ) * k,
                            yR = fp.getHeight( xR, zR ) + yOffset;
                        if ( yR < y && yR > 0 ) {
                            x = xR;
                            y = yR;
                            z = zR;
                        }
                    }
                    // Only create a point if there's a deviation from a straight line
                    if ( x != x0 || y != y0 || z != z0 ) {
                        x = Math.round( x );
                        y = Math.round( y );
                        z = Math.round( z );
                        var point = new THREE.Vector3( x, y, z );
                        points.push( point );
                        if ( y != yLast ) {
                            var yDiff = y - yLast;
                            var shift = i - lastChange + 1;
                            for ( k = lastChange + 1; k < i; k++ ) {
                                var change = yDiff * ( (k - lastChange ) / shift );
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
                points.push( p2 );
                return points;
            };

            /**
             * Creates a JSTS geometry from the points of the road.
             * @param  {fp~Road} road
             * @return {jsts.geom.Polygon}
             */
            this.createJstsGeomFromRoadPoints = function( points ) {
                var coords = _.map( points, function( p ) { return new jsts.geom.Coordinate( p.x, p.y ); } );
                var lineUnion, j = coords.length - 1;
                for ( var i = 0; i < coords.length; i++ ) {
                    var line = new jsts.geom.LineString( [ coords[ i ], coords[ j ]] );
                    j = i;
                    if ( _.isUndefined( lineUnion ) )
                        lineUnion = line;
                    else
                        lineUnion = lineUnion.union( line );
                }
                var polygonizer = new jsts.operation.polygonize.Polygonizer();
                polygonizer.add( lineUnion );
                var polygon = polygonizer.getPolygons().toArray()[ 0 ];
                return polygon.buffer( 0 );
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
                var jstsCoords = _.map( points, function( p ) { return new jsts.geom.Coordinate( p.x, p.z ); } );
                var jstsGeom = new jsts.geom.LineString( jstsCoords );
                var overlap = fp.roadNetwork.countCollisions( jstsGeom );
                if ( overlap > fp.appConfig.roadOptions.overlapThreshold )
                    return false;

                // The above code probably should supercede this
                var thisIndexValues = _.map( points, function( p ) { return fp.getIndex( p.x,p.z ); } );
                overlap = _.intersection( fp.roadNetwork.indexValues, thisIndexValues ).length;
                if ( overlap > fp.appConfig.roadOptions.overlapThreshold )
                    return false;

                var extrudePath = new THREE.SplineCurve3( points );
                var roadColor = ( fp.appConfig.displayOptions.dayShow ) ? fp.appConfig.colorOptions.colorDayRoad : fp.appConfig.colorOptions.colorNightRoad;
                // var roadMaterial = new THREE.MeshBasicMaterial( { color: roadColor } );
                var roadMaterial = new THREE.MeshLambertMaterial( { color: roadColor } );
                roadMaterial.side = THREE.DoubleSide;
                var roadGeom = new THREE.TubeGeometry( extrudePath, points.length, roadWidth, fp.appConfig.roadOptions.roadRadiusSegments, false );

                var adjust = fp.appConfig.roadOptions.flattenAdjustment,
                    lift = fp.appConfig.roadOptions.flattenLift;
                var vertices = roadGeom.vertices;
                for ( var i = 0; i <= vertices.length - fp.appConfig.roadOptions.roadRadiusSegments; i += fp.appConfig.roadOptions.roadRadiusSegments ) {
                    var coil = vertices.slice( i, i + fp.appConfig.roadOptions.roadRadiusSegments );
                    var mean = jStat.mean( _.map( coil, function( p ) { return p.y; } ) );
                    for ( var j = 0; j < coil.length; j++ ) {
                        var y = coil[ j ].y;
                        var diff = y - mean;
                        var newDiff = diff * adjust;
                        vertices[ i+j ].y = lift + mean + newDiff;
                    }
                }

                // Cache the ordinary plane vertices
                fp.roadNetwork.planeVertices.push( vertices );

                // Transform vertices
                var percent = fp.terrain.wrappedPercent;
                if ( percent > 0 ) {
                    var transformedVertices = [];
                    for ( var k = 0; k < vertices.length; k++ ) {
                        transformedVertices.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ k ], percent ) );
                    }
                    roadGeom.vertices = transformedVertices;
                }

                // Add the road
                var roadMesh = new THREE.Mesh( roadGeom, roadMaterial );
                fp.roadNetwork.networkMesh.add( roadMesh );
                thisIndexValues.forEach( function( p ) { fp.roadNetwork.roads[ p ] = roadMesh; } );
                if ( _.isNull( this.networkGeometry ) )
                    this.networkGeometry = new jsts.geom.LineString( jstsCoords );
                else {
                    try {
                        this.networkGeometry = this.networkGeometry.union( jstsGeom );
                    }
                    catch ( e ) { console.log( e ); } // Sometimes get a TopologyError
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
            this.getPolygonArea = function( polygon ) {
                var points = polygon.shell.points;
                var area = 0;           // Accumulates area in the loop
                var j = points.length - 1;  // The last vertex is the 'previous' one to the first
                for ( var i = 0; i < points.length; i++ ) {
                    area = area + ( points[ j ].x + points[ i ].x ) * ( points[ j ].y - points[ i ].y );
                    j = i;  //j is previous vertex to i
                }
                return area / 2;
            };
        };


        /**
         * Represents a square block of the fp.terrain. It has a value that can be used to represent some property of interest.
         * Using the default assumptions of the PatchNetwork functions, the value should be in the range [ 0, 1 ].
         * @constructor
         * @memberof fp
         * @inner
         */
        fp.Patch = function( val ) {
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
        fp.PatchNetwork = function( func ) {
            this.plane = null;
            this.patches = {};
            this.patchValues = [ ];
            this.patchPlaneArray = [ ];
            this.patchSphereArray = [ ];
            this.patchMeanValue = 0;
            this.patchSize = fp.appConfig.terrainOptions.patchSize;
            this.initialisePatchFunction = !_.isUndefined( func ) ? func : function() { return Math.random(); };

            /**
             * Initialises each patch value with a random value.
             */
            this.initialisePatches = function() {
                var dim = Math.ceil( fp.terrain.gridPoints / fp.patchNetwork.patchSize ) - 1;
                fp.patchNetwork.patchValues = new Array( dim * dim );
                for ( var i = 0; i < fp.patchNetwork.patchValues.length; i++ ) {
                    fp.patchNetwork.patchValues[ i ] = new fp.Patch( this.initialisePatchFunction() );
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

                        if ( i % patchSize === 0 ) {

                            newOffset += newPoints * 3 ;
                            geometry.attributes.position.array[ newOffset + 0 ] = vertices[ oldOffset + 0 ];
                            geometry.attributes.position.array[ newOffset + 1 ] = vertices[ oldOffset + 1 ];
                            geometry.attributes.position.array[ newOffset + 2 ] = vertices[ oldOffset + 2 ];

                            if ( j % patchSize === 0 ) {

                                newOffset += 3;
                                geometry.attributes.position.array[ newOffset + 0 ] = vertices[ oldOffset + 0 ];
                                geometry.attributes.position.array[ newOffset + 1 ] = vertices[ oldOffset + 1 ];
                                geometry.attributes.position.array[ newOffset + 2 ] = vertices[ oldOffset + 2 ];
                                newOffset -= 3;

                            }

                            newOffset -= newPoints * 3;

                        }

                        if ( j % patchSize === 0 ) {

                            newOffset += 3;
                            geometry.attributes.position.array[ newOffset + 0 ] = vertices[ oldOffset + 0 ];
                            geometry.attributes.position.array[ newOffset + 1 ] = vertices[ oldOffset + 1 ];
                            geometry.attributes.position.array[ newOffset + 2 ] = vertices[ oldOffset + 2 ];

                        }

                        newOffset += 3;
                        oldOffset += 3;

                    }
                    if ( i % patchSize === 0 ) {

                        newOffset += newPoints * 3;

                    }
                }

                var len = geometry.attributes.position.array.length / 3,
                    heights = new Float32Array( len ),
                    trailPoints = new Float32Array( len ),
                    patchPoints = new Float32Array( len );

                for ( i = 0; i < len; i++ ) {

                    heights[ i ] = geometry.attributes.position.array[ i * 3 + 2 ];
                    trailPoints[ i ] = 0;
                    patchPoints[ i ] = 0;

                }

                geometry.addAttribute( "height", new THREE.BufferAttribute( heights, 1 ) );
                geometry.addAttribute( "trail", new THREE.BufferAttribute( trailPoints, 1 ) );
                geometry.addAttribute( "patch", new THREE.BufferAttribute( patchPoints, 1 ) );

                var patchAttributes = [ 'height', 'trail', 'patch' ];

                var uniforms = fp.terrain.createUniforms();

                var richTerrainMaterial = new THREE.ShaderMaterial( {

                    uniforms: FiercePlanet.ShaderUtils.phongUniforms( uniforms ),
                    attributes: patchAttributes,
                    vertexShader:   FiercePlanet.ShaderUtils.phongShaderVertex(

                        FiercePlanet.ShaderUtils.terrainVertexShaderParams(),
                        FiercePlanet.ShaderUtils.terrainVertexShaderMain()

                    ),
                    fragmentShader: FiercePlanet.ShaderUtils.phongShaderFragment(

                        FiercePlanet.ShaderUtils.terrainFragmentShaderParams(),
                        FiercePlanet.ShaderUtils.terrainFragmentShaderMain()

                    ),
                    lights: true,
                    fog: true,
                    alphaTest: 0.5

                } );

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
                // Rotate 90 degrees on X axis, to be the "ground"
                this.plane.rotation.set( -Math.PI / 2, 0, 0 );
                // Lift by 1, to ensure shaders doesn't clash with water
                this.plane.position.set( 0, fp.appConfig.terrainOptions.defaultHeight, 0 );
                this.plane.castShadow = true;
                this.plane.receiveShadow = true;
                //this.updateTerrainPatchAttributes();

                // Toggle patches state
                //this.togglePatchesState();
                // fp.scene.add( this.plane );

            };

            /**
             * Default revision of the values of each patch.
             */
            this.defaultReviseValues = function() {
                this.patchMeanValue = 0;
                var popPatch = fp.patchNetwork.patchValues.length;
                var popAgent = fp.agentNetwork.agents.length;
                var r = popAgent / popPatch;
                var change;
                for ( var i = 0; i < this.patchValues.length; i++ ) {
                    var patch = this.patchValues[ i ];
                    if ( !_.isUndefined( this.patches[ i ] ) ) {
                        var len = this.patches[ i ].length;
                        change = -len * ( 1 / ( Math.pow( r, 2 ) ) );
                        patch.updatePatchValue( change );
                    }
                    else { // if ( patch.value < patch.initialValue ) { // Recover
                        change = Math.pow( r, 2 );
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
                for ( var i = 0; i < fp.agentNetwork.agents.length; i++ ) {
                    var agent =  fp.agentNetwork.agents[ i ];
                    var index = fp.getPatchIndex( agent.position.x, agent.position.z );
                    if ( !this.patches[ index ] )
                        this.patches[ index ] = [ ];
                    this.patches[ index ].push( agent );
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

                    this.updateTerrainPatchAttributes();

                }

            };


            /**
             * Updates the terrain's colors based on its patch attributes.
             */
            this.updateTerrainPatchAttributes = function() {

                if ( _.isUndefined( this.patchValues ))
                    return;

                var pl = Math.sqrt( this.patchValues.length );

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

                            if ( j === 0 && patchRow !== 0 )
                                continue;

                            if ( k === 0 && patchCol !== 0 )
                                continue;

                            if ( j == this.patchSize + 2 && patchRow < ( dim - 2 ) )
                                continue;

                            if ( k == this.patchSize + 2 && patchCol < ( dim - 2 ) )
                                continue;

                            var colOffset = patchCol * ( patchSize + 1 ) + k;
                            var rowOffset = ( ( patchRow * ( patchSize + 1 ) ) + j ) * newPoints;
                            var cell = rowOffset + colOffset;
                            // var rows = ( ( this.patchSize + 1 ) * Math.floor( i / pl ) ) * newPoints + j * newPoints;
                            // var cols = ( i % pl ) * ( this.patchSize + 1 ) + k;
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


            this.togglePatchesState = function() {

                if ( fp.appConfig.displayOptions.patchesShow  ) {

                    if ( this.plane === null ) {

                        this.buildPatchMesh();

                    }
                    else {

                        fp.scene.add( this.plane );

                    }
                }
                else {

                    fp.scene.remove( this.plane );

                }

            };

        };

        /**
         * Represents a network of trails. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        fp.TrailNetwork = function() {
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
                    for ( var j = 0; j < len ; j++ ) {
                        var index = i * len  + j;
                        if ( !clone || index > geom.vertices.length ) {
                            geom.vertices.push( fp.agentNetwork.agents[ i ].lastPosition );
                        }
                    }
                    var ai = fp.getIndex(
                        fp.agentNetwork.agents[ i ].lastPosition.x / fp.appConfig.terrainOptions.multiplier,
                        fp.agentNetwork.agents[ i ].lastPosition.z / fp.appConfig.terrainOptions.multiplier
                    );
                    if ( ai > -1 )
                        fp.trailNetwork.trails[ ai ] = 1;
                }
                var trailMaterial = new THREE.LineBasicMaterial( {
                    color: fp.appConfig.colorOptions.colorNightTrail,
                    linewidth: 1.0,
                    opacity: 0.1,
                    blending: THREE.AdditiveBlending,
                    transparent: true
                } );
                fp.trailNetwork.globalTrailLine = new THREE.Line( geom, trailMaterial, THREE.LineSegments );
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
                        for ( var i = 0; i < fp.agentNetwork.agents.length; i++ ) {
                            var agent =  fp.agentNetwork.agents[ i ];
                            // Creates a cycle of trail 'pieces'
                            var len = fp.appConfig.displayOptions.trailLength;
                            var offset = agent.ticks * 2 % len;
                            if ( offset === 0 ) {
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
                        for ( var k in fp.trailNetwork.trails ) {
                            var weight = fp.trailNetwork.trails[ k ];
                            var weightNormed = weight / weightMax;
                            var weightAdjusted = Math.pow( weightNormed, 0.2 );
                            fp.terrain.plane.geometry.attributes.trail.array[ k ] = weightAdjusted;
                        }
                    }
                }
                else if ( fp.appConfig.displayOptions.trailsUpdate ) {
                    for ( var l in fp.trailNetwork.trails )  {
                        fp.terrain.plane.geometry.attributes.trail.array[ l ] = 0.0;
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
        fp.Cursor = function() {
            this.cell = null;

            /**
             * Creates a cell cursor
             * @param  {Number} x
             * @param  {Number} y
             */
            this.createCell = function( x, y ) {
                var halfGrid = fp.terrain.gridExtent / 2;
                var cellSize = fp.terrain.gridExtent / ( fp.terrain.gridPoints - 1 );
                var cellPixels = ( fp.terrain.gridSize  * cellSize );
                var cellX = Math.floor( (x + halfGrid ) / cellPixels );
                var cellY = Math.floor( (y + halfGrid ) / cellPixels );
                var ccX = ( cellX * cellPixels ) - halfGrid;
                var ccY = ( cellY * cellPixels ) - halfGrid;
                var ccZ = fp.getHeight( ccX, ccY );
                var material = new THREE.LineBasicMaterial( {
                    color: 0xff0000,
                    linewidth: 2
                } );

                var i, geometry = new THREE.Geometry();
                for ( i = 0; i < fp.terrain.gridSize; i++ ) {
                    geometry.vertices.push( new THREE.Vector3( ccX, ccY, ccZ ) );
                    ccX += Math.round( cellSize );
                    ccZ = fp.getHeight( ccX, ccY ) + 1;
                }
                for ( i = 0; i < fp.terrain.gridSize; i++ ) {
                    geometry.vertices.push( new THREE.Vector3( ccX, ccY, ccZ ) );
                    ccY += Math.round( cellSize );
                    ccZ = fp.getHeight( ccX, ccY ) + 1;
                }
                for ( i = 0; i < fp.terrain.gridSize; i++ ) {
                    geometry.vertices.push( new THREE.Vector3( ccX, ccY, ccZ ) );
                    ccX -= Math.round( cellSize );
                    ccZ = fp.getHeight( ccX, ccY ) + 1;
                }
                for ( i = 0; i < fp.terrain.gridSize; i++ ) {
                    geometry.vertices.push( new THREE.Vector3( ccX, ccY, ccZ ) );
                    ccY -= Math.round( cellSize );
                    ccZ = fp.getHeight( ccX, ccY ) + 1;
                }
                geometry.vertices.push( new THREE.Vector3( ccX, ccY, ccZ ) + appConfig.agentOptions.size );
                if ( this.cell )
                    fp.scene.remove( this.cell );
                this.cell = new THREE.Line( geometry, material );
                fp.scene.add( this.cell );
            };

            /**
             * Creates a filled-in cell cursor.
             * @param  {Number} x
             * @param  {Number} y
             */
            this.createCellFill = function( x, y ) {
                var halfGrid = fp.terrain.gridExtent / 2;
                var cellSize = fp.terrain.gridExtent / ( fp.terrain.gridPoints - 1 );
                var cellPixels = fp.terrain.gridSize  * cellSize;
                var cellX = Math.floor( (x + halfGrid ) / cellPixels );
                var cellY = Math.floor( (y + halfGrid ) / cellPixels );
                var ccX = ( cellX * cellPixels ) - halfGrid + cellPixels / 2;
                var ccY = ( cellY * cellPixels ) - halfGrid + cellPixels / 2;
                var ccZ = 0;

                var arrayDim = fp.terrain.gridPoints;
                var arraySize = fp.terrain.gridExtent / arrayDim;
                var arrayX = Math.floor( (x / fp.appConfig.terrainOptions.multiplier + halfGrid ) / arraySize );
                var arrayY = Math.floor( (halfGrid + y / fp.appConfig.terrainOptions.multiplier ) / arraySize );
                var vertices = fp.terrain.plane.geometry.attributes.position.array;
                var newVertices = [ ];
                var cellFill, cellMaterial;
                if ( _.isUndefined( this.cell )) {
                    cellFill = new THREE.PlaneGeometry( cellPixels, cellPixels, fp.terrain.gridSize, fp.terrain.gridSize );
                    fp.scene.remove( this.cell );
                    cellMaterial = new THREE.MeshPhongMaterial( { color: 0xff0000,  wireframe: false } );
                    cellMaterial.side = THREE.DoubleSide;
                    this.cell = new THREE.Mesh( cellFill, cellMaterial );
                    this.cell.rotation.set( -Math.PI / 2, 0, 0 );
                    this.cell.geometry.dynamic = true;
                    fp.scene.add( this.cell );
                }
                var halfCell = Math.round( fp.terrain.gridSize / 2 );
                for ( var i = arrayY, counter = 0; i < arrayY + fp.terrain.gridSize + 1; i++ ) {
                    for ( var j = arrayX; j < arrayX + fp.terrain.gridSize + 1; j++, counter++ ) {
                        var index = 3 * ( arrayDim * ( i - halfCell ) + ( j - halfCell ));
                        this.cell.geometry.vertices[ counter ] = new THREE.Vector3(
                            vertices[ index ], vertices[ index + 1 ], vertices[ index + 2 ] + fp.appConfig.agentOptions.terrainOffset
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
        fp.PathNetwork = function() {
            this.networkMesh = null;
            this.stepsPerNode = fp.terrain.ratioExtentToPoint;
            this.graphAStar = null;
            this.nodes = [ ];
            this.opts = null;

            this.setupAStarGraph = function() {
                this.opts = {
                    // wallFrequency: $selectWallFrequency.val(),
                    // fp.terrain.gridSize: $selectGridSize.val(),
                    // debug: $checkDebug.is( "checked" ),
                    diagonal: true,
                    closest: true
                };
                for ( var i = 0; i < fp.terrain.gridPoints; i++ ) {
                    var nodeRow = [ ];
                    for ( var j = 0; j < fp.terrain.gridPoints; j++ ) {
                        var weight = 1 - fp.terrain.getHeightForIndex( i * fp.terrain.gridPoints + j ) / fp.terrain.maxTerrainHeight;
                        weight = ( weight == 1 ? 0 : weight );
                        nodeRow.push( weight );
                    }
                    this.nodes.push( nodeRow );
                }
                this.graphAStar = new astar.Graph( this.nodes );
                this.graphAStar.diagonal = true;
            };

            this.nodeAt = function( position ) {
                var index = fp.getIndex( position.x, position.z );
                var x = index % fp.terrain.gridPoints, y = Math.floor( index / fp.terrain.gridPoints );
                try {
                    return this.graphAStar.grid[ x ][ y ];
                }
                catch ( err ) {
                    return undefined;
                }
            };


            /**
             * Find path to the home of another agent in this network
             * @param  {fp.Agent} agent [ description ]
             * @return {Array}       Of nodes
             */
            this.findPathHome = function( agent ) {

                if ( !agent.home )
                    return [ ];
                var start = this.nodeAt( agent.position );
                var end = this.nodeAt( agent.home.lod.position );
                if ( _.isUndefined( start ) || _.isUndefined( end ) )
                    return [ ];
                var path = astar.astar.search( this.graphAStar, start, end, { closest: this.opts.closest } );
                return path;
            };


            /**
             * Find path to an agent's home
             * @param  {fp.Agent} agent [ description ]
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
                    return [ ];

                var start = this.nodeAt( agent.position );
                var end = this.nodeAt( otherAgentHome.lod.position );

                if ( _.isUndefined( start ) || _.isUndefined( end ) )
                    return [ ];

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
                        y = fp.getHeight( x, z ) + fp.appConfig.agentOptions.terrainOffset,
                        point3d = new THREE.Vector3( x, y, z );

                    /*
                    // Transform vertices
                    var percent = fp.terrain.wrappedPercent;
                    if ( percent > 0 ) {
                        var transformedVertices = [ ];
                        for ( var i = 0; i < vertices.length; i++ ) {
                            transformedVertices.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ i ], percent ) );
                        }
                        roadGeom.vertices = transformedVertices;
                    }
                    */

                    var transformedPoint3d = fp.terrain.transformPointFromPlaneToSphere( point3d, wrapPercent );
                    pathGeom.vertices.push( transformedPoint3d );
                } );

                var pathColor = ( fp.appConfig.displayOptions.dayShow ) ? fp.appConfig.colorOptions.colorDayPath : fp.appConfig.colorOptions.colorNightPath;
                var pathMaterial = new THREE.LineBasicMaterial( { color: pathColor, linewidth: 1.0 } );
                var pathLine = new THREE.Line( pathGeom, pathMaterial );
                this.networkMesh.add( pathLine );
                return pathLine;

            };


            /**
             * Update the visualisation of all agent paths.
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

                _.each( agentsWithPaths, function( agent ) {

                    fp.pathNetwork.drawPathHome( agent );

                } );

            };

        };

        fp.TERRAIN_MAPS = [ "/assets/syd2.bin", "/assets/mel2.bin" ];

        /**
         * Represents the fp.terrain of the world.
         * @constructor
         * @memberof fp
         * @inner
         */
        fp.Terrain = function() {
            this.plane = null;
            this.richTerrainMaterial = null;
            this.simpleTerrainMaterial = null;
            this.dayTerrainUniforms = null;
            this.nightTerrainUniforms = null;
            this.terrainMapIndex = fp.appConfig.terrainOptions.mapIndex;
            this.terrainMapFile = fp.appConfig.terrainOptions.mapFile;
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
             * Create uniforms
             */
            this.createUniforms = function() {

                //var map = new THREE.ImageUtils.loadTexture( "../assets/Sydney-local.png" );

                var uniforms = {
                    // Lambert settings
                    emissive: { type: "c", value: new THREE.Color( 0.0, 0.0, 0.0 ) },
                    diffuse: { type: "c", value: new THREE.Color( 1.0, 1.0, 1.0 ) },
                    opacity: { type: "f", value: fp.appConfig.colorOptions.colorTerrainOpacity },
                    // Phong settings
                    specular: { type: "c", value: new THREE.Color( 0x3a3a3a ) },
                    shininess: { type: "f", value: 0.0 },

                    //map: map,
                    //bumpMap: map,
                    //normalMap: map,
                    //emissiveMap: map,
                    //lightMap: map,
                    //aoMap: map,
                    //specularMap: map,
                    //alphaMap: map,

                    groundLevelColor: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainGroundLevel ) },
                    lowland1Color: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainLowland1 ) },
                    lowland2Color: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainLowland2 ) },
                    midland1Color: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainMidland1 ) },
                    midland2Color: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainMidland2 ) },
                    highlandColor: { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainHighland ) },

                    stop1: { type: "f", value: fp.appConfig.colorOptions.colorTerrainStop1 },
                    stop2: { type: "f", value: fp.appConfig.colorOptions.colorTerrainStop2 },
                    stop3: { type: "f", value: fp.appConfig.colorOptions.colorTerrainStop3 },
                    stop4: { type: "f", value: fp.appConfig.colorOptions.colorTerrainStop4 },
                    stop5: { type: "f", value: fp.appConfig.colorOptions.colorTerrainStop5 },

                    size: { type: "f", value: Math.floor( fp.appConfig.agentOptions.size / 2 )},
                    maxHeight: { type: "f", value: fp.terrain.maxTerrainHeight * fp.appConfig.terrainOptions.multiplier },

                    shadowMix: { type: "f", value: fp.appConfig.terrainOptions.shaderShadowMix },

                };

                if ( fp.appConfig.displayOptions.dayShow ) {
                    uniforms.groundLevelColor = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainGroundLevel ) };
                    uniforms.lowland1Color = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainLowland1 ) };
                    uniforms.lowland2Color = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainLowland2 ) };
                    uniforms.midland1Color = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainMidland1 ) };
                    uniforms.midland2Color = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainMidland2 ) };
                    uniforms.highlandColor = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorDayTerrainHighland ) };
                }
                else {
                    uniforms.groundLevelColor = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainGroundLevel ) };
                    uniforms.lowland1Color = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainLowland1 ) };
                    uniforms.lowland2Color = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainLowland2 ) };
                    uniforms.midland1Color = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainMidland1 ) };
                    uniforms.midland2Color = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainMidland2 ) };
                    uniforms.highlandColor = { type: "c", value: new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainHighland ) };

                }

                return uniforms;

            };


            /**
             * Initialises the terrain.
             */
            this.initTerrain = function( data ) {
                fp.scene.remove( fp.terrain.plane );
                var size = fp.terrain.gridExtent * fp.appConfig.terrainOptions.multiplier;
                var geometry = new THREE.PlaneBufferGeometry( size, size, fp.terrain.gridPoints - 1, fp.terrain.gridPoints - 1 );

                // Use logic from math.stackexchange.com
                var vertices = geometry.attributes.position.array;
                var i, j, l = vertices.length,
                    n = Math.sqrt( l ),
                    k = l + 1;

                if ( fp.appConfig.terrainOptions.loadHeights ) {

                    for ( i = 0, j = 0; i < l; i++, j += 3 ) {

                        geometry.attributes.position.array[ j + 2 ] =
                            data[ i ] / 65535 *
                            fp.terrain.maxTerrainHeight *
                            fp.appConfig.terrainOptions.multiplier;

                    }

                }
                else {

                    for ( i = 0, j = 0; i < l; i++, j += 3 ) {

                        geometry.attributes.position.array[ j + 2 ] = 0;

                    }

                }

                fp.terrain.simpleTerrainMaterial = new THREE.MeshPhongMaterial( {

                    color: new THREE.Color( 0xffffff ),  // diffuse
                    emissive: new THREE.Color( 0x111111 ),
                    specular: new THREE.Color( 0x111111 ),

                    //map: map,
                    //bumpMap: map,
                    //normalMap: map,
                    //emissiveMap: map,
                    //lightMap: map,
                    //aoMap: map,
                    //specularMap: map,
                    //alphaMap: map,

                    //metal: true,

                    wireframe: fp.appConfig.displayOptions.wireframeShow

                } );

                fp.terrain.simpleTerrainMaterial.side = THREE.DoubleSide;

                // Create shader material
                var len = geometry.attributes.position.array.length / 3,
                    heights = new Float32Array( len ),
                    trailPoints = new Float32Array( len ),
                    patchPoints = new Float32Array( len );

                for ( i = 0; i < len; i++ ) {

                    heights[ i ] = vertices[ i * 3 + 2 ];
                    trailPoints[ i ] = 0.0;
                    patchPoints[ i ] = 0.0;

                }

                var terrainAttributes = [ 'height', 'trail', 'patch' ];

                geometry.addAttribute( "height", new THREE.BufferAttribute( heights, 1 ) );
                geometry.addAttribute( "trail", new THREE.BufferAttribute( trailPoints, 1 ) );
                geometry.addAttribute( "patch", new THREE.BufferAttribute( patchPoints, 1 ) );

                var uniforms = this.createUniforms();

                fp.terrain.richTerrainMaterial = new THREE.ShaderMaterial( {

                    uniforms: FiercePlanet.ShaderUtils.phongUniforms( uniforms ),
                    attributes: terrainAttributes,
                    vertexShader:   FiercePlanet.ShaderUtils.phongShaderVertex(

                        FiercePlanet.ShaderUtils.terrainVertexShaderParams(),
                        FiercePlanet.ShaderUtils.terrainVertexShaderMain()

                    ),
                    fragmentShader: FiercePlanet.ShaderUtils.phongShaderFragment(

                        FiercePlanet.ShaderUtils.terrainFragmentShaderParams(),
                        FiercePlanet.ShaderUtils.terrainFragmentShaderMain()

                    ),
                    lights: true,
                    fog: true,
                    alphaTest: 0.5

                } );

                // Only use the shader material if we have variable heights
                if ( fp.appConfig.terrainOptions.shaderUse ) {

                    // Necessary? Maybe for Phong
                    // geometry.computeFaceNormals();
                    geometry.computeVertexNormals();
                    fp.terrain.plane = new THREE.Mesh( geometry, fp.terrain.richTerrainMaterial );

                }
                else {

                    fp.terrain.plane = new THREE.Mesh( geometry, fp.terrain.simpleTerrainMaterial );

                }

                // Cache the array
                fp.terrain.planeArray = fp.terrain.plane.geometry.attributes.position.clone();
                fp.terrain.plane.castShadow = true;
                fp.terrain.plane.receiveShadow = true;
                // Rotate 90 degrees on X axis, to be the "ground"
                fp.terrain.plane.rotation.set( -Math.PI / 2, 0, 0 );
                // Lift by 1, to ensure shaders doesn't clash with water
                fp.terrain.plane.position.set( 0, fp.appConfig.terrainOptions.defaultHeight, 0 );
                fp.toggleTerrainPlane();

                if ( fp.appConfig.displayOptions.patchesShow ) {

                    fp.patchNetwork.buildPatchMesh();

                }

                // fp.terrain.createTerrainColors();
                fp.toggleDayNight();
                fp.pathNetwork.setupAStarGraph();

                // Construct the sphere, and switch it on
                if ( fp.appConfig.terrainOptions.renderAsSphere ) {

                    fp.terrain.sphereArray = fp.terrain.constructSphere( fp.terrain.planeArray );

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
                if ( index >= 0 && !_.isUndefined( fp.terrain.planeArray.array[ index * 3 + 2 ] ) )
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
                    var xCoord = fp.terrain.planeArray.array[ reversedIndex * 3 + 0 ];
                    var zCoord = fp.terrain.planeArray.array[ reversedIndex * 3 + 1 ];
                    return [ xCoord, zCoord ];
                }
                return null;
            };

            /**
             * Flattens out the terrain.
             */
            this.flattenTerrain = function() {
                if ( !fp.appConfig.displayOptions.cursorShow )
                    return;

                var vertices = this.plane.geometry.attributes.position.array;
                var i, point, meanHeight = 0;
                for ( i = 0; i < fp.cursor.cell.geometry.vertices.length; i++ ) {
                    point = fp.cursor.cell.geometry.vertices[ i ];
                    meanHeight += fp.getHeight( point.x, - point.y );
                }
                meanHeight /= fp.cursor.cell.geometry.vertices.length;
                for ( i = 0; i < fp.cursor.cell.geometry.vertices.length; i++ ) {
                    point = fp.cursor.cell.geometry.vertices[ i ];
                    var index = fp.getIndex( point.x, - point.y );
                    this.plane.geometry.attributes.position.array[ 3 * index + 2 ] = meanHeight;
                }
                this.plane.geometry.attributes.position.needsUpdate = true;
                this.plane.geometry.verticesNeedUpdate = true;
            };

            /**
             * Creates a basic set of colors for the terrain.
             */
            this.createTerrainColors = function () {
                for ( var y = 0; y < 99; y++ ) {
                    for ( var x = 0; x < 99; x++ ) {
                        var r = Math.random();
                        var color = new THREE.Color( r, r, r );
                        var arrayX = x * fp.terrain.gridSize * 2;
                        var arrayY = y * fp.terrain.gridSize * 2;
                        for ( var i = arrayY; i < arrayY + ( fp.terrain.gridSize * 2 ); i += 2 ) {
                            for ( var j = arrayX; j < arrayX + ( fp.terrain.gridSize * 2 ); j++ ) {
                                var index = ( ( fp.terrain.gridPoints - 1 ) * i ) + j;
                                if ( fp.terrain.plane.geometry.attributes.uv.array[ index ] ) {
                                    fp.terrain.plane.geometry.attributes.uv.array[ index ] = color;
                                    fp.terrain.plane.geometry.attributes.uv.array[ index + 1 ] = color;
                                    fp.terrain.plane.geometry.attributes.uv.array[ index + 1 ] = color;
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
            };

            /**
             * Retrieves the angle to the origin of the terrain sphere.
             * @param {Number} x
             * @param {Number} y
             * @param {Number} z
             * @return {THREE.Vector3} A rotation vector in the order: pitch ( x ), yaw ( y ), roll ( z )
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
                var dx = diff.x % radius, sx = $.sign( diff.x ), rx = Math.floor( Math.abs( diff.x ) / radius );
                var dz = diff.z % radius, sz = $.sign( diff.z ), rz = Math.floor( Math.abs( diff.z ) / radius );
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
                var sx = $.sign( x ), sz = $.sign( z );
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
                for ( var j = 0; j < l; j += 3 ) {
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
             * Wraps the plane into a sphere, to a specified percent ( 0 unwraps back to a plane ).
             */
            this.wrapTerrainIntoSphere = function( percent ) {
                this.wrappedPercent = percent;
                var i, j, k;
                var pv, sv, nv, cv;
                var transformedVertices, vertices;
                if ( !_.isUndefined( percent ) && percent <= 100 && percent >= 0 ) {
                    var l = fp.terrain.sphereArray.array.length;
                    for ( i = 0; i < l; i++ ) {
                        pv = fp.terrain.planeArray.array[ i ];
                        sv = fp.terrain.sphereArray.array[ i ];
                        nv = pv + ( sv - pv ) * ( percent / 100 );
                        fp.terrain.plane.geometry.attributes.position.array[ i ] = nv;
                    }
                    fp.terrain.plane.geometry.attributes.position.needsUpdate = true;
                    if ( !_.isNull( fp.patchNetwork.plane ) ) {
                        l = fp.patchNetwork.patchSphereArray.array.length;
                        for ( j = 0; j < l; j++ ) {
                            pv = fp.patchNetwork.patchPlaneArray.array[ j ];
                            sv = fp.patchNetwork.patchSphereArray.array[ j ];
                            nv = pv + ( sv - pv ) * ( percent / 100 );
                            fp.patchNetwork.plane.geometry.attributes.position.array[ j ] = nv;
                        }
                        fp.patchNetwork.plane.geometry.attributes.position.needsUpdate = true;
                    }
                    fp.buildingNetwork.buildings.forEach( function( building ) {
                        building.lod.matrixAutoUpdate = false;
                        cv = _.clone( building.originPosition );
                        // var cv = _.clone( building.mesh );
                        nv = fp.terrain.transformPointFromPlaneToSphere( cv, 100 );
                        var v = fp.terrain.sphereOriginAngle( nv.x, nv.y, nv.z ).multiplyScalar( percent / 100 );
                        nv = fp.terrain.transformPointFromPlaneToSphere( cv, percent );
                        building.mesh.rotation.set( -Math.PI / 2 + v.x, -v.z, v.y );
                        building.mesh.position.set( nv.x, nv.y, nv.z );
                        building.lod.rotation.set( -Math.PI / 2 + v.x, -v.z, v.y );
                        building.lod.position.set( nv.x, nv.y, nv.z );
                        building.highResMeshContainer.rotation.set( -Math.PI / 2 + v.x, -v.z, v.y );
                        building.highResMeshContainer.position.set( nv.x, nv.y, nv.z );
                        building.lowResMeshContainer.rotation.set( -Math.PI / 2 + v.x, -v.z, v.y );
                        building.lowResMeshContainer.position.set( nv.x, nv.y, nv.z );
                    } );
                    // Alter roards
                    for ( k = 0; k < fp.roadNetwork.planeVertices.length; k++ ) {
                        transformedVertices = [ ];
                        vertices = fp.roadNetwork.planeVertices[ k ];
                        for ( var m = 0; m < vertices.length; m++ ) {
                            transformedVertices.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ m ], percent ) );
                        }
                        fp.roadNetwork.networkMesh.children[ k ].geometry.vertices = transformedVertices;
                        fp.roadNetwork.networkMesh.children[ k ].geometry.verticesNeedUpdate = true;
                    }

                    // Alter paths
                    for (var n = 0; n < fp.pathNetwork.networkMesh.children.length; n++ ) {

                        transformedVertices = [ ];
                        vertices = fp.pathNetwork.networkMesh.children[ n ];
                        for ( var o = 0; o < vertoces.length; o++ ) {
                            transformedVertoces.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ o ], percent ) );
                        }
                        fp.pathNetwork.networkMesh.children[ n ].geometry.vertices = transformedVertices;
                        fp.pathNetwork.networkMesh.children[ n ].geometry.verticesNeedUpdate = true;

                    }

                    if ( !_.isNull( fp.agentNetwork.particles ) ) {

                        for ( var p = 0; p < fp.agentNetwork.agents.length; p++ ) {

                            var agent = fp.agentNetwork.agents[ p ];
                            nv = fp.terrain.transformPointFromPlaneToSphere( agent.position, percent );
                            fp.agentNetwork.particles.geometry.attributes.position.array[ p * 3 + 0 ] = nv.x;
                            fp.agentNetwork.particles.geometry.attributes.position.array[ p * 3 + 1 ] = nv.y;
                            fp.agentNetwork.particles.geometry.attributes.position.array[ p * 3 + 2 ] = nv.z;

                        }

                        fp.agentNetwork.particles.geometry.attributes.position.needsUpdate = true;

                    }

                    for ( var r = 0; r < fp.agentNetwork.networks.length; r++ ) {

                        transformedVertices = [ ];
                        var network = fp.agentNetwork.networks[ r ];

                        if ( !_.isNull( network.networkMesh ) ) {

                            vertices = network.networkMesh.geometry.vertices;

                            for ( var s = 0; s < vertices.length; s++ ) {

                                transformedVertices.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ s ], percent ) );

                            }

                            network.networkMesh.geometry.vertices = transformedVertices;
                            network.networkMesh.geometry.verticesNeedUpdate = true;

                        }
                    }
                }
            };

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
       fp.Timescale = function() {     // Time variables
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
        fp.Agent = function() {

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
            this.setPosition = function( v ) {
                this.lastPosition = this.position = v;
            };

            /**
             * @memberof Agent
             */
            this.findBuilding = function() {
                var xl = this.lastPosition.x, zl = this.lastPosition.z;
                return fp.buildingNetwork.buildingHash[ fp.getIndex( xl, zl ) ];
            };

            /**
             * @memberof Agent
             */
            this.goingUp = function( building ) {
                return ( building == this.home ) ?
                    ( Math.random() < fp.appConfig.agentOptions.visitHomeBuilding ) :
                     ( Math.random() < fp.appConfig.agentOptions.visitOtherBuilding );
            };
            /**
             * @memberof Agent
             */
            this.updateGroundedState = function( building ) {
                var xl = this.lastPosition.x, yl = this.lastPosition.y, zl = this.lastPosition.z,
                    xd = this.direction.x, yd = this.direction.y, zd = this.direction.z;

                if ( !this.grounded ) {
                    var base = fp.getHeight( xl, zl ) + fp.appConfig.agentOptions.terrainOffset;
                    if ( yl <= base && yd < 0 )
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
                    dir = new THREE.Vector3( xDir, 0, zDir );
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
                    return [ [ dir, 1.0 ] ];

                // Update whether we are in  a building, and should be going up or do wn
                var building = this.findBuilding();
                this.updateGroundedState( building );

                // Weight variables
                var weight = 1.0, weightForRoadIsSet = false;

                // Pre-calculate speed and current angle
                var newSpeed = Math.random() * this.speed / 2,
                    angle = Math.atan2( zd, xd ),
                    hyp = Math.sqrt( xd * xd + zd * zd ),
                    divisor = ( directionCount - 2 ) / 2;

                for ( var i = 0; i < directionCount; i++ ) {
                    if ( ( i < 8 && ! this.grounded ) || ( i >= 8 && this.grounded ) )
                        continue; // Move horizontally if grounded, vertically if not

                    if ( i < 8 && this.grounded ) { // Horizonal directions
                        var newAngle = angle + ( i * Math.PI / divisor );
                        xd = Math.cos( newAngle ) * hyp;
                        yd = 0;
                        zd = Math.sin( newAngle ) * hyp;
                    }
                    else if ( !this.grounded && i >= 8 ) { // Vertical directions
                        xd = 0;
                        yd = ( i == 8 ) ? newSpeed : -newSpeed;
                        zd = 0;
                    }

                    // Calculate new position
                    var xn = xl + xd, yn = yl + yd, zn = zl + zd,
                        isRoad = ( fp.roadNetwork.indexValues.indexOf( fp.getIndex( xn, zn )) > -1 );

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
                    if ( i === 0 && yn <= 0 && fp.appConfig.agentOptions.noWater )
                        weight = 0.0;

                    // If inside a building, adjust weights
                    if ( !this.grounded && !_.isUndefined( building ) ) {
                        var buildingHeight = building.levels * fp.appConfig.buildingOptions.levelHeight + building.lod.position.y;
                        if ( i == 8 ) {
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
                directions = _.chain( directions ).compact().sort( function( a,b ) { return ( a[ 1 ] > b[ 1 ] ) ? 1 : ( a[ 1 ] < b [ 1 ]? -1 : 0 ); } ).value();

                // If no directions are found, reverse current direction
                if ( directions.length === 0 ) {
                    var x = -this.direction.x;
                    var z = -this.direction.z;
                    var direction = new THREE.Vector3( x, fp.getHeight( x, z ), z );
                    directions.push( [ direction, 1.0 ] );
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
                    return [ [ dir, 1.0 ] ];

                var directionCount = 8,
                     directions = new Array( directionCount  );

                // Weight variables
                var weight = 1.0, weightForRoadIsSet = false;

                // Pre-calculate speed and current angle
                var angle = Math.atan2( zd, xd ),
                    hyp = Math.sqrt( xd * xd + zd * zd ),
                    divisor = directionCount / 2;

                for ( var i = 0; i < directionCount; i++ ) {
                    // Slight rounding errors using above calculation
                    var newAngle = angle + ( i * Math.PI / divisor );
                    // directionAtSpeed = directionAtSpeed.multiplyScalar( patchSize );
                    xd = Math.cos( newAngle ) * hyp;
                    yd = 0;
                    zd = Math.sin( newAngle ) * hyp;

                    // Calculate new position
                    var xn = xl + xd, yn = yl + yd, zn = zl + zd,
                        isRoad = ( fp.roadNetwork.indexValues.indexOf( fp.getIndex( xn, zn )) > -1 );

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

                    // If the new y position is zero, set the weight to zero
                    if ( yn === null )
                        continue;

                    // If the new y position is zero, set the weight to zero
                    if ( yn <= fp.appConfig.terrainOptions.defaultHeight )
                        weight = 0;

                    // Set to the height of the terrain
                    yn += fp.appConfig.terrainOptions.defaultHeight;
                    // Offset relative to the terrain
                    yn += fp.appConfig.agentOptions.terrainOffset;
                    // Add half the agent's own size
                    yn += fp.appConfig.agentOptions.size / 2;

                    // Smooth the transition between heights
                    yd = ( yn - yl ) / fp.terrain.ratioExtentToPoint;

                    // Set the direction
                    directions[ i ] = [ new THREE.Vector3( xd, yd, zd ), weight ];
                }
                directions = _.chain( directions ).
                                compact().
                                shuffle().
                                sort( function( a, b ) { return ( a[ 1 ] > b[ 1 ] ) ? 1 : ( a[ 1 ] < b [ 1 ]? -1 : 0 ); } ).
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
                    map( function( d ) { return d[ 1 ]; } ).
                    reduce( function( memo, num ) { return memo + num; }, 0 ).
                    value();
                var weightsNormed = _.chain( directions ).
                    map( function( d ) { return d[ 1 ] / total; } ).
                    sort().
                    reverse().
                    value();
                var r = Math.random();
                var index = 0, runningTotal = 0, len = directions.length - 1;
                // Note the interval array is initialisaed with an addition zero
                for ( var i = 0; i < weightsNormed.length; i++ ) {
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
                var factor = fp.appConfig.terrainOptions.multiplier;
                if ( fp.appConfig.agentOptions.movementRelativeToPatch ) {
                    factor *= fp.appConfig.terrainOptions.patchSize *
                                ( fp.appConfig.agentOptions.movementInPatch / 100 );
                }
                directionAtSpeed.x *= factor;
                directionAtSpeed.z *= factor;
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
                var direction = 0, directions = [ ];
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
                if ( fp.appConfig.agentOptions.movementStrictlyIntercardinal ) {
                    return new THREE.Vector3( this.speed * ( Math.random() - 0.5 ), 0, this.speed * ( Math.random() - 0.5 ) );
                }
                else {
                    var directions = this.compassDirections();
                    var index = Math.floor( Math.random() * 8 );
                    var pos = directions[ index ];
                    var vec = new THREE.Vector3( this.speed * pos[ 0 ], 0, this.speed * pos[ 1 ] );
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
                    if ( leastLen === 0 || len < leastLen ) {
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
                for ( var i = proximityTests.length - 1; i >= 0; i-- ) {
                    var proximityTest = proximityTests[ i ];
                    var func = _.first( proximityTest );
                    var values = _.rest( proximityTest );
                    var response = func.apply( fp, _.union( [ index ], values ) );
                    if ( response )
                        return true;
                }
                return false;
            };

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
                if ( !_.isUndefined( fp.buildingNetwork.buildingHash[ index ] ) )
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
                    index = fp.getIndex( xOrig, zOrig ),
                    xInit = fp.appConfig.agentOptions.initialX,
                    zInit = fp.appConfig.agentOptions.initialY,
                    xd = ( xOrig - xInit ),
                    zd = ( zOrig - zInit ),
                    distanceFromInitialPoint = Math.sqrt( xd * xd + zd * zd ),
                    buildingIndex = _.map( fp.buildingNetwork.buildings, function( building ) { return fp.getIndex( building.lod.position.x, building.lod.position.z ); } );

                if ( fp.roadNetwork.networkMesh.children.length >= fp.appConfig.roadOptions.maxNumber )
                    return false;

                if ( !_.isNull( fp.stats ) && fp.statss <= 10 )
                    return false;

                if ( fp.appConfig.displayOptions.buildingsShow ) {
                    if ( fp.buildingNetwork.buildings.length === 0 ) {
                        return false;
                    }
                    else if ( fp.buildingNetwork.buildings.length == 1 ) {
                        if ( buildingIndex.indexOf( index ) == -1 )
                            return false;
                    }
                }
                if ( fp.roadNetwork.indexValues.length === 0 ) {
                    if ( distanceFromInitialPoint > fp.appConfig.roadOptions.initialRadius )
                        return false;
                }
                else {
                    if ( fp.roadNetwork.indexValues.indexOf( index ) == -1 )
                        return false;
                    if ( buildingIndex.indexOf( index ) == -1 ) {
                        var r = Math.random();
                        var chance = 1 / ( Math.log( distanceFromInitialPoint + 1 ) * fp.appConfig.roadOptions.probability );
                        if ( chance < r )
                            return false;
                    }
                }

                // Pick a random direction to create a road
                var xr = Math.random() * 2 - 0.5,
                    zr = Math.random() * 2 - 0.5,
                    lenMinimum = fp.appConfig.roadOptions.lenMinimum,
                    lenMaximum = fp.appConfig.roadOptions.lenMaximum,
                    lenFactor = Math.random();
                var existingRoad = fp.roadNetwork.roads[ index ];
                if ( existingRoad ) {
                    var ps = _.first( existingRoad.geometry.vertices ),
                        pe = _.last( existingRoad.geometry.vertices ),
                        xChange = ps.x - pe.x,
                        zChange = ps.z - pe.z,
                        angle = Math.atan2( zChange, xChange ),
                        turn = Math.round( Math.random() ),
                        angle90 = angle + Math.PI / 2 + Math.PI * turn;
                    xr = Math.cos( angle90 );
                    zr = Math.sin( angle90 );
                }
                var totalLen = lenMinimum +
                                ( lenMaximum - lenMinimum ) *
                                ( 1 - jStat.exponential.cdf( lenFactor, fp.appConfig.roadOptions.lenDistributionFactor ) ),
                    xExtent = xr * totalLen,
                    zExtent = zr * totalLen,
                    xEnd = this.position.x + xExtent,
                    zEnd = this.position.z + zExtent,
                    yEnd = fp.getHeight( xEnd, zEnd ),
                    endPoint = new THREE.Vector3( xEnd, yEnd, zEnd ),
                    xe = xOrig - xEnd,
                    ze = zOrig - zEnd,
                    distanceFromEnd = Math.sqrt( xe * xe + ze * ze ),
                    width = Math.ceil( ( ( ( 1 / Math.log( distanceFromInitialPoint + 10 ) ) ) * Math.log( distanceFromEnd ) ) * fp.appConfig.roadOptions.roadWidth );
                return fp.roadNetwork.addRoad( this.position, endPoint, width );
            };
            this.vertex = null;
            this.position = null;
            this.direction = null;
            this.speed = fp.appConfig.agentOptions.initialSpeed;
            this.perturbBy = fp.appConfig.agentOptions.initialPerturbBy;
            this.lastPosition = null;
            this.grounded = true;
            this.alpha =  0.5 + ( Math.random() / 2 );
            this.color = "#ff0000"; // Red. Alternative for this model is blue: "#0000ff"
            this.ticks = 0;
            this.age = 0;

            this.home = null;
            this.health = 100;
            this.gender = Math.random() < 0.5 ? "f": "m";
            this.children = [ ];
            this.friends = [ ];
            this.pathComputed = undefined;
            this.pathPosition = 0;
        };


        /**
         * Represents a building with a position, dimesions, and one or more floors.
         * @constructor
         * @memberof fp
         * @inner
         */
        fp.Building = function( form, dimensions, position, rotation ) {

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
                if ( fp.appConfig.displayOptions.dayShow ) {
                    fc = fp.buildColorVector( fp.appConfig.colorOptions.colorDayBuildingFill );
                    lc = fp.buildColorVector( fp.appConfig.colorOptions.colorDayBuildingLine );
                    wc = fp.buildColorVector( fp.appConfig.colorOptions.colorDayBuildingWindow );
                }
                else {
                    fc = fp.buildColorVector( fp.appConfig.colorOptions.colorNightBuildingFill );
                    lc = fp.buildColorVector( fp.appConfig.colorOptions.colorNightBuildingLine );
                    wc = fp.buildColorVector( fp.appConfig.colorOptions.colorNightBuildingWindow );
                }

                this.lineMaterial = new THREE.LineBasicMaterial( {
                    color: lc,
                    linewidth: fp.appConfig.buildingOptions.linewidth
                } );
                this.windowMaterial = new THREE.MeshBasicMaterial( { color: wc } );
                this.windowMaterial.side = THREE.DoubleSide;
                this.buildingMaterial = new THREE.MeshBasicMaterial( { color: fc } );
                this.buildingMaterial.side = THREE.DoubleSide;
                this.buildingMaterial.opacity = 1;

                this.geometry = new THREE.Geometry();
                // Pre-fill with enough vertices
                for ( var i = 0; i < ( fp.appConfig.maxLevels * 16 + 8 ); i++ ) {

                    this.geometry.vertices.push( new THREE.Vector3( 0,0,0 ));

                }

                this.geometry.verticesNeedUpdate = true;
                this.geometry.computeVertexNormals();

                // Set up containers
                this.mesh = new THREE.Object3D();
                this.highResMeshContainer = new THREE.Object3D();
                this.lowResMeshContainer = new THREE.Object3D();

                if ( ! fp.appConfig.buildingOptions.useShader ) {

                    this.mesh = new THREE.Line( this.geometry, this.lineMaterial, THREE.LineSegments );
                    this.highResMeshContainer.add( this.mesh );

                    this.windowsOutlineContainer = new THREE.Object3D();
                    if ( fp.appConfig.buildingOptions.windowsLine )
                        this.highResMeshContainer.add( this.windowsOutlineContainer );

                    this.windowsFillContainer = new THREE.Object3D();

                    if ( fp.appConfig.buildingOptions.windowsFill ) {

                        this.highResMeshContainer.add( this.windowsFillContainer );

                    }

                }

                if ( fp.appConfig.buildingOptions.useLevelOfDetail ) {

                    this.lod.addLevel( this.highResMeshContainer, fp.appConfig.buildingOptions.highResDistance );
                    this.lod.addLevel( this.lowResMeshContainer, fp.appConfig.buildingOptions.lowResDistance );
                    this.lowResGeometry = new THREE.BoxGeometry( fp.appConfig.buildingOptions.width, ( this.levels + 1 ) * fp.appConfig.buildingOptions.levelHeight, fp.appConfig.buildingOptions.length );
                    this.lowResGeometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, ( this.levels + 1 ) * fp.appConfig.buildingOptions.levelHeight / 2, 0 ) );
                    this.lowResMesh = new THREE.Mesh( this.lowResGeometry, this.buildingMaterial );
                    this.lowResMeshContainer.add( this.lowResMesh );

                }
                else {

                    this.lod.addLevel( this.highResMeshContainer, 1 );

                }

                this.lod.updateMatrix();
                this.lod.matrixAutoUpdate = false;

            };

            /**
             * Adds a new floor to the current building
             */
            this.addFloor = function () {
                var base = this.levels * fp.appConfig.buildingOptions.levelHeight;
                var points = fp.BUILDING_FORMS[ this.buildingForm ]( this.localWidth, this.localLength, base );
                if ( !fp.appConfig.buildingOptions.useShader ) {
                    if ( fp.appConfig.buildingOptions.showLines ) {
                        this.geometry.dynamic = true;
                        this.generateSkeleton( points );
                        this.geometry.verticesNeedUpdate = true;
                    }
                    if ( fp.appConfig.buildingOptions.showFill )
                        this.generateExtrudedShape( points );
                    if ( fp.appConfig.buildingOptions.showWindows )
                        this.generateWindows( points );
                }
                else {
                    this.shadedShape( points );
                }

                this.levels++;
                // Update a low res model once the rest is complete
                this.updateSimpleBuilding();

                // Do tapering and staggering here
                if ( fp.appConfig.buildingOptions.stagger ) {
                    if ( fp.appConfig.buildingOptions.taper ) {
                        var percentage = this.levels / this.localMaxLevels;
                        var sq = Math.pow( percentage, fp.appConfig.buildingOptions.taperExponent );
                        var hurdle = jStat.exponential.cdf( sq, fp.appConfig.buildingOptions.taperDistribution );
                        if ( Math.random() < hurdle ) {
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
                this.highResMeshContainer.remove( topFloor );
                this.levels--;
                // Update a low res model once the rest is complete
                this.updateSimpleBuilding();
            };

            this.generateSkeleton = function ( points ) {
                var i, base = points[ 0 ].y;
                var height = base + fp.appConfig.buildingOptions.levelHeight;
                var offset = fp.getOffset( this.levels, points.length );

                if ( this.levels === 0 ) {
                    this.geometry.vertices[ offset ] = points[ 0 ];
                    for ( i = 1; i < points.length; i++ ) {
                        this.geometry.vertices[ offset + i * 2 - 1 ] = points[ i ];
                        this.geometry.vertices[ offset + i * 2 ] = points[ i ];
                    }
                    this.geometry.vertices[ offset + points.length * 2 - 1 ] = points[ 0 ];
                    offset += points.length * 2;
                }

                for ( i = 0; i < points.length; i++ ) {
                    this.geometry.vertices[ offset + i * 2 ] = points[ i ];
                    this.geometry.vertices[ offset + i * 2 + 1 ] = new THREE.Vector3( points[ i ].x, height, points[ i ].z );
                }
                offset += points.length * 2;

                this.geometry.vertices[ offset ] = new THREE.Vector3( points[ 0 ].x, height, points[ 0 ].z );
                for ( i = 1; i < points.length; i++ ) {
                    this.geometry.vertices[ offset + i * 2 - 1 ] = new THREE.Vector3( points[ i ].x, height, points[ i ].z );
                    this.geometry.vertices[ offset + i * 2 ] = new THREE.Vector3( points[ i ].x, height, points[ i ].z );
                }
                this.geometry.vertices[ offset + points.length * 2 - 1 ] = new THREE.Vector3( points[ 0 ].x, height, points[ 0 ].z );
            };

            this.generateExtrudedShape = function ( points ) {
                var base = points[ 0 ].y;
                var height = base + fp.appConfig.buildingOptions.levelHeight;
                var offset = fp.getOffset( this.levels, points.length );

                // EXTRUDED SHAPE FOR NON-BOX SHAPED BUILDINGS
                var shape = new THREE.Shape();
                shape.moveTo( points[ 0 ].x, points[ 0 ].z );
                for ( var i = 1; i < points.length; i++ ) {
                    shape.lineTo( points[ i ].x, points[ i ].z );
                }
                shape.lineTo( points[ 0 ].x, points[ 0 ].z );
                var extrudeSettings = { amount: fp.appConfig.buildingOptions.levelHeight * 1.0, bevelEnabled: false };
                var shapeGeometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
                shapeGeometry.faceVertexUvs[ 0 ][ 0 ][ 0 ].set( 0, 0 );
                shapeGeometry.faceVertexUvs[ 0 ][ 0 ][ 1 ].set( 0, 0 );
                shapeGeometry.faceVertexUvs[ 0 ][ 0 ][ 2 ].set( 0, 0 );
                shapeGeometry.faceVertexUvs[ 0 ][ 1 ][ 0 ].set( 0, 0 );
                shapeGeometry.faceVertexUvs[ 0 ][ 1 ][ 1 ].set( 0, 0 );
                shapeGeometry.faceVertexUvs[ 0 ][ 1 ][ 2 ].set( 0, 0 );
                shapeGeometry.faceVertexUvs[ 0 ][ 2 ][ 0 ].set( 0, 0 );
                shapeGeometry.faceVertexUvs[ 0 ][ 2 ][ 1 ].set( 0, 0 );
                shapeGeometry.faceVertexUvs[ 0 ][ 2 ][ 2 ].set( 0, 0 );
                shapeGeometry.faceVertexUvs[ 0 ][ 3 ][ 0 ].set( 0, 0 );
                shapeGeometry.faceVertexUvs[ 0 ][ 3 ][ 1 ].set( 0, 0 );
                shapeGeometry.faceVertexUvs[ 0 ][ 3 ][ 2 ].set( 0, 0 );
                shapeGeometry.computeBoundingBox();
                if ( shapeGeometry.boundingBox ) {
                    var fc = ( fp.appConfig.displayOptions.dayShow ) ? fp.appConfig.colorOptions.colorDayBuildingFill : fp.appConfig.colorOptions.colorNightBuildingFill;
                    var buildingMaterial = new THREE.MeshBasicMaterial( {color: fc } );
                    var box = new THREE.Mesh( shapeGeometry, buildingMaterial );
                    box.rotation.set( Math.PI / 2, 0, 0 );
                    box.position.set( 0, height, 0 );
                    box.geometry.verticesNeedUpdate = true;
                    this.highResMeshContainer.add( box );
                }
            };

            this.generateWindows = function ( points ) {
                var base = points[ 0 ].y + fp.appConfig.agentOptions.terrainOffset;
                var offset = fp.getOffset( this.levels, points.length );

                // General calculable variables
                var windowHeight = ( (fp.appConfig.buildingOptions.windowsEndY - fp.appConfig.buildingOptions.windowsStartY ) / 100 ) * fp.appConfig.buildingOptions.levelHeight;
                var winActualWidth = ( fp.appConfig.buildingOptions.windowPercent / 100 ) * fp.appConfig.buildingOptions.windowWidth;

                // Create the window shape template
                var shape = new THREE.Shape();
                shape.moveTo( 0, 0 );
                shape.lineTo( winActualWidth, 0 );
                shape.lineTo( winActualWidth, windowHeight );
                shape.lineTo( 0, windowHeight );
                shape.lineTo( 0, 0 );
                var extrudeSettings = { amount: 1.0, bevelEnabled: false };
                var shapeGeometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
                // var shapeGeometry = new THREE.ShapeGeometry( shape );
                var box = new THREE.Mesh( shapeGeometry, this.windowMaterial );

                var outlineGeometry = new THREE.ShapeGeometry( shape );
                var windowPoints = shape.createPointsGeometry();
                var windowOutline = new THREE.Line( windowPoints, this.lineMaterial );

                for ( var i = 0; i < points.length; i++ ) {
                    var previousPoint;
                    if ( i === 0 )
                        previousPoint = points[ points.length - 1 ];
                    else
                        previousPoint = points[ i - 1 ];
                    var currentPoint = points[ i ];
                    var xDiff = currentPoint.x - previousPoint.x;
                    var zDiff = currentPoint.z - previousPoint.z;
                    var lineLength = Math.sqrt( xDiff * xDiff + zDiff * zDiff );
                    var windowCount = Math.floor( lineLength / fp.appConfig.buildingOptions.windowWidth );
                    var winOffset = ( fp.appConfig.buildingOptions.windowWidth - winActualWidth ) / 2;
                    var windowStart = base + ( fp.appConfig.buildingOptions.levelHeight * ( fp.appConfig.buildingOptions.windowsStartY / 100 ));
                    var windowEnd = base + ( fp.appConfig.buildingOptions.levelHeight * ( fp.appConfig.buildingOptions.windowsEndY / 100 ));
                    var winW = winActualWidth * ( xDiff / lineLength );
                    var winL = winActualWidth * ( zDiff / lineLength );
                    var winOffsetW = winOffset * ( xDiff / lineLength );
                    var winOffsetL = winOffset * ( zDiff / lineLength );
                    var angle = Math.atan2( xDiff, zDiff ) + Math.PI / 2;
                    for ( var j = 0 ; j < windowCount; j++ ) {
                        var winX = previousPoint.x + ( j * xDiff / windowCount ) + winOffsetW;
                        var winZ = previousPoint.z + ( j * zDiff / windowCount ) + winOffsetL;

                        if ( fp.appConfig.buildingOptions.windowsFill ) {
                            var boxCopy = box.clone();
                            boxCopy.position.set( winX + winW, windowStart, winZ + winL );
                            boxCopy.rotation.set( 0, angle, 0 );
                            this.windowsFillContainer.add( boxCopy );
                        }

                        if ( fp.appConfig.buildingOptions.windowsLine ) {
                            var windowOutlineCopy = windowOutline.clone();
                            windowOutlineCopy.position.set( winX + winW, windowStart, winZ + winL );
                            windowOutlineCopy.rotation.set( 0, angle, 0 );
                            this.windowsOutlineContainer.add( windowOutlineCopy );
                        }
                    }
                }
            };


            this.shadedShapeMock = function() {
                // var base = this.levels * fp.appConfig.buildingOptions.levelHeight + fp.appConfig.terrainOptions.defaultHeight;
                var points = fp.BUILDING_FORMS[ this.buildingForm ]( this.localWidth, this.localLength, base );
                var base = points[ 0 ].y;
                var height = base;// + this.lod.position.y;
                var offset = fp.getOffset( this.levels, points.length );
                var shape = new THREE.Shape();
                shape.moveTo( points[ 0 ].x, points[ 0 ].z );
                for ( var i = 1; i < points.length; i++ )
                    shape.lineTo( points[ i ].x, points[ i ].z );
                shape.lineTo( points[ 0 ].x, points[ 0 ].z );
                var extrudeSettings = { amount: fp.appConfig.buildingOptions.levelHeight * 1.0, bevelEnabled: false };
                var shapeGeometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
                shapeGeometry.computeBoundingBox();
                var mesh;

                if ( shapeGeometry.boundingBox ) {

                    var dumbMaterial = new THREE.MeshBasicMaterial( { color: "#ff0000" } );
                    dumbMaterial.visible = false;

                    mesh = new THREE.Mesh( shapeGeometry, dumbMaterial );
                    mesh.rotation.set( -Math.PI / 2, 0, 0 );
                    height = fp.getHeight( this.highResMeshContainer.position.x, this.highResMeshContainer.position.z );
                    mesh.position.set( this.highResMeshContainer.position.x, height, this.highResMeshContainer.position.z );
                    mesh.updateMatrix();
                    return mesh;

                }

                return null;

            };

            this.shadedShapeGeometry = function( points ) {

                var shape = new THREE.Shape();
                shape.moveTo( points[ 0 ].x, points[ 0 ].z );
                for ( var i = 1; i < points.length; i++ )
                    shape.lineTo( points[ i ].x, points[ i ].z );
                shape.lineTo( points[ 0 ].x, points[ 0 ].z );
                return shape;

            };

            this.shadedShape = function( points ) {

                var base = points[ 0 ].y;
                var height = base;// + this.lod.position.y;
                var offset = fp.getOffset( this.levels, points.length );
                var shape = this.shadedShapeGeometry( points );
                var extrudeSettings = { amount: fp.appConfig.buildingOptions.levelHeight * 1.0, bevelEnabled: false };
                var tmpGeometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
                var shapeGeometry = new THREE.BufferGeometry().fromGeometry( tmpGeometry );
                shapeGeometry.computeBoundingBox();

                if ( shapeGeometry.boundingBox ) {

                    if ( this.levels === 0 ) {
                    // if ( this.levels < 1000 ) {

                        var fc, lc, wc;
                        if ( fp.appConfig.displayOptions.dayShow ) {

                            fc = fp.buildColorVector( fp.appConfig.colorOptions.colorDayBuildingFill );
                            lc = fp.buildColorVector( fp.appConfig.colorOptions.colorDayBuildingLine );
                            wc = fp.buildColorVector( fp.appConfig.colorOptions.colorDayBuildingWindow );

                        }
                        else {

                            fc = fp.buildColorVector( fp.appConfig.colorOptions.colorNightBuildingFill );
                            lc = fp.buildColorVector( fp.appConfig.colorOptions.colorNightBuildingLine );
                            wc = fp.buildColorVector( fp.appConfig.colorOptions.colorNightBuildingWindow );

                        }

                        // Gets around a problem with rendering a single building with lines or windows
                        var showLines = ( fp.buildingNetwork.buildings.length > 1 && fp.appConfig.buildingOptions.showLines );
                        var showWindows = fp.appConfig.buildingOptions.showWindows;

                        this.uniforms = {

                            // Lambert settings
                            emissive: { type: "c", value: new THREE.Color( 0.0, 0.0, 0.0 ) },
                            diffuse: { type: "c", value: new THREE.Color( 1.0, 1.0, 1.0 ) },
                            opacity: { type: "f", value: fp.appConfig.colorOptions.colorTerrainOpacity },
                            // Phong settings
                            specular: { type: "c", value: new THREE.Color( 0xbaba3a ) },
                            shininess: { type: "f", value: 50 },

                            time: { type: "f", value: 1.0 },
                            location: { type: "v2", value: new THREE.Vector2( this.lod.position.x, this.lod.position.z ) },
                            resolution: { type: "v2", value: new THREE.Vector2() },
                            dimensions: { type: "v3", value: new THREE.Vector3( shapeGeometry.boundingBox.max.x - shapeGeometry.boundingBox.min.x, fp.appConfig.buildingOptions.levelHeight, shapeGeometry.boundingBox.max.y - shapeGeometry.boundingBox.min.y ) },
                            bottomWindow: { type: "f", value: this.bottomWindow },
                            topWindow: { type: "f", value: this.topWindow },
                            windowWidth: { type: "f", value: this.windowWidth },
                            windowPercent: { type: "f", value: this.windowPercent },
                            floorLevel: { type: "f", value: this.levels },
                            lineColor: { type: "v3", value: lc },
                            lineWidth: { type: "f", value: fp.appConfig.buildingOptions.linewidth },
                            fillColor: { type: "v3", value: fc },
                            windowColor: { type: "v3", value: wc },
                            showLines: { type: "i", value: showLines ? 1 : 0 },
                            showFill: { type: "i", value: fp.appConfig.buildingOptions.showFill ? 1 : 0 },
                            showWindows: { type: "i", value: showWindows ? 1 : 0 },
                            fillRooves: { type: "i", value: fp.appConfig.buildingOptions.fillRooves ? 1 : 0 }

                        };

                        var mixins = new Float32Array( shapeGeometry.attributes.position.count * 1 );
                        for ( var i = 0; i < shapeGeometry.attributes.position.count; i++ ) {

                            mixins[ i ] = Math.random() * 10;

                        }
                        shapeGeometry.addAttribute( 'mixin', new THREE.BufferAttribute( mixins, 1 ) );

                        var attributes = [ 'mixin' ];

                        var shaderMaterial = new THREE.ShaderMaterial( {

                            uniforms: FiercePlanet.ShaderUtils.lambertUniforms( this.uniforms ),
                            attributes: attributes,
                            vertexShader: FiercePlanet.ShaderUtils.lambertShaderVertex(

                                FiercePlanet.ShaderUtils.buildingVertexShaderParams(),
                                FiercePlanet.ShaderUtils.buildingVertexShaderMain()

                            ),
                            fragmentShader: FiercePlanet.ShaderUtils.lambertShaderFragment(

                                FiercePlanet.ShaderUtils.buildingFragmentShaderParams(),
                                FiercePlanet.ShaderUtils.buildingFragmentShaderMain()

                            ),
                            lights: true,
                            fog: true,
                            // transparent: true,
                            alphaTest: 0.5

                        } );

                        shaderMaterial.side = THREE.DoubleSide;
                        shaderMaterial.wireframe = fp.appConfig.displayOptions.wireframeShow;

                        this.mesh = new THREE.Mesh( shapeGeometry, shaderMaterial );
                        this.mesh.castShadow = true;
                        this.mesh.receiveShadow = true;
                        this.mesh.children.forEach( function( b ) {
                            b.castShadow = true;
                            b.receiveShadow = true;
                        } );
                        this.mesh.rotation.set( -Math.PI / 2, 0, 0 );
                        height = fp.getHeight( this.highResMeshContainer.position.x, this.highResMeshContainer.position.z );
                        this.mesh.position.set( this.highResMeshContainer.position.x, height, this.highResMeshContainer.position.z );
                        this.mesh.updateMatrix();

                        fp.buildingNetwork.networkMesh.add( this.mesh );

                    }
                    else {

                        var geometry = new THREE.BufferGeometry();
                        var existingFloorsCount = this.mesh.geometry.attributes.position.count;
                        var newFloorCount = shapeGeometry.attributes.position.count;
                        var totalBuildingCount = existingFloorsCount + newFloorCount;
                        var positions = new Float32Array( totalBuildingCount * 3 );
                        var normals = new Float32Array( totalBuildingCount * 3 );
                        var colors = new Float32Array( totalBuildingCount * 3 );
                        var uvs = new Float32Array( totalBuildingCount * 2 );
                        var mixins = new Float32Array( totalBuildingCount * 1 );

                        for ( var i = 0; i < existingFloorsCount; i++ ) {

                            positions[ i * 3 + 0 ] = this.mesh.geometry.attributes.position.array[ i * 3 + 0 ];
                            positions[ i * 3 + 1 ] = this.mesh.geometry.attributes.position.array[ i * 3 + 1 ];
                            positions[ i * 3 + 2 ] = this.mesh.geometry.attributes.position.array[ i * 3 + 2 ];

                            normals[ i * 3 + 0 ] = this.mesh.geometry.attributes.normal.array[ i * 3 + 0 ];
                            normals[ i * 3 + 1 ] = this.mesh.geometry.attributes.normal.array[ i * 3 + 1 ];
                            normals[ i * 3 + 2 ] = this.mesh.geometry.attributes.normal.array[ i * 3 + 2 ];

                            colors[ i * 3 + 0 ] = this.mesh.geometry.attributes.color.array[ i * 3 + 0 ];
                            colors[ i * 3 + 1 ] = this.mesh.geometry.attributes.color.array[ i * 3 + 1 ];
                            colors[ i * 3 + 2 ] = this.mesh.geometry.attributes.color.array[ i * 3 + 2 ];

                            uvs[ i * 2 + 0 ] = this.mesh.geometry.attributes.uv.array[ i * 2 + 0 ];
                            uvs[ i * 2 + 1 ] = this.mesh.geometry.attributes.uv.array[ i * 2 + 1 ];

                        }

                        for ( var i = existingFloorsCount, j = 0; j < newFloorCount; j++ ) {

                            positions[ ( i + j ) * 3 + 0 ] = shapeGeometry.attributes.position.array[ j * 3 + 0 ];
                            positions[ ( i + j ) * 3 + 1 ] = shapeGeometry.attributes.position.array[ j * 3 + 1 ];
                            positions[ ( i + j ) * 3 + 2 ] = shapeGeometry.attributes.position.array[ j * 3 + 2 ] + this.levels * fp.appConfig.buildingOptions.levelHeight;

                            normals[ ( i + j ) * 3 + 0 ] = shapeGeometry.attributes.normal.array[ j * 3 + 0 ];
                            normals[ ( i + j ) * 3 + 1 ] = shapeGeometry.attributes.normal.array[ j * 3 + 1 ];
                            normals[ ( i + j ) * 3 + 2 ] = shapeGeometry.attributes.normal.array[ j * 3 + 2 ];

                            colors[ ( i + j ) * 3 + 0 ] = shapeGeometry.attributes.color.array[ j * 3 + 0 ];
                            colors[ ( i + j ) * 3 + 1 ] = shapeGeometry.attributes.color.array[ j * 3 + 1 ];
                            colors[ ( i + j ) * 3 + 2 ] = shapeGeometry.attributes.color.array[ j * 3 + 2 ];

                            uvs[ ( i + j ) * 2 + 0 ] = shapeGeometry.attributes.uv.array[ j * 2 + 0 ];
                            uvs[ ( i + j ) * 2 + 1 ] = shapeGeometry.attributes.uv.array[ j * 2 + 1 ];

                        }

                        var mixins = new Float32Array( totalBuildingCount * 1 );
                        for ( var i = 0; i < totalBuildingCount; i++ ) {

                            mixins[ i ] = Math.random() * 10;

                        }

                        geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
                        geometry.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
                        geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
                        geometry.addAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
                        geometry.addAttribute( 'mixin', new THREE.BufferAttribute( mixins, 1 ) );
                        geometry.computeBoundingBox();
                        geometry.computeVertexNormals();

                        this.mesh.geometry = geometry;
                        this.mesh.updateMatrix();


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

                    this.counter++;

                    if ( this.counter % fp.appConfig.buildingOptions.riseRate === 0 || this.levels === 0 ) {

                        this.addFloor();

                    }

                    if ( fp.appConfig.buildingOptions.falling ) {

                        var y = - ( this.levelHeight /  ( 2 * fp.appConfig.buildingOptions.riseRate ));
                        this.yOffset += y;
                        this.highResMeshContainer.translateY( y );
                        this.lowResMeshContainer.translateY( y );

                    }

                }
                // NOT WORKING YET
                else if ( !this.destroying && fp.appConfig.buildingOptions.destroyOnComplete ) {

                    this.destroying = true;

                }
                else if ( this.destroying && this.levels > 0 ) {
                    this.counter++;
                    if ( this.counter % fp.appConfig.buildingOptions.riseRate === 0 ) {

                        this.removeFloor();

                    }
                }
                else if ( this.destroying && this.levels === 0 && fp.appConfig.buildingOptions.loopCreateDestroy ) {

                    this.destroying = false;

                }

                if ( fp.appConfig.buildingOptions.turning ) {

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

                var verticesPerLevel = ( this.mesh.geometry.attributes.position.count ) / this.levels;

                for ( var i = 0; i < this.levels; i++ ) {

                    var r = Math.random() * 10;
                    var chance = fp.appConfig.buildingOptions.windowsFlickerRate;

                    if ( Math.random() < chance ) {

                        var v = i * verticesPerLevel;

                        for ( var j = v; j < v + verticesPerLevel; j++ ) {

                            this.mesh.geometry.attributes.mixin.array[ j ] = r;

                        }

                    }

                }

                this.mesh.geometry.attributes.mixin.needsUpdate = true; // important!

            };

            this.updateSimpleBuilding = function () {
                if ( this.levels > 1 ) {
                    if ( !this.destroying )
                        this.lowResMesh.scale.set( 1, this.lowResMesh.scale.y * this.levels / ( this.levels - 1 ), 1 );
                    else
                        this.lowResMesh.scale.set( 1, this.lowResMesh.scale.y * ( this.levels - 1 ) / ( this.levels ), 1 );
                }
                else if ( this.destroying )
                    this.lowResMesh.scale.set( 1, 1, 1 );
            };

            this.translatePosition = function( x, y, z ) {
                this.lod.position.set( x, y, z );
                this.highResMeshContainer.position.set( x, y, z );
                this.lowResMeshContainer.position.set( x, y, z );
            };

            this.windowsOutline = function( value ) {
                if ( value )
                    this.highResMeshContainer.add( this.windowsOutlineContainer );
                else
                    this.highResMeshContainer.remove( this.windowsOutlineContainer );
            };

            this.windowsFill = function( value ) {
                if ( value )
                    this.highResMeshContainer.add( this.windowsFillContainer );
                else
                    this.highResMeshContainer.remove( this.windowsFillContainer );
            };

            /**
             * Initialises the building.
             */
            this.init = function( form, dimensions, position, rotation ) {
                this.originPosition = position;
                // Use Poisson distribution with lambda of 1 to contour building heights instead
                var w = 1 - jStat.exponential.cdf( Math.random() * 9, 1 );
                var d = 1 - jStat.exponential.cdf( Math.random() * 9, 1 );
                // var h =  Math.floor( jStat.exponential.pdf( Math.random(), 50 ))
                var h = Math.floor( jStat.exponential.sample( fp.appConfig.buildingOptions.heightA ) * fp.appConfig.buildingOptions.heightB );
                this.maxWidth = Math.floor( w * 9 ) + fp.appConfig.buildingOptions.heightB;
                this.maxDepth = Math.floor( d * 9 ) + 1;
                this.maxHeight = h + 1;

                this.bottomWindow = 1.0 - ( fp.appConfig.buildingOptions.windowsEndY / 100.0 );
                this.topWindow = 1.0 - ( fp.appConfig.buildingOptions.windowsStartY/ 100.0 );
                this.windowWidth = fp.appConfig.buildingOptions.windowWidth;
                this.windowPercent = fp.appConfig.buildingOptions.windowPercent / 100.0;
                if ( fp.appConfig.buildingOptions.windowsRandomise ) {
                    // Randomise based on a normal distribution
                    var bottomWindowTmp = jStat.normal.inv( Math.random(), this.bottomWindow, 0.1 );
                    var topWindowTmp = jStat.normal.inv( Math.random(), this.topWindow, 0.1 );
                    var windowWidthTmp = jStat.normal.inv( Math.random(), this.windowWidth, 0.1 );
                    var windowPercentTmp = jStat.normal.inv( Math.random(), this.windowPercent, 0.1 );
                    // Coerce value between a min and max
                    var coerceValue = function( num, min, max ) {
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
                    var posY = fp.getHeight( position.x, position.z ) + fp.appConfig.buildingOptions.levelHeight;
                    this.originPosition = new THREE.Vector3( position.x, posY, position.z );
                    this.lod.position.set( position.x, posY, position.z );
                    this.highResMeshContainer.position.set( position.x, posY, position.z );
                    this.lowResMeshContainer.position.set( position.x, posY, position.z );
                }
                if ( !_.isUndefined( rotation ) ) {
                    this.mesh.rotation.set( rotation.x, rotation.y, rotation.z );
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
        fp.Road = function() {
            this.mesh = null;
            this.position = null;
            this.setupRoad = function( _x, _y, _z ) {
                this.x = _x || 0;
                this.y = _y || 0;
                this.z = _z || 0;
            };
            this.shadedShape = function ( points ) {};
            this.update = function() { };
        };

        /**
         * Represents relevant state about the application.
         * @constructor
         * @memberof fp
         * @inner
         */
        fp.AppState = {
            runSimulation: false,
            stepSimulation: false
        };


        /**
         * Singleton Chart object.
         * @type {Object}
         */
        fp.Chart = {
            setupChart: function () {
                var agentDiv = fp.appConfig.agentOptions.initialPopulation * 2;
                fp.chart = new SmoothieChart( { maxValue: agentDiv, minValue: 0.0  } );
                var agentPopulationSeries = new TimeSeries();
                var agentHealthSeries = new TimeSeries();
                var patchValuesSeries = new TimeSeries();
                setInterval( function() {
                    if ( fp.AppState.runSimulation ) {
                        agentPopulationSeries.append( new Date().getTime(), fp.agentNetwork.agents.length );
                        agentHealthSeries.append( new Date().getTime(), agentDiv * jStat( _.map( fp.agentNetwork.agents, function( agent ) { return agent.health; } ) ).mean() / 100 );
                        patchValuesSeries.append( new Date().getTime(), agentDiv * fp.patchNetwork.patchMeanValue );
                    }
                }, 500 );
                var chartCanvas = document.createElement( "canvas" );
                chartCanvas.setAttribute( "id", "chartCanvas-" + fp.container.id );
                chartCanvas.setAttribute( "width", "400" );
                chartCanvas.setAttribute( "height", "100" );
                chartCanvas.setAttribute( "style", "z-index: 1; position: absolute; left: 0px; bottom: 0px  " );
                fp.container.insertBefore( chartCanvas, fp.container.firstChild );
                fp.chart.addTimeSeries( agentPopulationSeries, { fillStyle: "rgba( 0, 0, 255, 0.2 )", lineWidth: 4 } );
                fp.chart.addTimeSeries( agentHealthSeries, { fillStyle: "rgba( 255, 0, 0, 0.2 )", lineWidth: 4 } );
                fp.chart.addTimeSeries( patchValuesSeries, { fillStyle: "rgba( 0, 255, 0, 0.2 )", lineWidth: 4 } );
                // fp.updateChartColors();
                fp.chart.streamTo( chartCanvas, 500 );
                this.updateGraph();
            },

            updateGraph: function() {
                $( "#chartCanvas-" + fp.container.id ).toggle( fp.appConfig.displayOptions.chartShow );
            }
        };





        return FiercePlanet;

    }

);

