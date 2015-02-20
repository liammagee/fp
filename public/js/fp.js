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


    var container = null,
        scene = null,
        camera = null,
        renderer = null,    // Three.js
        controls = null,
        clock = new THREE.Clock(),
        keyboard = new THREEx.KeyboardState(),
        stats = null,
        gui = null,
        chart = null,
        mouseVector = new THREE.Vector3(),
        mouse = { x: 0, y: 0, z: 1 },
        ray = new THREE.Raycaster( new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0) ),
        intersects = [],
        skyBox = null,
        waterMesh = null,    // Landscape variables
        water = null,
        appConfig = null,             // Sim world variables
        agentNetwork = null,
        pathNetwork = null,
        trailNetwork = null,
        terrain = null,
        cursor = null,
        sim = null;

    /**
     * Overall Fierce Planet object.
     * @module fp
     * @namespace fp
     */
    var fp = {

        scene: null,
        appConfig: null,

        /**
         * Represents a network of agents. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        AgentNetwork: function() {

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

                this.AgentNetworkNetworkLink = function(agent1, agent2) {
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
                        var p1 = agent1.vertex.clone(), p2 = agent2.vertex.clone();
                        p1.y += appConfig.agentOptions.size / 8;
                        p2.y += appConfig.agentOptions.size / 8;
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
                this.friendNetworkGeometryCurved = function(vertices) {
                    var networkGeometry = new THREE.Geometry();
                    var len = vertices.length;
                    var spline = new THREE.Spline( vertices );
                    var n_sub = appConfig.displayOptions.networkCurvePoints;
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
                this.friendNetworkGeometry = function(vertices) {
                    if ( !appConfig.displayOptions.networkCurve ) {
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
                    return new THREE.LineBasicMaterial({
                        color: this.networkColor || fp.appConfig.colorOptions.colorNightNetwork,
                        linewidth: 2,
                        opacity: 1.0,
                        blending: THREE.NormalBlending,
                        transparent: false
                    });
                };

                /**
                 * Renders the agent network, creating an array of vertices and material and return a mesh of type THREE.Line.
                 * @return {THREE.Line}
                 */
                this.renderFriendNetwork = function() {
                    if ( !fp.AppState.runSimulation || !appConfig.displayOptions.networkShow )
                        return;

                    if ( !_.isUndefined( this.networkMesh ) )
                        scene.remove( this.networkMesh );
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
                    scene.add(this.networkMesh);
                };

                /**
                 * Establish a link between two agents
                 */
                this.establishLink = function(agent1, agent2) {
                    // Introduce more variability by squaring the probability
                    var chance = Math.pow(appConfig.agentOptions.chanceToJoinNetwork, 2);
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
                this.updateFriendNetwork = function() {
                    if ( !fp.AppState.runSimulation )
                        return;
                    this.renderFriendNetwork();
                };

            };

            /**
             * Creates an initial set of agents.
             */
            this.createInitialAgentPopulation = function() {
                for (var i = 0; i < appConfig.agentOptions.initialPopulation; i++)
                    this.agents.push( this.createAgent() );
                this.buildAgentParticleSystem();
            };

            /**
             * Creates a single agent
             * @return {fp#Agent}
             */
            this.createAgent = function() {
                var vertex = new THREE.Vector3();
                var point = this.randomPointForAgent();
                var x = point.x;
                var z = point.z;
                var y = fp.getHeight(x, z) + appConfig.agentOptions.terrainOffset;
                vertex.x = x;
                vertex.y = y;
                vertex.z = z;

                var agent = new fp.Agent();
                agent.setVertex(vertex);
                agent.setRandomDirection();

                agent.color = "#" + ( appConfig.displayOptions.dayShow ?
                                      appConfig.colorOptions.colorDayAgent.toString(16) :
                                      appConfig.colorOptions.colorNightAgent.toString(16) );
                return agent;
            };

            /**
             * Finds a random point on the terrain where the agent can be generated.
             *
             * @return {coordinate}
             */
            this.randomPointForAgent = function() {
                var x = Math.floor( ( Math.random() - 0.5 ) * appConfig.agentOptions.initialExtent )  + appConfig.agentOptions.initialX;
                var z = Math.floor( ( Math.random() - 0.5 ) * appConfig.agentOptions.initialExtent ) + appConfig.agentOptions.initialY;
                var point = null;

                x *=  appConfig.terrainOptions.multiplier;
                z *=  appConfig.terrainOptions.multiplier;

                if (appConfig.agentOptions.initialCircle) {
                    var normX = x - appConfig.agentOptions.initialX, normZ = z - appConfig.agentOptions.initialY;
                    var radius = Math.sqrt(normX * normX + normZ * normZ);

                    while (radius > appConfig.agentOptions.initialExtent / 2) {
                        point = this.randomPointForAgent();
                        x = point.x;
                        z = point.z;
                        normX = x - appConfig.agentOptions.initialX;
                        normZ = z - appConfig.agentOptions.initialY;
                        radius = Math.sqrt(normX * normX + normZ * normZ);
                    }
                }

                var boundary = (terrain.gridExtent / 2) * appConfig.terrainOptions.multiplier;
                while ( (x <  - boundary || x > boundary ) || (z <  - boundary || z > boundary ) ) {
                    point = this.randomPointForAgent();
                    x = point.x;
                    z = point.z;
                }

                if (appConfig.agentOptions.noWater) {
                    var y = fp.getHeight(x, z);
                    while (y <= 0) {
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
                for (var i = 0; i < this.agents.length; i++) {
                    var agent =  this.agents[i];

                    // Depending on the speed of the simulation, determine whether this agent needs to move
                    if ( (Math.floor( (i / this.agents.length) * fp.timescale.framesToYear ) != fp.timescale.frameCounter % fp.timescale.framesToYear) )  {
                        // Just interpollate the position
                        agent.lastPosition = agent.position;
                        agent.shiftPosition();
                    }
                    else {
                        var underConstruction = (appConfig.buildingOptions.create && agent.buildHome()) ||
                                       (appConfig.roadOptions.create && agent.buildRoad());

                        if ( underConstruction )
                            continue;

                        var r = Math.random();
                        if ( r < appConfig.agentOptions.chanceToFindPathToHome ) {
                            agent.pathComputed = drawPathHome(agent);
                            agent.pathPosition = 0;
                        }

                        // No water around or home built? Move on...
                        agent.move();

                        // Enlist the agent in available networks
                        this.networks.forEach( function( network ) {
                            network.enlistAgent( agent );
                        } );

                        // Then add the vertex
                        var ai = fp.getIndex(this.agents[i].lastPosition.x, this.agents[i].lastPosition.z);
                        if (ai > -1)
                            trailNetwork.trails[ai] = (trailNetwork.trails[ai]) ? trailNetwork.trails[ai] + 1 : 1;

                        // Replace with shader for now
                        if (appConfig.displayOptions.trailsShow && appConfig.displayOptions.trailsShowAsLines) {

                            // Creates a cycle of 5000 trail 'pieces'
                            if (agent.ticks * 2 > appConfig.displayOptions.trailLength)
                                agent.ticks = 0;
                            trailNetwork.globalTrailLine.geometry.vertices[i * appConfig.displayOptions.trailLength + agent.ticks * 2] = agent.lastPosition;
                            trailNetwork.globalTrailLine.geometry.vertices[i * appConfig.displayOptions.trailLength + agent.ticks * 2 + 1] = agent.position;
                            trailNetwork.globalTrailLine.geometry.verticesNeedUpdate = true;
                        }

                        if (agent.grounded)
                            agent.perturbDirection();

                        agent.updateTick();
                    }
                    this.particles.geometry.vertices[i] = agent.vertex;
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
                        if ( appConfig.displayOptions.coloriseAgentsByHealth ) {
                            var agent = this.agents[i];
                            var health = this.agents[i].health;
                            var r = 0;
                            var g = appConfig.displayOptions.dayShow ? 0.0 : 1.0;
                            var b = appConfig.displayOptions.dayShow ? 1.0 : 0.0;
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
                this.agents.forEach( function(agent) { agentGeometry.vertices.push(agent.vertex);} );

                // Shader approach from http://jsfiddle.net/8mrH7/3/
                this.agentParticleSystemAttributes = {
                    alpha: { type: "f", value: [] },
                    color: { type: "c", value: [] }
                };

                for( var i = 0; i < agentGeometry.vertices.length; i ++ ) {
                    this.agentParticleSystemAttributes.alpha.value[ i ] = (fp.agentNetwork.agents[i].health * 0.0075) + 0.025;
                    this.agentParticleSystemAttributes.color.value[ i ] = new THREE.Color( fp.agentNetwork.agents[i].color );
                }

                // point cloud material
                var agentShaderMaterial = fp.agentNetwork.particles.material;
                agentShaderMaterial.attributes = this.agentParticleSystemAttributes;
                scene.remove( fp.agentNetwork.particles );
                this.particles = new THREE.PointCloud( agentGeometry, agentShaderMaterial );
                this.particles.dynamic = true;
                this.particles.sortParticles = true;
                scene.add( this.particles );
            };

            /**
             * Creates a set of attributes to represent each agent in the network.
             */
            this.buildAgentParticleSystem = function() {
                var agentGeometry = new THREE.Geometry();
                this.agents.forEach(function(agent) { agentGeometry.vertices.push(agent.vertex);});

                // Shader approach from http://jsfiddle.net/8mrH7/3/
                this.agentParticleSystemAttributes = {
                    alpha: { type: "f", value: [] },
                    color: { type: "c", value: [] }
                };

                var discTexture = THREE.ImageUtils.loadTexture( "images/sprites/stickman_180.png" );
                if ( !appConfig.agentOptions.useStickman )
                    discTexture = THREE.ImageUtils.loadTexture( "images/sprites/disc.png" );

                // uniforms
                var agentParticleSystemUniforms = {
                    texture:   { type: "t", value: discTexture },
                    size: { type: "f", value: Math.floor( appConfig.agentOptions.size )}
                };

                for( var i = 0; i < agentGeometry.vertices.length; i ++ ) {
                    this.agentParticleSystemAttributes.alpha.value[ i ] = (this.agents[i].health * 0.0075) + 0.025;
                    this.agentParticleSystemAttributes.color.value[ i ] = new THREE.Color( this.agents[i].color );
                }

                // point cloud material
                var agentShaderMaterial = new THREE.ShaderMaterial( {
                    size: appConfig.agentOptions.size,
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

                scene.remove( this.particles );
                this.particles = new THREE.PointCloud( agentGeometry, agentShaderMaterial );
                this.particles.dynamic = true;
                this.particles.sortParticles = true;
                scene.add( this.particles );
            };

            /**
             * Wrapper method for updating individual agents, their network and the shader.
             */
            this.updateAgentNetwork = function() {
                this.updateAgents();
                this.networks.forEach( function(network) { network.updateFriendNetwork() } );
                this.updateAgentShader();
            };

            this.agents = [];
            this.networks = [];
            this.networks.push( new this.AgentNetworkNetwork() );
            this.particles = null;
            this.agentParticleSystemAttributes = null;
        },

        BUILDING_FORMS: {
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
        },

        /**
         * Represents a network of buildings. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        BuildingNetwork: function() {
            this.networkMesh = null;
            this.networkJstsCache = [];
            this.buildings = [];
            this.buildingHash = {};
            this.speedOfConstruction = 0.05;

            /**
             * Generates a random number of levels, width and length for a building
             * @return {object} contains levels, width, length properties
             */
            this.generateRandomDimensions = function() {
                return {
                    levels: appConfig.buildingOptions.minHeight + Math.floor( Math.random() * (appConfig.buildingOptions.maxHeight - appConfig.buildingOptions.minHeight) ) ,
                    width: appConfig.buildingOptions.minWidth + Math.floor( Math.random() * (appConfig.buildingOptions.maxWidth - appConfig.buildingOptions.minWidth)) ,
                    length: appConfig.buildingOptions.minLength + Math.floor( Math.random() * (appConfig.buildingOptions.maxLength - appConfig.buildingOptions.minLength))
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
            this.get2dIndexPoints = function(building) {
                return _.map( this.get2dPoints(building), function(point) { return fp.getIndex(point.x, point.y); }  ) ;
            };

            /**
             * Get a 2-dimensional array of points representing the bounding box
             * of the building.
             * @param  {fp~Building} building
             * @return {Array} points
             */
            this.get2dPointsForBoundingBox = function(building) {
                var points = [];
                var firstFloor = building.highResMeshContainer.children[0],
                    position = building.highResMeshContainer.position,
                    vertices = firstFloor.geometry.vertices,
                    verticesOnBase = vertices.length;
                for (var i = 0; i < verticesOnBase / 2; i ++) {
                    var point  = vertices[i].clone().applyMatrix4( firstFloor.matrix).add(building.highResMeshContainer.position);
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
             * Checks whether this building collides with any existing buildings.
             * @param  {fp~Building} building
             * @return {Boolean}
             */
            this.collidesWithOtherBuildings = function(building) {
                // Quick check
                if (this.buildingHash[fp.getIndex(building.lod.position.x, building.lod.position.z)])
                    return true;
                var buildingGeometry = this.createJstsGeomFromBoundingBox( building );
                for (var i = 0; i < this.networkJstsCache.length; i ++) {
                    var b = this.networkJstsCache[i];
                    var localResult = false;
                    if ( b.intersects(buildingGeometry) )
                        localResult = true;
                    if ( localResult )
                        return true;
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
                if ( !fp.AppState.runSimulation || !appConfig.displayOptions.buildingsShow )
                    return;
                for (var i = 0; i < fp.buildingNetwork.buildings.length; i ++ ) {
                    var building = fp.buildingNetwork.buildings[i];
                    var likelihoodToGrow = Math.random();
                    if ( likelihoodToGrow > fp.likelihoodOfGrowth() )
                        building.update();
                }
            };

            /**
             * Creates a new building, given a position and dimension
             * Some of the logic derived from: http://learningthreejs.com/blog/2013/08/02/how-to-do-a-procedural-city-in-100lines/
             */
            this.createBuilding = function(position, dimensions) {
                var building = new fp.Building();

                // Give the building a form
                building.buildingForm = appConfig.buildingOptions.buildingForm;
                if (appConfig.buildingOptions.randomForm)
                    building.buildingForm = fp.BUILDING_FORMS.names[Math.floor(Math.random() * fp.BUILDING_FORMS.names.length)];

                // Determine a height and develop the geometry
                building.setupBuilding(dimensions);

                // Set rotation and position
                var rotateY = (appConfig.buildingOptions.rotateSetAngle / 180) * Math.PI;
                if (appConfig.buildingOptions.rotateRandomly)
                    rotateY = Math.random() * Math.PI;
                building.lod.rotation.set(0, rotateY, 0);
                building.highResMeshContainer.rotation.set(0, rotateY, 0);
                building.lowResMeshContainer.rotation.set(0, rotateY, 0);

                var posY = fp.getHeight(position.x, position.z) + appConfig.buildingOptions.levelHeight;
                building.lod.position.set(position.x, posY, position.z);
                building.highResMeshContainer.position.set(position.x, posY, position.z);
                building.lowResMeshContainer.position.set(position.x, posY, position.z);
                building.addFloor();

                // Before we add this, try to detect collision
                if (appConfig.buildingOptions.detectBuildingCollisions) {
                    if ( fp.buildingNetwork.collidesWithOtherBuildings(building) )
                        return undefined;
                }

                if (appConfig.buildingOptions.detectRoadCollisions) {
                    if ( fp.buildingNetwork.collidesWithRoads( building ) )
                        return undefined;
                }

                // Add the building to caches
                fp.buildingNetwork.buildings.push(building);
                fp.buildingNetwork.buildingHash[fp.getIndex(position.x, position.z)] = building;
                // Add all ground floor vertices to hash, as crude collision detection
                fp.buildingNetwork.networkMesh.add( building.lod );
                fp.buildingNetwork.networkJstsCache.push( this.createJstsGeomFromBoundingBox( building ) );
                return building;
            };
        },

        /**
         * Represents a network of roads. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        RoadNetwork: function() {
            this.networkMesh = null;
            this.networkJstsCache = [];
            this.roads = {};
            this.indexValues = [];
            this.points = [];
            this.networkGeometry = null;
            this.intersections = [];

            /**
             * Creates a series of points from a start to end points.
             * The "road" will try to follow the path of least resistance
             * if the terrain has variable height, effectively "curving"
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
                var distance = Math.sqrt(xd * xd + zd * zd) / appConfig.roadOptions.roadSegments,
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
                    for (var j = 1; j <= appConfig.roadOptions.roadDeviation; j++) {
                        var xL = x0 + Math.cos(angleLeft) * j,
                            zL = z0 + Math.sin(angleLeft) * j,
                            yL = fp.getHeight(xL, zL) + yOffset;
                        if ( yL < y && yL > 0 ) {
                            x = xL;
                            y = yL;
                            z = zL;
                        }
                    }
                    for (k = 1; k <= appConfig.roadOptions.roadDeviation; k++) {
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
            this.addRoad = function(p1, p2, roadWidth) {
                var points = this.getRoadTerrainPoints(p1, p2);

                // Use a cut-off of 5 intersecting points to prevent this road being built
                var jstsCoords = _.map( points, function(p) { return new jsts.geom.Coordinate(p.x, p.z); } );
                var jstsGeom = new jsts.geom.LineString(jstsCoords);
                var overlap = fp.roadNetwork.countCollisions( jstsGeom );
                if (overlap > appConfig.roadOptions.overlapThreshold)
                    return false;

                // The above code probably should supercede this
                var thisIndexValues = _.map(points, function(p) { return fp.getIndex(p.x,p.z); });
                overlap = _.intersection(fp.roadNetwork.indexValues, thisIndexValues).length;
                if (overlap > appConfig.roadOptions.overlapThreshold)
                    return false;

                var extrudePath = new THREE.SplineCurve3( points );
                var roadColor = (appConfig.displayOptions.dayShow) ? appConfig.colorOptions.colorDayRoad : appConfig.colorOptions.colorNightRoad;
                // var roadMaterial = new THREE.MeshBasicMaterial({ color: roadColor });
                var roadMaterial = new THREE.MeshLambertMaterial({ color: roadColor });
                roadMaterial.side = THREE.DoubleSide;
                var roadGeom = new THREE.TubeGeometry(extrudePath, points.length, roadWidth, appConfig.roadOptions.roadRadiusSegments, false);

                var adjust = appConfig.roadOptions.flattenAdjustment,
                    lift = appConfig.roadOptions.flattenLift;
                var vertices = roadGeom.vertices;
                for (var i = 0; i <= vertices.length - appConfig.roadOptions.roadRadiusSegments; i += appConfig.roadOptions.roadRadiusSegments) {
                    var coil = vertices.slice(i, i + appConfig.roadOptions.roadRadiusSegments);
                    var mean = jStat.mean(_.map(coil, function(p) { return p.y; } ) );
                    for (var j = 0; j < coil.length; j++) {
                        var y = coil[j].y;
                        var diff = y - mean;
                        var newDiff = diff * adjust;
                        vertices[i+j].y = lift + mean + newDiff;
                    }
                }

                var roadMesh = new THREE.Mesh(roadGeom, roadMaterial);
                fp.roadNetwork.networkMesh.add(roadMesh);
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

            //
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
        },

        /**
         * Represents a network of patches. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        PatchNetwork: function() {
            this.plane = null;
            this.patches = {};
            this.patchValues = [];
            this.patchMeanValue = 0;
            this.patchSize = 4;

            this.initialisePatches = function() {
                var dim = ( terrain.gridPoints / fp.patchNetwork.patchSize );
                fp.patchNetwork.patchValues = new Array(dim * dim);
                for (var i = 0; i < fp.patchNetwork.patchValues.length; i++)
                    fp.patchNetwork.patchValues[i] = new fp.Patch(Math.random());
            };

            this.buildPatchMesh = function() {
                var patchMaterial = new THREE.MeshBasicMaterial( { vertexColors: THREE.FaceColors } );
                this.plane = new THREE.Mesh(terrain.plane.geometry.clone(), patchMaterial );
                this.plane.rotation.set( -Math.PI / 2, 0, 0);
                scene.add( this.plane );
            };

            this.reviseValues = function() {
                this.patchMeanValue = 0;
                for (var i = 0; i < this.patchValues.length; i++) {
                    var patch = this.patchValues[i];
                    if ( !_.isUndefined( this.patches[i] ) ) {
                        var len = this.patches[i].length;
                        patch.updateValue( - len / 100);
                    }
                    else
                        patch.updateValue(0.0001);
                    this.patchMeanValue += patch.value;
                }
                this.patchMeanValue /= this.patchValues.length;
            };

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

            this.updatePatchValues = function() {
                if ( appConfig.displayOptions.patchesUpdate && fp.AppState.runSimulation )
                    this.reviseValues();

                if ( appConfig.displayOptions.patchesShow ) {
                    if (appConfig.displayOptions.patchesUseShader) {
                        if (this.plane !== null)
                            scene.remove(this.plane);
                        this.updateTerrainPatchAttributes();
                    }
                    else
                        this.updatePlaneGeometryColors();
                }
            };

            this.updatePlaneGeometryColors = function() {
                if (this.plane === null)
                    return;
                var geometry = this.plane.geometry;
                if ( _.isUndefined( geometry.faces ) && geometry.faces[0] === null )
                    return;

                if (scene.children.indexOf(this.plane) == -1)
                    scene.add(this.plane);
                var dim = terrain.gridPoints / this.patchSize;
                for (var y = 0; y < dim; y++) {
                    for (var x = 0; x < dim; x++) {
                        var baseIndex = y * dim + x;
                        var patch = this.patchValues[baseIndex];
                        var arrayX = x * terrain.gridSize * 2;
                        var arrayY = y * terrain.gridSize * 2;
                        var geoIndex = ((terrain.gridPoints - 1) * arrayY) + arrayX;
                        if (geometry.faces[geoIndex] === null)
                            return;
                        for (var i = arrayY; i < arrayY + (terrain.gridSize * 2); i += 2) {
                            for (var j = arrayX; j < arrayX + (terrain.gridSize * 2); j ++) {
                                var index = ((terrain.gridPoints - 1) * i) + j;
                                if (geometry.faces[index]) {
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

            this.updateTerrainPatchAttributes = function() {
                if (_.isUndefined(this.patchValues))
                    return;
                var pl = Math.sqrt(this.patchValues.length);

                for (var i = 0; i < this.patchValues.length; i++) {
                    var val = this.patchValues[i].value;
                    for (var j = 0; j <= this.patchSize + 1; j++) {
                        var rows = (this.patchSize * Math.floor(i / pl)) * terrain.gridPoints + j * terrain.gridPoints;
                        for (var k = 0; k <= this.patchSize + 1; k++) {
                            var cols = (i % pl) * (this.patchSize) + k;
                            var cell = rows + cols;
                            terrain.plane.geometry.attributes.patch.array[cell] = val;
                        }
                    }
                }
                terrain.plane.geometry.attributes.patch.needsUpdate = true;
            };

            this.togglePatchesStateWithShader = function() {
                if (! appConfig.displayOptions.patchesShow) {
                    for (var i = 0; i < terrain.plane.geometry.attributes.patch.array.length; i++)
                        terrain.plane.geometry.attributes.patch.array[i] = 0.0;
                    terrain.plane.geometry.attributes.patch.needsUpdate = true;
                    terrain.richTerrainMaterial.uniforms = terrain.nightTerrainUniforms;
                    terrain.richTerrainMaterial.needsUpdate = true; // important!
                }
                else
                    this.updateTerrainPatchAttributes();
            };

            this.togglePatchesStateWithoutShader = function() {
                if ( appConfig.displayOptions.patchesShow ) {
                    if ( this.plane === null )
                        this.buildPatchMesh();
                    else
                        scene.add(this.plane);
                }
                else
                    scene.remove(this.plane);
            };
        },

        /**
         * Represents a network of trails. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        TrailNetwork: function() {
            this.trails = {};
            this.trailMeshes = null;
            this.globalTrailLine = null;
            this.updateTrails = function() {
                if ( !fp.AppState.runSimulation )
                    return;

                if ( appConfig.displayOptions.trailsShow &&
                    !appConfig.displayOptions.trailsShowAsLines) {
                    var weightMax = _.chain(trailNetwork.trails).values().max().value();
                    for (var j in trailNetwork.trails) {
                        var weight = trailNetwork.trails[j];
                        var weightNormed = weight / weightMax;
                        var weightAdjusted = Math.pow(weightNormed, 0.2);
                        terrain.plane.geometry.attributes.trail.array[k] = weightAdjusted;
                    }
                }
                else {
                    for (var k in trailNetwork.trails)
                        terrain.plane.geometry.attributes.trail.array[k] = 0.0;
                }
                terrain.plane.geometry.attributes.trail.needsUpdate = true;
            };
        },

        Cursor: function() {
            this.cell = null;
            this.createCell = function(x, y) {
                var halfGrid = terrain.gridExtent / 2;
                var cellSize = terrain.gridExtent / (terrain.gridPoints - 1);
                var cellPixels = (terrain.gridSize  * cellSize);
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
                for (i = 0; i < terrain.gridSize; i ++) {
                    geometry.vertices.push(new THREE.Vector3(ccX, ccY, ccZ) );
                    ccX += Math.round(cellSize);
                    ccZ = fp.getHeight(ccX, ccY) + 1;
                }
                for (i = 0; i < terrain.gridSize; i ++) {
                    geometry.vertices.push(new THREE.Vector3(ccX, ccY, ccZ) );
                    ccY += Math.round(cellSize);
                    ccZ = fp.getHeight(ccX, ccY) + 1;
                }
                for (i = 0; i < terrain.gridSize; i ++) {
                    geometry.vertices.push(new THREE.Vector3(ccX, ccY, ccZ) );
                    ccX -= Math.round(cellSize);
                    ccZ = fp.getHeight(ccX, ccY) + 1;
                }
                for (i = 0; i < terrain.gridSize; i ++) {
                    geometry.vertices.push(new THREE.Vector3(ccX, ccY, ccZ) );
                    ccY -= Math.round(cellSize);
                    ccZ = fp.getHeight(ccX, ccY) + 1;
                }
                geometry.vertices.push(new THREE.Vector3(ccX, ccY, ccZ) + appConfig.agentOptions.size);
                if (this.cell)
                    ne.remove(this.cell);
                this.cell = new THREE.Line(geometry, material);
                scene.add(this.cell);
            };
            this.createCellFill = function(x, y) {
                var halfGrid = terrain.gridExtent / 2;
                var cellSize = terrain.gridExtent / (terrain.gridPoints - 1);
                var cellPixels = terrain.gridSize  * cellSize;
                var cellX = Math.floor((x + halfGrid) / cellPixels );
                var cellY = Math.floor((y + halfGrid) / cellPixels);
                var ccX = (cellX * cellPixels) - halfGrid + cellPixels / 2;
                var ccY = (cellY * cellPixels) - halfGrid + cellPixels / 2;
                var ccZ = 0;

                var arrayDim = terrain.gridPoints;
                var arraySize = terrain.gridExtent / arrayDim;
                var arrayX = Math.floor((x / appConfig.terrainOptions.multiplier + halfGrid) / arraySize );
                var arrayY = Math.floor((halfGrid + y / appConfig.terrainOptions.multiplier) / arraySize );
                var vertices = terrain.plane.geometry.attributes.position.array;
                var newVertices = [];
                var cellFill, cellMaterial;
                if (_.isUndefined(this.cell)) {
                    cellFill = new THREE.PlaneGeometry(cellPixels, cellPixels, terrain.gridSize, terrain.gridSize);
                    scene.remove(this.cell);
                    cellMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000,  wireframe: false });
                    cellMaterial.side = THREE.DoubleSide;
                    this.cell = new THREE.Mesh(cellFill, cellMaterial);
                    this.cell.rotation.set( -Math.PI / 2, 0, 0);
                    this.cell.geometry.dynamic = true;
                    scene.add(this.cell);
                }
                var halfCell = Math.round(terrain.gridSize / 2);
                for (var i = arrayY, counter = 0; i < arrayY + terrain.gridSize + 1; i ++) {
                    for (var j = arrayX; j < arrayX + terrain.gridSize + 1; j ++, counter++) {
                        var index = 3 * (arrayDim * (i - halfCell) + (j - halfCell));
                        this.cell.geometry.vertices[counter] = new THREE.Vector3(
                            vertices[index], vertices[index + 1], vertices[index + 2] + appConfig.agentOptions.terrainOffset
                        );
                    }
                }
                this.cell.geometry.verticesNeedUpdate = true;
            };
        },


        /**
         * Represents a network of paths. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        PathNetwork: function() {
            this.networkMesh = null;
            this.pathCache = {};
            this.stepsPerNode = terrain.ratioExtentToPoint;
            this.graphAStar = null;
            this.nodes = [];
            this.opts = null;
            this.setupAStarGraph = function() {
                this.opts = {
                    // wallFrequency: $selectWallFrequency.val(),
                    // terrain.gridSize: $selectGridSize.val(),
                    // debug: $checkDebug.is("checked"),
                    diagonal: true,
                    closest: true
                };
                for (var i = 0; i < terrain.gridPoints; i++) {
                    var nodeRow = [];
                    for (var j = 0; j < terrain.gridPoints; j++) {
                        var weight = 1 - fp.getHeightForIndex( i * terrain.gridPoints + j) / terrain.maxTerrainHeight;
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
                var x = index % terrain.gridPoints, y = Math.floor(index / terrain.gridPoints);
                return this.graphAStar.grid[x][y];
            };

            this.findPathHome = function(agent) {
                if (! agent.home)
                    return [];
                var start = this.nodeAt(agent.home.lod.position);
                var end = this.nodeAt(agent.position);
                var path = astar.astar.search( this.graphAStar, start, end, { closest: opts.closest } );
                return path;
            };

            this.drawPathHome = function(agent) {
                var path = this.findPathHome(agent);
                if ( path.length < 2 ) // Need 2 points for a line
                    return undefined;
                var pathGeom = new THREE.Geometry();
                path.forEach(function(point) {
                    var x = (  point.x ) * terrain.ratioExtentToPoint - terrain.halfExtent,
                        z = (  point.y ) * terrain.ratioExtentToPoint - terrain.halfExtent,
                        y = fp.getHeight(x, z) + appConfig.agentOptions.terrainOffset,
                        point3d = new THREE.Vector3(x, y, z);
                    pathGeom.vertices.push(point3d);
                });
                var pathMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 10 });
                var pathLine = new THREE.Line( pathGeom, pathMaterial );
                this.networkMesh.add( pathLine );
                this.pathCache[agent] = this.networkMesh.children.length - 1;
                return path;
            };

            this.drawPathHomeForEveryone = function() {
                this.children.forEach( function(child) { this.networkMesh.remove(child); } );
                var ahaway = _.select(fp.agentNetwork.agents, function(agent) {
                    var v = this.drawPathHome(agent);
                    agent.pathComputed = v;
                    agent.pathPosition = 0;
                    return v && v.length > 0 && agent.home !== null && agent.position != agent.home.lod.position;
                });
            };

            this.updatePathsState = function() {
                if ( !appConfig.displayOptions.pathsShow )
                    scene.remove( pathNetwork.networkMesh );
                else
                    scene.add( pathNetwork.networkMesh );
            };
        },

        TERRAIN_MAPS: [ "assets/syd2.bin", "assets/mel2.bin" ],

        /**
         * Represents the terrain of the world.
         * @constructor
         * @memberof fp
         * @inner
         */
        Terrain: function() {
            this.plane = null;
            this.richTerrainMaterial = null;
            this.simpleTerrainMaterial = null;
            this.dayTerrainUniforms = null;
            this.nightTerrainUniforms = null;
            this.terrainMapIndex = 0;
            this.gridExtent = 8000;
            this.halfExtent = this.gridExtent / 2;
            this.gridPoints = 400;
            this.ratioExtentToPoint = this.gridExtent / this.gridPoints;
            this.maxTerrainHeight = 400;
            this.gridSize = 4;

            this.loadTerrain = function( callback ) {
                var terrainLoader = new THREE.TerrainLoader();
                // var terrain = this;
                terrainLoader.load(fp.TERRAIN_MAPS[terrain.terrainMapIndex], function(data) {
                    scene.remove(terrain.plane);
                    var size = terrain.gridExtent * appConfig.terrainOptions.multiplier;
                    var geometry = new THREE.PlaneBufferGeometry( size, size, terrain.gridPoints - 1, terrain.gridPoints - 1 );

                    // Use logic from math.stackexchange.com
                    var vertices = geometry.attributes.position.array;
                    var i, j, l = vertices.length,
                        n = Math.sqrt(l),
                        k = l + 1;
                    if ( appConfig.terrainOptions.loadHeights ) {
                        for (i = 0, j = 0; i < l; i++, j += 3 ) {
                            geometry.attributes.position.array[ j + 2 ] = data[ i ] / 65535 * terrain.maxTerrainHeight * appConfig.terrainOptions.multiplier;
                        }
                    }
                    else {
                        for (i = 0, j = 0; i < l; i++, j += 3 ) {
                            geometry.attributes.position.array[ j + 2 ] = 10;
                        }
                    }

                    terrain.simpleTerrainMaterial = new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: appConfig.displayOptions.wireframeShow });
                    terrain.simpleTerrainMaterial.side = THREE.DoubleSide;
                    terrain.simpleTerrainMaterial.color.setHSL( 0.095, 1, 0.75 );

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

                    terrain.dayTerrainUniforms = {
                        seaColor: { type: "c", value: new THREE.Color(appConfig.colorOptions.colorDayTerrainSea) },
                        lowland1Color: { type: "c", value: new THREE.Color(appConfig.colorOptions.colorDayTerrainLowland1) },
                        lowland2Color: { type: "c", value: new THREE.Color(appConfig.colorOptions.colorDayTerrainLowland2) },
                        midlandColor: { type: "c", value: new THREE.Color(appConfig.colorOptions.colorDayTerrainMidland) },
                        highlandColor: { type: "c", value: new THREE.Color(appConfig.colorOptions.colorDayTerrainHighland) },
                        size: { type: "f", value: Math.floor(appConfig.agentOptions.size / 2)},
                        maxHeight: { type: "f", value: terrain.maxTerrainHeight * appConfig.terrainOptions.multiplier }
                    };
                    terrain.nightTerrainUniforms = {
                        seaColor: { type: "c", value: new THREE.Color(appConfig.colorOptions.colorNightTerrainSea) },
                        lowland1Color: { type: "c", value: new THREE.Color(appConfig.colorOptions.colorNightTerrainLowland1) },
                        lowland2Color: { type: "c", value: new THREE.Color(appConfig.colorOptions.colorNightTerrainLowland2) },
                        midlandColor: { type: "c", value: new THREE.Color(appConfig.colorOptions.colorNightTerrainMidland) },
                        highlandColor: { type: "c", value: new THREE.Color(appConfig.colorOptions.colorNightTerrainHighland) },
                        size: { type: "f", value: Math.floor(appConfig.agentOptions.size / 2)},
                        maxHeight: { type: "f", value: terrain.maxTerrainHeight * appConfig.terrainOptions.multiplier }
                    };
                    terrain.richTerrainMaterial = new THREE.ShaderMaterial({
                        uniforms: fp.ShaderUtils.lambertUniforms( terrain.nightTerrainUniforms ),
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
                    if ( appConfig.terrainOptions.loadHeights ) {
                        terrain.plane = new THREE.Mesh( geometry, terrain.richTerrainMaterial );
                    }
                    else {
                        terrain.plane = new THREE.Mesh( geometry, terrain.simpleTerrainMaterial );
                    }
                    terrain.plane.castShadow = true;
                    terrain.plane.receiveShadow = true;
                    terrain.plane.rotation.set( -Math.PI / 2, 0, 0);
                    if ( appConfig.displayOptions.terrainShow )
                        scene.add( terrain.plane );

                    if ( appConfig.displayOptions.patchesShow )
                        fp.patchNetwork.buildPatchMesh();
                    terrain.createTerrainColors();
                    fp.toggleDayNight();
                    pathNetwork.setupAStarGraph();

                    fp.animate(); // Kick off the animation loop
                    if ( !_.isUndefined(callback) )
                        callback(); // Run the callback
               });
            };

            this.flattenTerrain = function() {
                if ( !appConfig.displayOptions.cursorShow )
                    return;

                var vertices = this.plane.geometry.attributes.position.array;
                var i, point, meanHeight = 0;
                for (i = 0; i < cursor.cell.geometry.vertices.length; i++) {
                    point = cursor.cell.geometry.vertices[i];
                    meanHeight += fp.getHeight(point.x, - point.y);
                }
                meanHeight /= cursor.cell.geometry.vertices.length;
                for (i = 0; i < cursor.cell.geometry.vertices.length; i++) {
                    point = cursor.cell.geometry.vertices[i];
                    var index = fp.getIndex(point.x, - point.y);
                    this.plane.geometry.attributes.position.array[3 * index + 2] = meanHeight;
                }
                this.plane.geometry.attributes.position.needsUpdate = true;
                this.plane.geometry.verticesNeedUpdate = true;
            };

            this.createTerrainColors = function () {
                for (var y = 0; y < 99; y++) {
                    for (var x = 0; x < 99; x++) {
                        var r = Math.random();
                        var color = new THREE.Color(r, r, r);
                        var arrayX = x * terrain.gridSize * 2;
                        var arrayY = y * terrain.gridSize * 2;
                        for (var i = arrayY; i < arrayY + (terrain.gridSize * 2); i += 2) {
                            for (var j = arrayX; j < arrayX + (terrain.gridSize * 2); j ++) {
                                var index = ((terrain.gridPoints - 1) * i) + j;
                                if (terrain.plane.geometry.attributes.uv.array[index]) {
                                    terrain.plane.geometry.attributes.uv.array[index] = color;
                                    terrain.plane.geometry.attributes.uv.array[index + 1] = color;
                                    terrain.plane.geometry.attributes.uv.array[index + 1] = color;
                                }
                            }
                        }

                    }
                }
                terrain.plane.geometry.color
            };

            this.updateTerrainPlane = function() {
                if ( !appConfig.displayOptions.terrainShow )
                    scene.remove( terrain.plane );
                else
                    scene.add( terrain.plane );
            };

        },

        /**
         * Represents the time scale used by the world.
         * @constructor
         * @memberof fp
         * @inner
         */
        Timescale: function() {     // Time variables
            this.initialYear = 1800;
            this.endYear = 2200;
            this.currentYear = this.initialYear;
            this.MAX_FRAMES_TO_YEAR = 480;
            this.MIN_FRAMES_TO_YEAR = 1;
            this.TOP_SPEED = 60 / this.MIN_FRAMES_TO_YEAR;
            this.MIN_FRAMES_TO_YEAR = null;
            this.framesToYear = 32;
            this.frameCounter = 0;
        },

        /**
         * Represents a mobile and alive agent
         * @constructor
         * @memberof fp
         * @inner
         */
        Agent: function() {

            /**
             * @memberof Agent
             */
            this.updateTick = function() {
                this.ticks++;
            };

            /**
             * @memberof Agent
             */
            this.setDirection = function(dir) {
                this.direction = dir;
            };

            /**
             * @memberof Agent
             */
            this.setVertex = function(v) {
                this.vertex = this.lastPosition = this.position = v;
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
                    ( Math.random() < appConfig.agentOptions.visitHomeBuilding ) :
                     ( Math.random() < appConfig.agentOptions.visitOtherBuilding );
            };
            /**
             * @memberof Agent
             */
            this.updateGroundedState = function(building) {
                var xl = this.lastPosition.x, yl = this.lastPosition.y, zl = this.lastPosition.z,
                    xd = this.direction.x, yd = this.direction.y, zd = this.direction.z;

                if ( !this.grounded ) {
                    var base = fp.getHeight(xl, zl) + appConfig.agentOptions.terrainOffset;
                    if (yl <= base && yd < 0)
                        this.grounded = true;
                }
                else if ( !_.isUndefined( building ) && this.goingUp( building ) ) { // grounded == true
                    this.grounded = false;
                }
            };
            /**
             * @memberof Agent
             */
            this.nextComputedDirection = function() {
                if ( !this.pathComputed || this.pathPosition >= this.pathComputed.length - 1 )
                    return undefined;
                // If we have prearranged a path, ensure the current direction points towards that
                var nextNode = this.pathComputed[this.pathPosition + 1];
                var x = (nextNode.x * terrain.ratioExtentToPoint) - terrain.halfExtent,
                    z = (nextNode.z * terrain.ratioExtentToPoint) - terrain.halfExtent,
                    xd = x - this.position.x,
                    zd = z - this.position.z,
                    xDir = xd / pathNetwork.stepsPerNode,
                    zDir = zd / pathNetwork.stepsPerNode,
                    dir = new THREE.Vector3(xDir, 0, zDir);

                this.pathPosition++;
                if (this.pathPosition >= this.pathComputed.length - 1){
                    this.pathPosition = 0;
                    this.pathComputed = undefined;
                    pathNetwork.networkMesh.remove(pathNetwork.pathCache[this]);
                    delete pathNetwork.pathCache[this];
                    this.setRandomDirection();
                }
                return dir;
            };

            /**
             * @memberof Agent
             */
            this.candidateDirections = function() {
                // Check if we are in a building, and offer possibility of going up
                var xl = this.lastPosition.x, yl = this.lastPosition.y, zl = this.lastPosition.z,
                    xd = this.direction.x, yd = this.direction.y, zd = this.direction.z,
                    isAlreadyOnRoad = fp.roadNetwork.indexValues.indexOf(fp.getIndex(xl, zl)) > -1;

                var directionCount = 10, directions = new Array(directionCount);

                // Work out if we have a precomputed path
                var dir = this.nextComputedDirection();
                if (!_.isUndefined(dir))
                    return [ [dir, 1.0] ];

                // Update whether we are in a building, and should be going up or down
                var building = this.findBuilding();
                this.updateGroundedState(building);

                // Weight variables
                var weight = 1.0, weightForRoadIsSet = false;

                // Pre-calculate speed and current angle
                var newSpeed = Math.random() * this.speed / 2,
                    angle = Math.atan2(zd, xd),
                    hyp = Math.sqrt(xd * xd + zd * zd),
                    divisor = (directionCount - 2) / 2;

                for (var i = 0; i < directionCount; i++) {
                    if ( ( i < 8 && ! this.grounded ) || ( i >= 8 && this.grounded ) )
                        continue; // Move horizontally if grounded, vertically if not

                    if (i < 8 && this.grounded) { // Horizonal directions
                        var newAngle = angle + (i * Math.PI / divisor);
                        xd = Math.cos(newAngle) * hyp;
                        yd = 0;
                        zd = Math.sin(newAngle) * hyp;
                    }
                    else if ( !this.grounded && i >= 8 ) { // Vertical directions
                        xd = 0;
                        yd = (i == 8) ? newSpeed : -newSpeed;
                        zd = 0;
                    }

                    // Calculate new position
                    var xn = xl + xd, yn = yl + yd, zn = zl + zd,
                        isRoad = (fp.roadNetwork.indexValues.indexOf(fp.getIndex(xn, zn)) > -1);

                    // If we've had a horizontal shift, for now neutralise the vertical to the terrain height
                    if (yd === 0) {
                        yn = fp.getHeight(xn, zn);
                        // Smooth the transition between heights
                        yd = ((appConfig.agentOptions.terrainOffset + yn) - yl) / terrain.ratioExtentToPoint;
                    }
                    if (yn === null)
                        continue; // Off the grid - don't return this option

                    // Work out weights

                    if (i === 0) { // Current direction most preferred
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
                    if (yn > yl && this.grounded && appConfig.agentOptions.noUphill)
                        weight *= yl / yn;

                    // If currect direction is moving to water, set the preference low
                    if (i === 0 && yn <= 0 && appConfig.agentOptions.noWater)
                        weight = 0.0001;

                    // If inside a building, adjust weights
                    if ( !this.grounded && !_.isUndefined( building ) ) {
                        var buildingHeight = building.levels * appConfig.buildingOptions.levelHeight + building.lod.position.y;
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
                    directions[i] = [new THREE.Vector3(xd, yd, zd), weight];
                }

                // Compact directions and sort by weight descending
                directions = _.chain(directions).compact().sort(function(a,b) { return (a[1] > b[1]) ? 1 : (a[1] < b [1]? -1 : 0); }).value();

                // If no directions are found, select one randomly
                if (directions.length === 0)
                    directions.push([this.randomDirection(), 1.0]);

                return directions;
            };

            /**
             * @memberof Agent
             */
            this.bestCandidate = function() {
                var directions = this.candidateDirections();

                // Simple version - highest weight wins
                // var bestCandidate = _.chain(directions).sortBy(function(a) {return a[1];} ).last().value()[0];

                // Alternative approach - a direction is pulled from a weighted list of possibilities
                var total = _.chain(directions).map(function(d) { return d[1]; } ).reduce(function(memo, num) { return memo + num; }, 0).value();
                var weightsNormed = _.chain(directions).map(function(d) { return d[1] / total; } ).sort().value();
                // This convoluted expression simply generates a set of intervals from the normalised weights
                // e.g. [0.25, 0.25, 0.25 ,0.25] => [0, 0.25, 0.5, 0.75, 1.0]
                var intervals = _.reduce(weightsNormed,
                    function(a, b) {
                        var v = _.reduce(a, function(x, y) { return y;}, 1);
                        return a.concat(v + b);
                    }, [0]);
                var r = Math.random();
                var index = 0;
                // Note the interval array is initialisaed with an addition zero
                for (var i = 0; i < intervals.length - 1; i++) {
                    var a = intervals[i], b = intervals[i + 1];
                    if (r >= a && r < b) {
                        index = i;
                        break;
                    }
                }
                return directions[index][0];
            };

            /**
             * @memberof Agent
             */
            this.shiftPosition = function() {
                var directionAtSpeed = this.direction.clone().multiplyScalar( 16 / fp.timescale.framesToYear );
                this.vertex = this.lastPosition.clone().add(directionAtSpeed);
                this.position = this.vertex.clone();
            };

            /**
             * @memberof Agent
             */
            this.move = function() {
                this.lastPosition = this.position;
                this.setDirection(this.bestCandidate());
                this.shiftPosition();
            };

            /**
             * @memberof Agent
             */
            this.randomDirection = function() {
                return new THREE.Vector3(this.speed * (Math.random() - 0.5), 0, this.speed * (Math.random() - 0.5));
            };

            /**
             * @memberof Agent
             */
            this.setRandomDirection = function() {
                this.setDirection(this.randomDirection());
            };

            /**
             * @memberof Agent
             */
            this.perturbDirection = function() {
                this.direction.x += this.perturbBy * (Math.random() - 0.5);
                this.direction.z += this.perturbBy * (Math.random() - 0.5);
            };

            /**
             * @memberof Agent
             */
            this.buildHome = function() {
                if (this.home !== null)
                    return false;

                if (this.position === null)
                    return false;

                var index = fp.getIndex(this.position.x, this.position.z);
                if (_.isUndefined(index))
                    return false;

                // Don't build in an existing position
                if ( !_.isUndefined(fp.buildingNetwork.buildingHash[index]) )
                    return false;

                var dimensions = fp.buildingNetwork.generateRandomDimensions();

                if ( fp.buildingNetwork.buildings.length === 0 ) { // If there are no buildings, build an initial "seed"
                    this.home = fp.buildingNetwork.createBuilding(this.position, dimensions);
                    return ( !_.isUndefined(this.home) );
                }
                else if (fp.buildingNetwork.networkMesh.children.length >= appConfig.buildingOptions.maxNumber)
                    return false;

                if ( !_.isNull(stats) && stats.fps <= 10 )
                    return false;

                // Simple test of local roads, water, buildings and building height
                var roadsProximate = fp.checkProximityOfRoads(index),
                    roadsSig = (1 - appConfig.buildingOptions.roads);
                var waterProximate = fp.checkProximityOfWater(index),
                    waterSig = (1 - appConfig.buildingOptions.water);
                var buildingsProximate = fp.checkProximityOfBuildings(index),
                    buildingSig = (1 - appConfig.buildingOptions.otherBuildings);
                var buildingHeightProximate = fp.checkProximiteBuildingHeight(index),
                    buildingHeightSig = (1 - appConfig.buildingOptions.buildingHeight);

                if ( roadsProximate > roadsSig ||
                     waterProximate > waterSig ||
                     buildingsProximate > buildingSig ||
                     buildingHeightProximate > buildingHeightSig ) {
                    this.home = fp.buildingNetwork.createBuilding(this.position, dimensions);
                    return ( !_.isUndefined(this.home) );
                }
                return false;
            };

            /**
             * Builds a road
             */
            this.buildRoad = function() {
                var xOrig = this.position.x,
                    zOrig = this.position.z,
                    index = fp.getIndex(xOrig, zOrig),
                    xInit = appConfig.agentOptions.initialX,
                    zInit = appConfig.agentOptions.initialY,
                    xd = (xOrig - xInit),
                    zd = (zOrig - zInit),
                    distanceFromInitialPoint = Math.sqrt(xd * xd + zd * zd),
                    buildingIndex = _.map(fp.buildingNetwork.buildings, function(building) { return fp.getIndex(building.lod.position.x, building.lod.position.z); } );

                if (fp.roadNetwork.networkMesh.children.length >= appConfig.roadOptions.maxNumber)
                    return false;

                if ( !_.isNull(stats) && stats.fps <= 10 )
                    return false;

                if (appConfig.displayOptions.buildingsShow) {
                    if ( fp.buildingNetwork.buildings.length === 0 ) {
                        return false;
                    }
                    else if ( fp.buildingNetwork.buildings.length == 1 ) {
                        if ( buildingIndex.indexOf( index ) == -1 )
                            return false;
                    }
                }
                if (fp.roadNetwork.indexValues.length === 0) {
                    if (distanceFromInitialPoint > appConfig.roadOptions.initialRadius)
                        return false;
                }
                else {
                    if (fp.roadNetwork.indexValues.indexOf(index) == -1)
                        return false;
                    if ( buildingIndex.indexOf( index ) == -1 ) {
                        var r = Math.random();
                        var chance = 1 / ( Math.log(distanceFromInitialPoint + 1) * appConfig.roadOptions.probability );
                        if (chance < r)
                            return false;
                    }
                }

                // Pick a random direction to create a road
                var xr = Math.random() * 2 - 0.5,
                    zr = Math.random() * 2 - 0.5,
                    lenMinimum = appConfig.roadOptions.lenMinimum,
                    lenMaximum = appConfig.roadOptions.lenMaximum,
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
                                ( 1 - jStat.exponential.cdf(lenFactor, appConfig.roadOptions.lenDistributionFactor) ),
                    xExtent = xr * totalLen,
                    zExtent = zr * totalLen,
                    xEnd = this.position.x + xExtent,
                    zEnd = this.position.z + zExtent,
                    yEnd = fp.getHeight(xEnd, zEnd),
                    endPoint = new THREE.Vector3(xEnd, yEnd, zEnd),
                    xe = xOrig - xEnd,
                    ze = zOrig - zEnd,
                    distanceFromEnd = Math.sqrt(xe * xe + ze * ze),
                    width = Math.ceil( ( ( ( 1 / Math.log(distanceFromInitialPoint + 10) ) ) * Math.log( distanceFromEnd ) ) * appConfig.roadOptions.roadWidth );
                return fp.roadNetwork.addRoad(this.position, endPoint, width);
            };
            this.vertex = null;
            this.direction = null;
            this.speed = 2.0;
            this.perturbBy = 0.05;
            this.lastPosition = null;
            this.position = null;
            this.grounded = true;
            this.alpha =  0.5 + (Math.random() / 2);
            this.color = "#ff0000"; // Red. Alternative for this model is blue: "#0000ff"
            this.ticks = 0;

            this.home = null;
            this.health = 100;
            this.gender = Math.random() < 0.5 ? "f": "m";
            this.children = [];
            this.children = [];
            this.friends = [];
            this.pathComputed = undefined;
            this.pathPosition = 0;
        },

        /**
         * Represents a building with a position, dimesions, and one or more floors.
         * @constructor
         * @memberof fp
         * @inner
         */
        Building: function() {
            this.mesh = null;
            this.lineMaterial = null;
            this.buildingMaterial = null;
            this.windowMaterial = null;
            this.lod = null;
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

            // Use Poisson distribution with lambda of 1 to contour building heights instead
            var w = 1 - jStat.exponential.cdf(Math.random() * 9, 1);
            var d = 1 - jStat.exponential.cdf(Math.random() * 9, 1);
            // var h =  Math.floor(jStat.exponential.pdf(Math.random(), 50))
            var h = Math.floor(jStat.exponential.sample(appConfig.buildingOptions.heightA) * appConfig.buildingOptions.heightB);
            this.maxWidth = Math.floor(w * 9) + appConfig.buildingOptions.heightB;
            this.maxDepth = Math.floor(d * 9) + 1;
            this.maxHeight = h + 1;

            this.bottomWindow = 1.0 - (appConfig.buildingOptions.windowsEndY / 100.0);
            this.topWindow = 1.0 - (appConfig.buildingOptions.windowsStartY/ 100.0);
            this.windowWidth = appConfig.buildingOptions.windowWidth;
            this.windowPercent = appConfig.buildingOptions.windowPercent / 100.0;
            if ( appConfig.buildingOptions.windowsRandomise ) {
                // Randomise based on a normal distribution
                var bottomWindowTmp = jStat.normal.inv(Math.random(), this.bottomWindow, 0.1);
                var topWindowTmp = jStat.normal.inv(Math.random(), this.topWindow, 0.1);
                var windowWidthTmp = jStat.normal.inv(Math.random(), this.windowWidth, 0.1);
                var windowPercentTmp = jStat.normal.inv(Math.random(), this.windowPercent, 0.1);
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


            this.setupBuilding = function(dimensions) {
                this.lod = new THREE.LOD();
                this.yOffset = 0;
                this.levels = 0;
                this.localMaxLevels = dimensions.levels;
                this.localWidth = dimensions.width;
                this.localLength = dimensions.length;

                // Set up materials
                var fc, lc, wc;
                if (appConfig.displayOptions.dayShow) {
                    fc = fp.buildColorVector(appConfig.colorOptions.colorDayBuildingFill);
                    lc = fp.buildColorVector(appConfig.colorOptions.colorDayBuildingLine);
                    wc = fp.buildColorVector(appConfig.colorOptions.colorDayBuildingWindow);
                }
                else {
                    fc = fp.buildColorVector(appConfig.colorOptions.colorNightBuildingFill);
                    lc = fp.buildColorVector(appConfig.colorOptions.colorNightBuildingLine);
                    wc = fp.buildColorVector(appConfig.colorOptions.colorNightBuildingWindow);
                }

                this.lineMaterial = new THREE.LineBasicMaterial({
                    color: lc,
                    linewidth: appConfig.buildingOptions.linewidth
                });
                this.windowMaterial = new THREE.MeshBasicMaterial( { color: wc } );
                this.windowMaterial.side = THREE.DoubleSide;
                this.buildingMaterial = new THREE.MeshBasicMaterial( { color: fc } );
                this.buildingMaterial.side = THREE.DoubleSide;
                this.buildingMaterial.opacity = 1;

                this.geometry = new THREE.Geometry();
                // Pre-fill with enough vertices
                for (var i = 0; i < (appConfig.maxLevels * 16 + 8); i++)
                    this.geometry.vertices.push(new THREE.Vector3(0,0,0));
                this.geometry.verticesNeedUpdate = true;

                // Set up containers
                this.highResMeshContainer = new THREE.Object3D();
                this.lowResMeshContainer = new THREE.Object3D();

                if (! appConfig.buildingOptions.useShader) {
                    this.mesh = new THREE.Line( this.geometry, this.lineMaterial, THREE.LinePieces );
                    this.highResMeshContainer.add( this.mesh );

                    this.windowsOutlineContainer = new THREE.Object3D();
                    if (appConfig.buildingOptions.windowsLine)
                        this.highResMeshContainer.add( this.windowsOutlineContainer );

                    this.windowsFillContainer = new THREE.Object3D();
                    if (appConfig.buildingOptions.windowsFill)
                        this.highResMeshContainer.add( this.windowsFillContainer );
                }

                if (appConfig.buildingOptions.useLevelOfDetail) {
                    this.lod.addLevel(this.highResMeshContainer, appConfig.buildingOptions.highResDistance);
                    this.lod.addLevel(this.lowResMeshContainer, appConfig.buildingOptions.lowResDistance);
                    this.lowResGeometry = new THREE.BoxGeometry(appConfig.buildingOptions.width, (this.levels + 1) * appConfig.buildingOptions.levelHeight, appConfig.buildingOptions.length);
                    this.lowResGeometry.applyMatrix( new THREE.Matrix4().makeTranslation( 0, (this.levels + 1) * appConfig.buildingOptions.levelHeight / 2, 0 ) );
                    this.lowResMesh = new THREE.Mesh(this.lowResGeometry, this.buildingMaterial);
                    this.lowResMeshContainer.add(this.lowResMesh);
                }
                else
                    this.lod.addLevel(this.highResMeshContainer, 1);

                this.lod.updateMatrix();
                this.lod.matrixAutoUpdate = false;
            };

            this.addFloor = function () {
                var base = this.levels * appConfig.buildingOptions.levelHeight;
                var points = fp.BUILDING_FORMS[this.buildingForm](this.localWidth, this.localLength, base);
                if ( !appConfig.buildingOptions.useShader ) {
                    if (appConfig.buildingOptions.showLines) {
                        this.geometry.dynamic = true;
                        this.generateSkeleton(points);
                        this.geometry.verticesNeedUpdate = true;
                    }
                    if (appConfig.buildingOptions.showFill)
                        this.generateExtrudedShape(points);
                    if (appConfig.buildingOptions.showWindows)
                        this.generateWindows(points);
                }
                else
                    this.shadedShape(points);

                this.levels++;
                // Update a low res model once the rest is complete
                this.updateSimpleBuilding();

                // Do tapering and staggering here
                if (appConfig.buildingOptions.stagger) {
                    if (appConfig.buildingOptions.taper) {
                        var percentage = this.levels / this.localMaxLevels;
                        var sq = Math.pow(percentage, appConfig.buildingOptions.taperExponent);
                        var hurdle = jStat.exponential.cdf(sq, appConfig.buildingOptions.taperDistribution);
                        if (Math.random() < hurdle) {
                            this.localWidth -= appConfig.buildingOptions.staggerAmount;
                            this.localLength -= appConfig.buildingOptions.staggerAmount;
                        }
                    }
                    else {
                        this.localWidth -= appConfig.buildingOptions.staggerAmount;
                        this.localLength -= appConfig.buildingOptions.staggerAmount;
                    }
                }
            };

            this.removeFloor = function() {
                var topFloor = this.highResMeshContainer.children[this.highResMeshContainer.children.length - 1];
                this.highResMeshContainer.remove(topFloor);
                this.levels--;
                // Update a low res model once the rest is complete
                this.updateSimpleBuilding();
            };

            this.generateSkeleton = function (points) {
                var i, base = points[0].y;
                var height = base + appConfig.buildingOptions.levelHeight;
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
                var height = base + appConfig.buildingOptions.levelHeight;
                var offset = fp.getOffset(this.levels, points.length);

                // EXTRUDED SHAPE FOR NON-BOX SHAPED BUILDINGS
                var shape = new THREE.Shape();
                shape.moveTo(points[0].x, points[0].z);
                for (var i = 1; i < points.length; i ++) {
                    shape.lineTo(points[i].x, points[i].z);
                }
                shape.lineTo(points[0].x, points[0].z);
                var extrudeSettings = { amount: appConfig.buildingOptions.levelHeight * 1.0, bevelEnabled: false };
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
                    var fc = (appConfig.displayOptions.dayShow) ? appConfig.colorOptions.colorDayBuildingFill : appConfig.colorOptions.colorNightBuildingFill;
                    buildingMaterial = new THREE.MeshBasicMaterial({color: fc });
                    var box = new THREE.Mesh( shapeGeometry, buildingMaterial );
                    box.rotation.set(Math.PI / 2, 0, 0);
                    box.position.set(0, height, 0);
                    box.geometry.verticesNeedUpdate = true;
                    this.highResMeshContainer.add(box);
                }
            };

            this.generateWindows = function (points) {
                var base = points[0].y;
                var offset = fp.getOffset(this.levels, points.length);

                // General calculable variables
                var windowHeight = ((appConfig.buildingOptions.windowsEndY - appConfig.buildingOptions.windowsStartY) / 100) * appConfig.buildingOptions.levelHeight;
                var winActualWidth = (appConfig.buildingOptions.windowPercent / 100) * appConfig.buildingOptions.windowWidth;

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
                    var windowCount = Math.floor(lineLength / appConfig.buildingOptions.windowWidth);
                    var winOffset = (appConfig.buildingOptions.windowWidth - winActualWidth) / 2;
                    var windowStart = base + (appConfig.buildingOptions.levelHeight * (appConfig.buildingOptions.windowsStartY / 100));
                    var windowEnd = base + (appConfig.buildingOptions.levelHeight * (appConfig.buildingOptions.windowsEndY / 100));
                    var winW = winActualWidth * (xDiff / lineLength);
                    var winL = winActualWidth * (zDiff / lineLength);
                    var winOffsetW = winOffset * (xDiff / lineLength);
                    var winOffsetL = winOffset * (zDiff / lineLength);
                    var angle = Math.atan2(xDiff, zDiff) + Math.PI / 2;
                    for (var j = 0 ; j < windowCount; j++) {
                        var winX = previousPoint.x + (j * xDiff / windowCount) + winOffsetW;
                        var winZ = previousPoint.z + (j * zDiff / windowCount) + winOffsetL;

                        if (appConfig.buildingOptions.windowsFill) {
                            var boxCopy = box.clone();
                            boxCopy.position.set(winX + winW, windowStart, winZ + winL);
                            boxCopy.rotation.set(0, angle, 0);
                            this.windowsFillContainer.add(boxCopy);
                        }

                        if (appConfig.buildingOptions.windowsLine) {
                            var windowOutlineCopy = windowOutline.clone();
                            windowOutlineCopy.position.set(winX + winW, windowStart, winZ + winL);
                            windowOutlineCopy.rotation.set(0, angle, 0);
                            this.windowsOutlineContainer.add(windowOutlineCopy);
                        }
                    }
                }
            };

            this.shadedShape = function (points) {
                var base = points[0].y;
                var height = base;// + this.lod.position.y;
                var offset = fp.getOffset(this.levels, points.length);

                var shape = new THREE.Shape();
                shape.moveTo(points[0].x, points[0].z);
                for (var i = 1; i < points.length; i ++)
                    shape.lineTo(points[i].x, points[i].z);
                shape.lineTo(points[0].x, points[0].z);
                var extrudeSettings = { amount: appConfig.buildingOptions.levelHeight * 1.0, bevelEnabled: false };
                var shapeGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                shapeGeometry.computeBoundingBox();

                if (shapeGeometry.boundingBox) {
                    var fc, lc, wc;
                    if (appConfig.displayOptions.dayShow) {
                        fc = fp.buildColorVector(appConfig.colorOptions.colorDayBuildingFill);
                        lc = fp.buildColorVector(appConfig.colorOptions.colorDayBuildingLine);
                        wc = fp.buildColorVector(appConfig.colorOptions.colorDayBuildingWindow);
                    }
                    else {
                        fc = fp.buildColorVector(appConfig.colorOptions.colorNightBuildingFill);
                        lc = fp.buildColorVector(appConfig.colorOptions.colorNightBuildingLine);
                        wc = fp.buildColorVector(appConfig.colorOptions.colorNightBuildingWindow);
                    }
                    // Gets around a problem with rendering a single building with lines or windows
                    var showLines = ( fp.buildingNetwork.buildings.length > 1 && appConfig.buildingOptions.showLines );
                    var showWindows = appConfig.buildingOptions.showWindows;
                    this.uniforms = {
                        time: { type: "f", value: 1.0 },
                        location: { type: "v2", value: new THREE.Vector2(this.lod.position.x, this.lod.position.z) },
                        resolution: { type: "v2", value: new THREE.Vector2() },
                        dimensions: { type: "v3", value: new THREE.Vector3(shapeGeometry.boundingBox.max.x - shapeGeometry.boundingBox.min.x, appConfig.buildingOptions.levelHeight, shapeGeometry.boundingBox.max.y - shapeGeometry.boundingBox.min.y) },
                        bottomWindow: { type: "f", value: this.bottomWindow },
                        topWindow: { type: "f", value: this.topWindow },
                        windowWidth: { type: "f", value: this.windowWidth },
                        windowPercent: { type: "f", value: this.windowPercent },
                        floorLevel: { type: "f", value: this.levels },
                        //opacity: { type: "f", value: appConfig.buildingOptions.opacity },
                        lineColor: { type: "v3", value: lc },
                        lineWidth: { type: "f", value: appConfig.buildingOptions.linewidth },
                        fillColor: { type: "v3", value: fc },
                        windowColor: { type: "v3", value: wc },
                        showLines: { type: "i", value: showLines ? 1 : 0 },
                        showFill: { type: "i", value: appConfig.buildingOptions.showFill ? 1 : 0 },
                        showWindows: { type: "i", value: showWindows ? 1 : 0 },
                        fillRooves: { type: "i", value: appConfig.buildingOptions.fillRooves ? 1 : 0 }
                    };
                    var attributes = { mixin: { type: "f", value: [] } };
                    for (i = 0; i < shapeGeometry.vertices.length; i++)
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
                    shaderMaterial.wireframe = appConfig.displayOptions.wireframeShow;

                    var box = new THREE.Mesh( shapeGeometry, shaderMaterial );
                    box.matrixAutoUpdate = false;
                    //box.rotation.set(Math.PI / 2, 0, 0);
                    box.matrix.makeRotationX( Math.PI / 2 );
                    box.matrix.setPosition(new THREE.Vector3(0, height, 0));
                    //box.geometry.verticesNeedUpdate = true;
                    box.castShadow = true;
                    box.receiveShadow = true;
                    box.children.forEach(function(b) {
                        b.castShadow = true;
                        b.receiveShadow = true;
                    });
                    this.highResMeshContainer.add(box);
                }
            };

            this.canAddFloor = function() {
                return ( !this.destroying && this.levels < this.localMaxLevels && this.localWidth > 0 && this.localLength > 0 );
            };

            this.update = function() {
                if ( this.canAddFloor() ) {
                    this.counter ++;
                    if (this.counter % appConfig.buildingOptions.riseRate === 0 )
                        this.addFloor();

                    if (appConfig.buildingOptions.falling) {
                        var y = - ( this.levelHeight /  (2 * appConfig.buildingOptions.riseRate));
                        this.yOffset += y;
                        this.highResMeshContainer.translateY(y);
                        this.lowResMeshContainer.translateY(y);
                    }
                }
                // NOT WORKING YET
                else if (! this.destroying && appConfig.buildingOptions.destroyOnComplete) {
                    this.destroying = true;
                }
                else if (this.destroying && this.levels > 0) {
                    this.counter ++;
                    if (this.counter % appConfig.buildingOptions.riseRate === 0 ) {
                        this.removeFloor();
                    }
                }
                else if (this.destroying && this.levels === 0 && appConfig.buildingOptions.loopCreateDestroy) {
                    this.destroying = false;
                }

                if (appConfig.buildingOptions.turning) {
                    this.highResMeshContainer.rotation.x += 0.001;
                    this.highResMeshContainer.rotation.y += 0.01;
                    this.lowResMeshContainer.rotation.x += 0.001;
                    this.lowResMeshContainer.rotation.y += 0.01;
                    this.lowResMesh.rotation.x += 0.001;
                    this.lowResMesh.rotation.y += 0.01;
                }
                this.updateBuildingShader();
            };

            this.updateBuildingShader = function() {
                this.highResMeshContainer.children.forEach( function(floor) {
                    var shaderMaterial = floor.material;
                    var r = Math.random() * 10;
                    var chance = 0.02;
                    if ( Math.random() < chance ) {
                        for (var i = 0; i < floor.geometry.vertices.length; i++) {
                            shaderMaterial.attributes.mixin.value[i] = r;
                        }
                    }
                    shaderMaterial.attributes.mixin.needsUpdate = true; // important!
                } );
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
        },

        /**
         * Represents a road or path between two points.
         * @constructor
         * @memberof fp
         * @inner
         */
        Road: function() {
            this.mesh = null;
            this.position = null;
            this.setupRoad = function(_x, _y, _z) {
                x = _x || 0;
                y = _y || 0;
                z = _z || 0;
            };
            this.shadedShape = function (points) {};
            this.update = function() { };
        },

        /**
         * Represents a square block of the terrain. It has a value that can be used to represent some property of interest.
         * @constructor
         * @memberof fp
         * @inner
         */
        Patch: function(val) {
            this.value = val;
            this.updateValue = function(inc) {
                var val = this.value;
                if (val + inc < 0.0001)
                    val = 0.0001;
                else if (val + inc > 1.0)
                    val = 1.0;
                else
                    val += inc;
                this.value = val;
            };
        },

        /**
         * Represents relevant state about the application.
         * @constructor
         * @memberof fp
         * @inner
         */
        AppState: {
            runSimulation: false,
            stepSimulation: false
        },

        /**
         * Represents configuration data about the application.
         * @constructor
         * @namespace AppConfig
         * @memberof fp
         * @inner
         */
        AppConfig: function() {
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
                maxLandSearchDepth: 1,

                /**
                 * Number of index points to use in search (depends on building size)
                 * @memberOf fp~AppConfig~worldOptions
                 * @inner
                 */
                searchIncrement: 1
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
                spawed.
                 * @type {Number}
                 * @memberOf fp~AppConfig~agentOptions
                 * @inner
                 */
                initialExtent: 1000,
                /**
                 * The <em>maximum</em> extent, or diameter, around the point of origin, where agents can be
                spawed.
                 * @type {Number}
                 * @memberOf fp~AppConfig~agentOptions
                 * @inner
                 */
                maxExtent: terrain.gridExtent,
                // initialX: -500, initialY: -1500, // Melbourne
                /**
                 * The <em>x</em> co-ordinate of the point of origin.
                 * @type {Number}
                 * @memberOf fp~AppConfig~agentOptions
                 * @inner
                 */
                initialX: 0,
                /**
                 * The <em>y</em> co-ordinate of the point of origin.
                 * @type {Number}
                 * @memberOf fp~AppConfig~agentOptions
                 * @inner
                 */
                initialY: 0,
                chanceToJoinNetwork: 0.05,
                chanceToFindPathToHome: 0.00,
                initialCircle: true,
                noWater: true,
                noUphill: false, // Eventually remove for more fine-grained weight control
                useStickman: true,
                healthReduce: 0.05,
                healthGain: 1.0,
                visitHomeBuilding: 0.02,
                visitOtherBuilding: 0.002,
                size: 40,
                terrainOffset: 20
            };
            this.displayOptions = {
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
                pathsShow: true,
                terrainShow: true,
                coloriseAgentsByHealth: false,
                firstPersonView: false,
                cameraOverride: false,
                cameraX: 0,
                cameraY: 200,
                cameraZ: 800,
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
            this.terrainOptions = {
                loadHeights: true,
                multiplier: 1
            };
            this.colorOptions = {
                colorDayBackground: 0x000000,
                colorDayRoad: 0x474747,
                colorDayAgent: 0x4747b3,
                colorDayNetwork: 0x474747,
                colorDayTrail: 0x474747,
                colorDayBuildingFill: 0xb1abab,
                colorDayBuildingLine: 0x222222,
                colorDayBuildingWindow: 0x222222,
                colorDayTerrainSea: 0xa6a6a6,
                colorDayTerrainLowland1: 0x4d7848,
                colorDayTerrainLowland2: 0x8db17b,
                colorDayTerrainMidland: 0xa9752e,
                colorDayTerrainHighland: 0xacacac,

                colorNightBackground: 0x636363,
                colorNightRoad: 0x474747,
                colorNightAgent: 0x47b347,
                colorNightNetwork: 0x47b347,
                colorNightTrail: 0x47b347,
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
                scene.remove(  fp.agentNetwork.particles  );
                fp.agentNetwork.agents = [];
                fp.agentNetwork.agents = [];
                fp.agentNetwork.agentParticleSystemAttributes = null;
                fp.buildingNetwork.buildings = [];
                fp.buildingNetwork.buildingHash = {};
                fp.roadNetwork.indexValues = [];
                fp.roadNetwork.roads = {};

                fp.timescale.currentYear = fp.timescale.initialYear;
                fp.updateYear();
                fp.timescale.frameCounter = 0;
                if (trailNetwork.trailMeshes)
                    trailNetwork.trailMeshes.forEach(function(trail) { scene.remove(trail); });

                var len = terrain.plane.geometry.attributes.position.array.length / 3,
                    trailPoints = new Float32Array(len),
                    patchPoints = new Float32Array(len);
                for (var i = 0; i < len; i++) {
                    trailPoints[i] = 0;
                    patchPoints[i] = 0;
                }
                terrain.plane.geometry.addAttribute( "trail", new THREE.BufferAttribute( trailPoints, 1 ) );
                terrain.plane.geometry.addAttribute( "patch", new THREE.BufferAttribute( patchPoints, 1 ) );
                terrain.plane.geometry.attributes.trail.needsUpdate = true;
                terrain.plane.geometry.attributes.patch.needsUpdate = true;

                trailNetwork.trails = {};
                fp.agentNetwork.networks.forEach( function( network ) {
                    network.links = [];
                    scene.remove( network.networkMesh );
                });
                scene.remove( fp.buildingNetwork.networkMesh);
                scene.remove( fp.roadNetwork.networkMesh);
                scene.remove( pathNetwork.networkMesh);
                scene.remove( trailNetwork.globalTrailLine);
                fp.patchNetwork.initialisePatches();
            };

            /**
             * Sets up the simulation
             */
            this.Setup = function() {
                this.Reset();
                fp.agentNetwork.createInitialAgentPopulation();
                trailNetwork.globalTrailGeometry = new THREE.Geometry();
                var trailMaterial = new THREE.LineBasicMaterial({
                    color: appConfig.colorOptions.colorNightTrail,
                    opacity: 0.75,
                    linewidth: 0.25
                });
                for (var i = 0; i < appConfig.agentOptions.initialPopulation; i++) {
                    var vertices = new Array(appConfig.displayOptions.trailLength);
                    for (var j = 0; j < appConfig.displayOptions.trailLength ; j++) {
                        trailNetwork.globalTrailGeometry.vertices.push(fp.agentNetwork.agents[i].lastPosition);
                    }
                    var ai = fp.getIndex(fp.agentNetwork.agents[i].lastPosition.x / appConfig.terrainOptions.multiplier, fp.agentNetwork.agents[i].lastPosition.z / appConfig.terrainOptions.multiplier);
                    if (ai > -1)
                        trailNetwork.trails[ai] = 1;
                }

                fp.buildingNetwork.networkMesh = new THREE.Object3D();
                if ( appConfig.displayOptions.buildingsShow )
                    scene.add(fp.buildingNetwork.networkMesh);

                fp.roadNetwork.networkMesh = new THREE.Object3D();
                if ( appConfig.displayOptions.roadsShow )
                    scene.add(fp.roadNetwork.networkMesh);

                pathNetwork.networkMesh = new THREE.Object3D();
                if ( appConfig.displayOptions.pathsShow )
                    scene.add(pathNetwork.networkMesh);

                trailNetwork.globalTrailLine = new THREE.Line(trailNetwork.globalTrailGeometry, trailMaterial, THREE.LinePieces);
                if (appConfig.displayOptions.trailsShowAsLines)
                    scene.add(trailNetwork.globalTrailLine);

                fp.sim.setup.call(fp.sim); // Get around binding problem - see: http://alistapart.com/article/getoutbindingsituations
            };

            this.Run = function() {
                fp.AppState.runSimulation = !fp.AppState.runSimulation;
                fp.AppState.stepSimulation = false;
                if (!_.isUndefined(chart)) {
                    if (fp.AppState.runSimulation)
                        chart.start();
                    else
                        chart.stop();
                }
            };
            this.Step = function() {
                fp.AppState.runSimulation = fp.AppState.stepSimulation = true;
            };
            this.SpeedUp = function() {
                if (fp.timescale.framesToYear > fp.timescale.MIN_FRAMES_TO_YEAR)
                    fp.timescale.framesToYear = Math.ceil(fp.timescale.framesToYear / 2);
                console.log("Speed: " + fp.timescale.framesToYear);
            };
            this.SlowDown = function() {
                if (fp.timescale.framesToYear < fp.timescale.MAX_FRAMES_TO_YEAR)
                    fp.timescale.framesToYear *= 2;
                console.log("Speed: " + fp.timescale.framesToYear);
            };
            this.Snapshot = function() {
                var mimetype = mimetype  || "image/png";
                var url = renderer.domElement.toDataURL(mimetype);
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
                appConfig.Reset();
                terrain.terrainMapIndex =
                    ( terrain.terrainMapIndex == fp.TERRAIN_MAPS.length - 1 ) ?
                      0 :
                      terrain.terrainMapIndex + 1;
                terrain.loadTerrain();
            };
        },

        Chart: {  // Singleton objects
            setupChart: function () {
                var agentDiv = appConfig.agentOptions.initialPopulation * 2;
                chart = new SmoothieChart( { maxValue: agentDiv, minValue: 0.0  } );
                var agentPopulationSeries = new TimeSeries();
                var agentHealthSeries = new TimeSeries();
                var patchValuesSeries = new TimeSeries();
                setInterval(function() {
                    if (fp.AppState.runSimulation) {
                        agentPopulationSeries.append( new Date().getTime(), fp.agentNetwork.agents.length );
                        agentHealthSeries.append( new Date().getTime(), agentDiv * jStat( _.map(fp.agentNetwork.agents, function(agent) { return agent.health; } ) ).mean() / 100 );
                        patchValuesSeries.append( new Date().getTime(), agentDiv * fp.patchNetwork.patchMeanValue );
                    }
                }, 500);
                var chartCanvas = document.createElement("canvas");
                chartCanvas.setAttribute("id", "chartCanvas");
                chartCanvas.setAttribute("width", "400");
                chartCanvas.setAttribute("height", "100");
                chartCanvas.setAttribute("style", "z-index: 1; position: absolute; left: 0px; bottom: 0px  ");
                container.insertBefore(chartCanvas, container.firstChild);
                chart.addTimeSeries( agentPopulationSeries, { fillStyle: "rgba(0, 0, 255, 0.2)", lineWidth: 4 } );
                chart.addTimeSeries(agentHealthSeries, { lineWidth: 4 });
                chart.addTimeSeries(patchValuesSeries, { lineWidth: 4 });
                fp.updateChartColors();
                chart.streamTo(chartCanvas, 500);
                this.updateGraph();
            },

            updateGraph: function() {
                $("#chartCanvas").toggle(appConfig.displayOptions.chartShow);
            }
        },

        doGUI: function( config ) {
            gui = new dat.GUI( { load: config } );

            gui.remember(appConfig);
            gui.remember(appConfig.agentOptions);
            gui.remember(appConfig.buildingOptions);
            gui.remember(appConfig.roadOptions);
            gui.remember(appConfig.displayOptions);
            gui.remember(appConfig.colorOptions);
            gui.remember(appConfig.terrainOptions);

            gui.add(appConfig, "Setup");
            gui.add(appConfig, "Run");
            gui.add(appConfig, "Step");

            var controlPanel = gui.addFolder("More controls");
            controlPanel.add(appConfig, "SpeedUp");
            controlPanel.add(appConfig, "SlowDown");
            controlPanel.add(appConfig, "Snapshot");
            controlPanel.add(appConfig, "FullScreen");
            controlPanel.add(appConfig, "SwitchTerrain");

            var agentsFolder = gui.addFolder("Agent Options");
            agentsFolder.add(appConfig.agentOptions, "initialPopulation", 0, 10000).step(1);
            agentsFolder.add(appConfig.agentOptions, "initialExtent", 100, terrain.gridExtent).step(100);
            agentsFolder.add(appConfig.agentOptions, "maxExtent", 1000, terrain.gridExtent).step(100);
            agentsFolder.add(appConfig.agentOptions, "initialX",  - terrain.gridExtent / 2, terrain.gridExtent / 2).step(100);
            agentsFolder.add(appConfig.agentOptions, "initialY",  - terrain.gridExtent / 2, terrain.gridExtent / 2).step(100);
            agentsFolder.add(appConfig.agentOptions, "chanceToJoinNetwork", 0.0, 1.0).step(0.01);
            agentsFolder.add(appConfig.agentOptions, "chanceToFindPathToHome", 0.0, 1.0).step(0.01);
            agentsFolder.add(appConfig.agentOptions, "initialCircle");
            agentsFolder.add(appConfig.agentOptions, "noWater");
            agentsFolder.add(appConfig.agentOptions, "noUphill");
            agentsFolder.add(appConfig.agentOptions, "useStickman");
            agentsFolder.add(appConfig.agentOptions, "healthReduce", 0.0, 0.1).step(0.01);
            agentsFolder.add(appConfig.agentOptions, "healthGain", 0.0, 5.0).step(0.5);
            agentsFolder.add(appConfig.agentOptions, "visitHomeBuilding", 0.0, 1.0).step(0.001);
            agentsFolder.add(appConfig.agentOptions, "visitOtherBuilding", 0.0, 1.0).step(0.001);

            var buildingsFolder = gui.addFolder("Building Options");
            buildingsFolder.add(appConfig.buildingOptions, "create");
            buildingsFolder.add(appConfig.buildingOptions, "maxNumber", 1, 100).step(1);
            buildingsFolder.add(appConfig.buildingOptions, "detectBuildingCollisions");
            buildingsFolder.add(appConfig.buildingOptions, "detectRoadCollisions");
            var forms = buildingsFolder.addFolder("Form");
            forms.add(appConfig.buildingOptions, "buildingForm", fp.BUILDING_FORMS.names);
            forms.add(appConfig.buildingOptions, "spread", 1, 100).step(1);
            forms.add(appConfig.buildingOptions, "randomForm");
            forms.add(appConfig.buildingOptions, "rotateRandomly");
            forms.add(appConfig.buildingOptions, "rotateSetAngle", 0, 360).step(1);
            var dimensions = buildingsFolder.addFolder("Dimensions");
            dimensions.add(appConfig.buildingOptions, "minHeight", 1, 50).step(1);
            dimensions.add(appConfig.buildingOptions, "maxHeight", 2, 200).step(1);
            dimensions.add(appConfig.buildingOptions, "heightA", 0.1, 10.0).step(0.1);
            dimensions.add(appConfig.buildingOptions, "heightB", 1, 100).step(1);
            dimensions.add(appConfig.buildingOptions, "riseRate", 1, 100).step(1);
            dimensions.add(appConfig.buildingOptions, "levelHeight", 10, 100).step(1);
            dimensions.add(appConfig.buildingOptions, "minWidth", 1, 200).step(1);
            dimensions.add(appConfig.buildingOptions, "maxWidth", 41, 400).step(1);
            dimensions.add(appConfig.buildingOptions, "minLength", 1, 200).step(1);
            dimensions.add(appConfig.buildingOptions, "maxLength", 41, 400).step(1);
            var influences = buildingsFolder.addFolder("Influences");
            influences.add(appConfig.buildingOptions, "roads", 0.0, 1.0).step(0.1);
            influences.add(appConfig.buildingOptions, "water", 0.0, 1.0).step(0.1);
            influences.add(appConfig.buildingOptions, "otherBuildings", 0.0, 1.0).step(0.1);
            influences.add(appConfig.buildingOptions, "buildingHeight", 0.0, 1.0).step(0.1);
            var view = buildingsFolder.addFolder("Appearance");
            view.add(appConfig.buildingOptions, "useShader");
            view.add(appConfig.buildingOptions, "useLevelOfDetail");
            view.add(appConfig.buildingOptions, "lowResDistance", 2000, 20000).step(1000);
            view.add(appConfig.buildingOptions, "highResDistance", 100, 2000).step(100);
            view.add(appConfig.buildingOptions, "opacity", 0.0, 1.0).step(0.01);
            var fill = view.addFolder("Fill");
            fill.add(appConfig.buildingOptions, "showFill");
            fill.add(appConfig.buildingOptions, "fillRooves");
            var line = view.addFolder("Line");
            line.add(appConfig.buildingOptions, "showLines");
            line.add(appConfig.buildingOptions, "linewidth", 0.1, 8).step(0.1);
            var windows = view.addFolder("Window");
            var showWindowsOptions = windows.add(appConfig.buildingOptions, "showWindows");
            showWindowsOptions.onChange(function(value) {
                fp.buildingNetwork.buildings.forEach(function(b) {
                    b.uniforms.showWindows.value = value ? 1 : 0;
                });
            });
            windows.add(appConfig.buildingOptions, "windowsRandomise");
            windows.add(appConfig.buildingOptions, "windowWidth", 1, 100).step(1);
            windows.add(appConfig.buildingOptions, "windowPercent", 1, 100).step(1);
            windows.add(appConfig.buildingOptions, "windowsStartY", 1, 100).step(1);
            windows.add(appConfig.buildingOptions, "windowsEndY", 1, 100).step(1);
            var stagger = buildingsFolder.addFolder("Stagger");
            stagger.add(appConfig.buildingOptions, "stagger");
            stagger.add(appConfig.buildingOptions, "staggerAmount", 1, 100);
            var taper = buildingsFolder.addFolder("Taper");
            taper.add(appConfig.buildingOptions, "taper");
            taper.add(appConfig.buildingOptions, "taperExponent", 1, 10).step(1);
            taper.add(appConfig.buildingOptions, "taperDistribution", 0.1, 5);
            var animation = buildingsFolder.addFolder("Animation");
            animation.add(appConfig.buildingOptions, "destroyOnComplete");
            animation.add(appConfig.buildingOptions, "loopCreateDestroy");
            animation.add(appConfig.buildingOptions, "turning");
            animation.add(appConfig.buildingOptions, "falling");

            var terrainFolder = gui.addFolder("Terrain Options");
            terrainFolder.add(appConfig.terrainOptions, "loadHeights").onFinishChange(terrain.loadTerrain);
            terrainFolder.add(appConfig.terrainOptions, "multiplier", 1, 10).step(1).onFinishChange(terrain.loadTerrain);

            var roadsFolder = gui.addFolder("Road Options");
            roadsFolder.add(appConfig.roadOptions, "create");
            roadsFolder.add(appConfig.roadOptions, "maxNumber", 1, 100).step(1);
            roadsFolder.add(appConfig.roadOptions, "roadWidth", 5, 50).step(5);
            roadsFolder.add(appConfig.roadOptions, "roadDeviation", 0, 50).step(1);
            roadsFolder.add(appConfig.roadOptions, "roadRadiusSegments", 2, 20).step(1);
            roadsFolder.add(appConfig.roadOptions, "roadSegments", 1, 20).step(1);
            roadsFolder.add(appConfig.roadOptions, "initialRadius", 0, 1000).step(100);
            roadsFolder.add(appConfig.roadOptions, "probability", 50, 1000).step(50);
            roadsFolder.add(appConfig.roadOptions, "lenMinimum", 0, 2000).step(100);
            roadsFolder.add(appConfig.roadOptions, "lenMaximum", 100, 2000).step(100);
            roadsFolder.add(appConfig.roadOptions, "lenDistributionFactor", 1, 10).step(1);
            roadsFolder.add(appConfig.roadOptions, "overlapThreshold", 1, 100).step(1);
            roadsFolder.add(appConfig.roadOptions, "flattenAdjustment", 0.025, 1.0).step(0.025);
            roadsFolder.add(appConfig.roadOptions, "flattenLift", 0, 40).step(1);

            var displayFolder = gui.addFolder("Display Options");
            displayFolder.add(appConfig.displayOptions, "buildingsShow").onFinishChange(fp.toggleBuildingState);
            displayFolder.add(appConfig.displayOptions, "roadsShow").onFinishChange(fp.toggleRoadState);
            displayFolder.add(appConfig.displayOptions, "waterShow").onFinishChange(fp.toggleWaterState);
            displayFolder.add(appConfig.displayOptions, "networkShow").onFinishChange(fp.toggleAgentNetwork);
            displayFolder.add(appConfig.displayOptions, "networkCurve");
            displayFolder.add(appConfig.displayOptions, "networkCurvePoints", 4, 20).step(1);
            displayFolder.add(appConfig.displayOptions, "patchesUpdate");
            displayFolder.add(appConfig.displayOptions, "patchesShow").onFinishChange(fp.togglePatchesState);
            displayFolder.add(appConfig.displayOptions, "patchesUseShader");
            displayFolder.add(appConfig.displayOptions, "trailsShow").onFinishChange(fp.toggleTrailState);
            displayFolder.add(appConfig.displayOptions, "trailsShowAsLines").onFinishChange(fp.toggleTrailState);
            displayFolder.add(appConfig.displayOptions, "trailLength", 1, 10000).step(1);
            displayFolder.add(appConfig.displayOptions, "cursorShow").onFinishChange(fp.removeCursor);
            displayFolder.add(appConfig.displayOptions, "statsShow").onFinishChange(fp.toggleStatsState);
            displayFolder.add(appConfig.displayOptions, "hudShow").onFinishChange(fp.toggleHUDState);
            displayFolder.add(appConfig.displayOptions, "wireframeShow").onFinishChange(fp.toggleWireframeState);
            displayFolder.add(appConfig.displayOptions, "dayShow").onFinishChange(fp.toggleDayNight);
            displayFolder.add(appConfig.displayOptions, "skyboxShow").onFinishChange(fp.toggleDayNight);
            displayFolder.add(appConfig.displayOptions, "chartShow").onFinishChange(fp.updateGraph);
            displayFolder.add(appConfig.displayOptions, "pathsShow").onFinishChange(pathNetwork.updatePathsState);
            displayFolder.add(appConfig.displayOptions, "terrainShow").onFinishChange(terrain.updateTerrainPlane);
            displayFolder.add(appConfig.displayOptions, "coloriseAgentsByHealth");
            displayFolder.add(appConfig.displayOptions, "firstPersonView").onFinishChange(fp.resetControls);
            displayFolder.add(appConfig.displayOptions, "cameraOverride").onFinishChange(fp.resetControls);
            displayFolder.add(appConfig.displayOptions, "cameraX", 0, 5000).onFinishChange(fp.resetControls);
            displayFolder.add(appConfig.displayOptions, "cameraY", 0, 5000).onFinishChange(fp.resetControls);
            displayFolder.add(appConfig.displayOptions, "cameraZ", 0, 5000).onFinishChange(fp.resetControls);

            var colorFolder = gui.addFolder("Color Options");
            var colorTerrainFolder = colorFolder.addFolder("Terrain Colors");
            colorTerrainFolder.addColor(appConfig.colorOptions, "colorDayTerrainSea").onChange(terrain.loadTerrain);
            colorTerrainFolder.addColor(appConfig.colorOptions, "colorNightTerrainSea").onChange(terrain.loadTerrain);
            colorTerrainFolder.addColor(appConfig.colorOptions, "colorDayTerrainLowland1").onChange(terrain.loadTerrain);
            colorTerrainFolder.addColor(appConfig.colorOptions, "colorNightTerrainLowland1").onChange(terrain.loadTerrain);
            colorTerrainFolder.addColor(appConfig.colorOptions, "colorDayTerrainLowland2").onChange(terrain.loadTerrain);
            colorTerrainFolder.addColor(appConfig.colorOptions, "colorNightTerrainLowland2").onChange(terrain.loadTerrain);
            colorTerrainFolder.addColor(appConfig.colorOptions, "colorDayTerrainMidland").onChange(terrain.loadTerrain);
            colorTerrainFolder.addColor(appConfig.colorOptions, "colorNightTerrainMidland").onChange(terrain.loadTerrain);
            colorTerrainFolder.addColor(appConfig.colorOptions, "colorDayTerrainHighland").onChange(terrain.loadTerrain);
            colorTerrainFolder.addColor(appConfig.colorOptions, "colorNightTerrainHighland").onChange(terrain.loadTerrain);
            var colorBuildingFolder = colorFolder.addFolder("Building Colors");
            colorBuildingFolder.addColor(appConfig.colorOptions, "colorDayBuildingFill");
            colorBuildingFolder.addColor(appConfig.colorOptions, "colorNightBuildingFill");
            colorBuildingFolder.addColor(appConfig.colorOptions, "colorDayBuildingLine");
            colorBuildingFolder.addColor(appConfig.colorOptions, "colorNightBuildingLine");
            colorBuildingFolder.addColor(appConfig.colorOptions, "colorDayBuildingWindow");
            colorBuildingFolder.addColor(appConfig.colorOptions, "colorNightBuildingWindow");
            var colorGraphFolder = colorFolder.addFolder("Graph Colors");
            colorGraphFolder.addColor(appConfig.colorOptions, "colorGraphPopulation").onChange(fp.updateChartColors);
            colorGraphFolder.addColor(appConfig.colorOptions, "colorGraphHealth").onChange(fp.updateChartColors);
            colorGraphFolder.addColor(appConfig.colorOptions, "colorGraphPatchValues").onChange(fp.updateChartColors);
            var colorOtherFolder = colorFolder.addFolder("Other Colors");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorDayBackground");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorNightBackground");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorDayRoad");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorNightRoad");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorDayAgent");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorNightAgent");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorDayNetwork");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorNightNetwork");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorDayNetwork");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorNightNetwork");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorDayTrail");
            colorOtherFolder.addColor(appConfig.colorOptions, "colorNightTrail");
        },

        /**
         * Generates a THREE.Vector3 object containing RGB values from either
         * a number or string color representation
         * @param  {string/number} color the color to convert
         * @return {THREE.Vector3}       [description]
         */
        buildColorVector: function(color) {
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
        },

        buildColorInteger: function(r, g, b) {
            return r * 256 * 256 + g * 256 + b;
        },

        getOffset: function(currentLevel, len) {
            var initOffset = (currentLevel > 0) ? len * 2 : 0;
            var offset = initOffset + (currentLevel) * len * 4;
            return offset;
        },

        onWindowResize: function() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize( window.innerWidth, window.innerHeight );
        },

        updateChartColors: function() {
            var colorPop = "#" + new THREE.Color(appConfig.colorOptions.colorGraphPopulation).getHexString(),
                colorHealth = "#" + new THREE.Color(appConfig.colorOptions.colorGraphHealth).getHexString(),
                colorPatches = "#" + new THREE.Color(appConfig.colorOptions.colorGraphPatchValues).getHexString();
            _.extend( chart.seriesSet[0].options, { strokeStyle: colorPop } );
            _.extend( chart.seriesSet[1].options, { strokeStyle: colorHealth } );
            _.extend( chart.seriesSet[2].options, { strokeStyle: colorPatches } );
        },

        mostVisited: function() {
            return _.chain(trailNetwork.trails).pairs().sortBy(function(a) {return a[1];} ).last(100).value();
        },

        vertexCount: function(obj) {
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
        },

        setupSimObjects: function() {
            // Set up root objects
            terrain = new fp.Terrain();
            fp.agentNetwork = new fp.AgentNetwork();
            fp.buildingNetwork = new fp.BuildingNetwork();
            fp.roadNetwork = new fp.RoadNetwork();
            pathNetwork = new fp.PathNetwork();
            trailNetwork = new fp.TrailNetwork();
            fp.patchNetwork = new fp.PatchNetwork();
            fp.timescale = new fp.Timescale();
            cursor = new fp.Cursor();
            appConfig = new fp.AppConfig();
        },

        // Debug Objects
        camera: function() { return camera; },

        setupCamera: function() {
            camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000000 );
            if ( appConfig.displayOptions.cameraOverride ) {
                camera.position.x = appConfig.displayOptions.cameraX;
                camera.position.y = appConfig.displayOptions.cameraY;
                camera.position.z = appConfig.displayOptions.cameraZ;
            }
            else if ( appConfig.displayOptions.firstPersonView ) {
                camera.position.x = 0;
                camera.position.y = 50 * appConfig.terrainOptions.multiplier;
                camera.position.z = 0;
            }
            else {
                camera.position.x = 0;
                camera.position.y = 200 * appConfig.terrainOptions.multiplier;
                camera.position.z = 800 * appConfig.terrainOptions.multiplier;
            }
        },

        setupControls: function() {
            if ( appConfig.displayOptions.firstPersonView ) {
                controls = new THREE.PointerLockControls( camera );
                scene.add( controls.getObject() );
                controls.enabled = true;
                container.requestPointerLock();
            }
            else {
                controls = new THREE.TrackballControls( camera, container );
                // Works better - but has no rotation?
                // controls = new THREE.OrbitControls( camera, container );
                controls.rotateSpeed = 0.15;
                controls.zoomSpeed = 0.6;
                controls.panSpeed = 0.3;

                controls.noRotate = false;
                controls.noZoom = false;
                controls.noPan = false;
                controls.noRoll = true;
                controls.minDistance = 250.0;
                controls.maxDistance = 10000.0;
            }
        },

        /**
         * @memberof fp
         */
        resetControls: function() {
            fp.setupCamera();
            fp.setupControls();
            fp.setupWater();
        },

        setupRenderer: function() {
            renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: true,
                preserveDrawingBuffer: true  // to allow screenshot
            });
            renderer.gammaInput = true;
            renderer.gammaOutput = true;

            renderer.shadowMapEnabled = true;
            renderer.shadowMapType = THREE.PCFSoftShadowMap;
            renderer.shadowMapCullFace = THREE.CullFaceBack;

            renderer.setClearColor( appConfig.colorOptions.colorNightBackground, 1);
            renderer.setSize(window.innerWidth, window.innerHeight);
            container.appendChild(renderer.domElement);
            renderer.domElement.style.zIndex = 2;

            // We add the event listener to: function the domElement
            renderer.domElement.addEventListener( "mousemove", fp.onMouseMove );
            renderer.domElement.addEventListener( "mouseup", fp.onMouseUp );
        },

        /**
         * @memberof fp
         */
        setupLighting: function() {
            // var hemiLight = new THREE.HemisphereLight( 0xbfbfbf, 0xbfbf8f, 0.6 );
            // var hemiLight = new THREE.HemisphereLight( 0xbfbfbf, 0xbfbfbf, 0.8 );
            var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 1.0 );
            // var hemiLight = new THREE.HemisphereLight( 0xefeeb0, 0xefeeb0, 1.0 );
            hemiLight.position.set( 0, 1000, 0 );
            scene.add( hemiLight );

            var dirLight = new THREE.DirectionalLight( 0x8f8f4f, 0.5 );
            dirLight.position.set( 40000, 40000, 40000 );
            dirLight.shadowDarkness = 0.25;
            dirLight.castShadow = true;
            // these six values define the boundaries of the yellow box seen above
            dirLight.shadowCameraNear = 250;
            dirLight.shadowCameraFar = 80000;
            dirLight.shadowMapWidth = 4096;
            dirLight.shadowMapHeight = 4096;
            var d = 4000;
            dirLight.shadowCameraLeft = -d;
            dirLight.shadowCameraRight = d;
            dirLight.shadowCameraTop = d;
            dirLight.shadowCameraBottom = -d;
            dirLight.shadowBias = -0.0001;
            //dirLight.shadowCameraVisible = true; // for debugging
            scene.add( dirLight );
        },

        /**
         * @memberof fp
         */
        setupWater: function() {
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
            var waterNormals = new THREE.ImageUtils.loadTexture( "textures/waternormals.jpg" );
            waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
            water = new THREE.Water( renderer, camera, scene, {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: waterNormals,
                alpha:  1.0,
                //sunDirection: dirLight.position.normalize(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 50.0,
            } );
            if ( !_.isUndefined(waterMesh) )
                scene.remove( waterMesh );
            waterMesh = new THREE.Mesh(
                new THREE.PlaneBufferGeometry( parameters.width * 500, parameters.height * 500, 50, 50 ),
                water.material
            );
            waterMesh.add( water );
            waterMesh.rotation.x = - Math.PI * 0.5;
            waterMesh.position.y = 2;
            if ( appConfig.displayOptions.waterShow )
                scene.add( waterMesh );
        },

        /**
         * @memberof fp
         */
        setupSky: function() {
            // load skybox
            var cubeMap = new THREE.CubeTexture( [] );
            cubeMap.format = THREE.RGBFormat;
            cubeMap.flipY = false;
            var loader = new THREE.ImageLoader();
            var skies = [  ["textures/skyboxsun25degtest.png", 1024, 0],
                            ["textures/skyboxsun5deg.png", 1024, 0],
                            ["textures/skyboxsun5deg2.png", 1024, 0],
                            ["textures/skyboxsun45deg.png", 1024, 0]
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
            skyBox = new THREE.Mesh(
                new THREE.BoxGeometry( 1000000, 1000000, 1000000 ),
                skyBoxMaterial
            );
            skyBox.position.set(0, skies[skyI][2], 0);
            if ( appConfig.displayOptions.skyboxShow )
                scene.add( skyBox );
        },

        /**
         * @memberof fp
         */
        setOutputHUD: function() {
            $("#yearValue").html( fp.timescale.currentYear );
            $("#populationValue").html( fp.agentNetwork.agents.length );
        },

        /**
         * @memberof fp
         */
        setupGUI: function(config) {
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
                        fp.doGUI(data);
                    });
                }
                else
                    fp.doGUI();
            }
            else
                fp.doGUI();
        },

        /**
         * Initialises the simulation.
         * @memberof fp
         * @param  {Object}   config   An object containing overriden config parameters.
         * @param  {Object}   sim      An Object containing a setup() and a tick() function.
         * @param  {Function} callback Callback function to call at the end of initialisation.
         */
        init: function( config, sim, callback ) {
            container = $( "#container" )[0];
            scene = new THREE.Scene();
            fp.sim = sim || fp.simDefault();
            fp.setupSimObjects();
            fp.setupGUI( config );
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
            terrain.loadTerrain( callback ); // Load the terrain asynchronously
            // For debugging - make these objects accessible
            this.scene = scene;
            this.appConfig = appConfig;
        },

        /**
         * The core simulation animation method.
         * @memberof fp
         */
        animate: function() {
            // Must call this first!
            fp.patchNetwork.updatePatchAgents();
            if ( fp.AppState.runSimulation )
                fp.sim.tick.call( fp.sim ); // Get around binding problem - see: http://alistapart.com/article/getoutbindingsituations
            fp.agentNetwork.updateAgentNetwork();
            fp.buildingNetwork.updateBuildings();
            fp.patchNetwork.updatePatchValues();
            trailNetwork.updateTrails();
            fp.updateYear();
            fp.updateSimState();
            fp.updateGraph();
            fp.updateWater();
            fp.updateStats();
            fp.updateControls();
            fp.updateCamera();
            fp.updateKeyboard();
            requestAnimationFrame( fp.animate );
            renderer.render( scene, camera );
        },

        /**
         * Factory method to generate a default sim object.
         * @memberof fp
         */
        simDefault: function() {
            return {
                counter: 0,
                setup: function() { /* console.log("Default sim set up"); */ },
                tick: function()  { /* console.log("Default sim tick: " + (++ this.counter)); */ }
            };
        },

        /**
         * Updates the simulation state.
         * @memberof fp
         */
        updateSimState: function() {
            if (fp.AppState.stepSimulation)
                fp.AppState.runSimulation = false;
        },

        /**
         * Updates the water object, if it exists.
         * @memberof fp
         */
        updateWater: function() {
            if (typeof(water) !== "undefined" && typeof(water.material.uniforms.time) !==
                "undefined") {
                water.material.uniforms.time.value += 1.0 / 60.0;
                water.render();
            }
        },

        /**
         * Updates the controls.
         * @memberof fp
         */
        updateControls: function() {
            if ( !appConfig.displayOptions.cursorShow ) {
                controls.update( clock.getDelta() );

                if ( !_.isUndefined(controls.getObject) ) {
                    var obj = controls.getObject();
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
        },

        /**
         * Adjusts the graph size if needed.
         * @memberof fp
         */
        updateGraph: function() {
            if ( chart.options.maxValue <= fp.agentNetwork.agents.length )
                chart.options.maxValue *= 2;
        },

        /**
         * Updates the stats widget.
         * @memberof fp
         */
        updateStats: function() {
            if ( appConfig.displayOptions.statsShow )
                stats.update();
        },

        /**
         * Updates the camera for the scene and its objects.
         * @memberof fp
         */
        updateCamera: function() {
            scene.traverse( function(object) {
                if (object instanceof THREE.LOD)
                    object.update(camera);
            } );
            scene.updateMatrixWorld();
        },

        /**
         * Ends the simulation.
         * @memberof fp
         */
        endSim: function() {
            fp.AppState.runSimulation = false;
            appConfig.displayOptions.buildingsShow = false;
            appConfig.displayOptions.patchesUpdate = false;
        },

        /**
         * Updates the year of the simulation.
         * @memberof fp
         */
        updateYear: function() {
            if ( !fp.AppState.runSimulation )
                return;
            fp.timescale.frameCounter++;
            if ( fp.timescale.frameCounter % fp.timescale.framesToYear === 0) {
                if ( fp.timescale.currentYear <  fp.timescale.endYear ) {
                    fp.timescale.currentYear++;
                    fp.setOutputHUD();
                }
                else
                    fp.endSim();
            }
        },

        /**
         * @memberof fp
         */
        getPatchIndex: function(x, y) {
            x = Math.round(x / appConfig.terrainOptions.multiplier);
            y = Math.round(y / appConfig.terrainOptions.multiplier);
            var dim = terrain.gridPoints / fp.patchNetwork.patchSize;
            var halfGrid = terrain.gridExtent / 2;
            var pX = Math.floor( dim * (x / 2 + halfGrid) / terrain.gridExtent );
            var pY = Math.floor( dim * (halfGrid + y / 2) / terrain.gridExtent );
            return pY * dim + pX;
        },

        /**
         * @memberof fp
         */
        getIndex: function(x, y) {
            x = Math.round(x / appConfig.terrainOptions.multiplier);
            y = Math.round(y / appConfig.terrainOptions.multiplier);
            var maxExtent = appConfig.agentOptions.maxExtent;
            var xRel = Math.round(x) + terrain.halfExtent;
            var yRel = Math.round(y) + terrain.halfExtent;
            if (xRel < 0 || yRel < 0 || xRel > maxExtent || yRel > maxExtent)
                return -1;
            var halfGrid = terrain.gridExtent / 2;
            var gridRatio = terrain.gridExtent / terrain.gridPoints;
            y += gridRatio / 2;
            //y = (terrain.gridPoints * terrain.gridPoints) - y - 1;
            var xLoc = Math.floor((Math.round(x) + halfGrid) / gridRatio);
            var yLoc = Math.floor((Math.round(y) + halfGrid) / gridRatio);
            return Math.floor(terrain.gridPoints * yLoc + xLoc);
        },

        /**
         * @memberof fp
         */
        getHeightForIndex: function(index) {
            if (index >= 0 && !_.isUndefined( terrain.plane.geometry.attributes.position.array[index * 3 + 2] ) )
                return terrain.plane.geometry.attributes.position.array[index * 3 + 2];
            return null;
        },

        /**
         * @memberof fp
         */
        getHeight: function(x, y) {
            return fp.getHeightForIndex( fp.getIndex(x, y) );
        },

        /**
         * @memberof fp
         */
        speedOfSim: function() {
            return true;
        },

        /**
         * @memberof fp
         */
        likelihoodOfGrowth: function() {
            return (1 - (fp.buildingNetwork.speedOfConstruction * fp.speedOfSim()) );
        },

        /**
         * @memberof fp
         */
        checkProximityOfRoads: function(index) {
            var cells = fp.surroundingCells(index);
            for (var i = 0; i < cells.length; i++) {
                var cell = cells[i];
                if (fp.roadNetwork.indexValues.indexOf(fp.getIndex(cell.x, cell.y)) > -1)
                    return 1.0;
            }
            return 0.0;
        },

        /**
         * Count how many surrounding cells are also sea level
         * @memberof fp
         * @param  {Number} index
         * @return {Number}
         */
        checkProximityOfWater: function(index) {
            // Now count how many surrounding are also sea level
            // We count in 8 directions, to maxDepth
            var seaLevelNeighbours = 0, totalNeighbours = 0;
            fp.surroundingCells(index).forEach(function(cell) {
                if (cell.z <= 0)
                    seaLevelNeighbours++;
                totalNeighbours++;
            });
            return seaLevelNeighbours / totalNeighbours;
        },

        /**
         * Count how many surrounding cells are also buildings
         * @memberof fp
         * @param  {Number} index
         * @return {Number}
         */
        checkProximityOfBuildings: function(index) {
            // Count number of positions
            var buildingNeighbours = 0, totalNeighbours = 0;
            fp.surroundingCells(index).forEach(function(cell) {
                if ( !_.isUndefined( fp.buildingNetwork.buildingHash[fp.getIndex(cell.x, cell.y)] ) )
                    buildingNeighbours++;
                totalNeighbours++;
            });
            return buildingNeighbours / totalNeighbours;
        },

        /**
         * Now count how many surrounding are also sea level.
         * We count in 8 directions, to maxDepth
         * @memberof fp
         */
        checkProximiteBuildingHeight: function(index) {
            if ( fp.buildingNetwork.buildings.length === 0 )
                return 0;

            var surrounding = fp.surroundingCells(index);
            // Count number of positions
            var buildingNeighbours = 0, totalNeighbours = 0;

            var allHeights = jStat(_.map(fp.buildingNetwork.buildings, function(building) {return building.maxHeight; } ));
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
        },

        /**
         * @memberof fp
         */
        surroundingCells: function(index) {
            // Now count how many surrounding are also sea level
            // We count in 8 directions, to maxDepth
            // We also try to ignore cases which go over grid boundaries
            var surroundingCells = [];
            var maxCells = terrain.gridPoints * terrain.gridPoints,
                positions = terrain.plane.geometry.attributes.position.array;
            var indexY = Math.floor(index / terrain.gridPoints),
                indexX = index % terrain.gridPoints,
                indexMirroredOnY = (indexY) * terrain.gridPoints + indexX,
                inc = appConfig.worldOptions.searchIncrement,
                threshold = appConfig.worldOptions.maxLandSearchDepth * inc;
                //indexMirroredOnY = (terrain.gridPoints - indexY) * terrain.gridPoints + indexX;
            for (var j = inc; j <= threshold; j += inc) {
                if (Math.floor((indexMirroredOnY - j) / terrain.gridPoints) == Math.floor(indexMirroredOnY / terrain.gridPoints)) {
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * (indexMirroredOnY - j - (terrain.gridPoints * j) ) + 0],
                            positions[3 * (indexMirroredOnY - j - (terrain.gridPoints * j) ) + 1],
                            positions[3 * (indexMirroredOnY - j - (terrain.gridPoints * j) ) + 2]
                    ) );
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * (indexMirroredOnY - j ) + 0],
                            positions[3 * (indexMirroredOnY - j ) + 1],
                            positions[3 * (indexMirroredOnY - j ) + 2]
                    ) );
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * (indexMirroredOnY - j + (terrain.gridPoints * j) ) + 0],
                            positions[3 * (indexMirroredOnY - j + (terrain.gridPoints * j) ) + 1],
                            positions[3 * (indexMirroredOnY - j + (terrain.gridPoints * j) ) + 2]
                    ) );
                }
                if (Math.floor((indexMirroredOnY + j) / terrain.gridPoints) == Math.floor(indexMirroredOnY / terrain.gridPoints)) {
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * ( indexMirroredOnY + j - (terrain.gridPoints * j) ) + 0],
                            positions[3 * ( indexMirroredOnY + j - (terrain.gridPoints * j) ) + 1],
                            positions[3 * ( indexMirroredOnY + j - (terrain.gridPoints * j) ) + 2]
                    ) );
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * ( indexMirroredOnY + j ) + 0],
                            positions[3 * ( indexMirroredOnY + j ) + 1],
                            positions[3 * ( indexMirroredOnY + j ) + 2]
                    ) );
                    surroundingCells.push( new THREE.Vector3(
                            positions[3 * ( indexMirroredOnY + j + (terrain.gridPoints * j) ) + 0],
                            positions[3 * ( indexMirroredOnY + j + (terrain.gridPoints * j) ) + 1],
                            positions[3 * ( indexMirroredOnY + j + (terrain.gridPoints * j) ) + 2]
                    ) );
                }
                surroundingCells.push( new THREE.Vector3(
                        positions[3 * ( indexMirroredOnY - (terrain.gridPoints * j) ) + 0],
                        positions[3 * ( indexMirroredOnY - (terrain.gridPoints * j) ) + 1],
                        positions[3 * ( indexMirroredOnY - (terrain.gridPoints * j) ) + 2]
                ) );
                surroundingCells.push( new THREE.Vector3(
                        positions[3 * ( indexMirroredOnY + (terrain.gridPoints * j) ) + 0],
                        positions[3 * ( indexMirroredOnY + (terrain.gridPoints * j) ) + 1],
                        positions[3 * ( indexMirroredOnY + (terrain.gridPoints * j) ) + 2]
                ) );
            }
            return _.compact(surroundingCells);
        },

        /**
         * @memberof fp
         */
        updateKeyboard: function() {
            if ( keyboard.pressed("V") ) {
                appConfig.displayOptions.firstPersonView = !appConfig.displayOptions.firstPersonView;
                fp.resetControls();
            }
            if ( appConfig.displayOptions.firstPersonView )
                return;
            if ( keyboard.pressed("S") ) {
                appConfig.Setup();
            }
            else if ( keyboard.pressed("R") ) {
                appConfig.Run();
            }
            else if ( keyboard.pressed("U") ) {
                appConfig.SpeedUp();
            }
            else if ( keyboard.pressed("D") ) {
                appConfig.SlowDown();
            }
            else if ( keyboard.pressed("B") ) {
                appConfig.displayOptions.buildingsShow = !appConfig.displayOptions.buildingsShow;
                fp.toggleBuildingState();
            }
            else if ( keyboard.pressed("O") ) {
                appConfig.displayOptions.roadsShow = !appConfig.displayOptions.roadsShow;
                fp.toggleRoadState();
            }
            else if ( keyboard.pressed("M") ) {
                appConfig.displayOptions.waterShow = !appConfig.displayOptions.waterShow;
                fp.toggleWaterState();
            }
            else if ( keyboard.pressed("N") ) {
                appConfig.displayOptions.networkShow = !appConfig.displayOptions.networkShow;
                fp.toggleAgentNetwork();
            }
            else if ( keyboard.pressed("P") ) {
                appConfig.displayOptions.patchesShow = !appConfig.displayOptions.patchesShow;
                fp.togglePatchesState();
            }
            else if ( keyboard.pressed("T") ) {
                appConfig.displayOptions.trailsShow = !appConfig.displayOptions.trailsShow;
                fp.toggleTrailState();
            }
            else if ( keyboard.pressed("C") ) {
                appConfig.displayOptions.cursorShow = !appConfig.displayOptions.cursorShow;
                fp.removeCursor();
            }
            else if ( keyboard.pressed("A") ) {
                appConfig.displayOptions.statsShow = !appConfig.displayOptions.statsShow;
                fp.toggleStatsState();
            }
            else if ( keyboard.pressed("W") ) {
                appConfig.displayOptions.wireframeShow = !appConfig.displayOptions.wireframeShow;
                fp.toggleWireframeState();
            }
            else if ( keyboard.pressed("Y") ) {
                appConfig.displayOptions.dayShow = !appConfig.displayOptions.dayShow;
                fp.toggleDayNight();
            }
            else if ( keyboard.pressed("G") ) {
                appConfig.displayOptions.chartShow = !appConfig.displayOptions.chartShow;
                fp.updateGraph();
            }
            else if ( keyboard.pressed("X") ) {
                appConfig.displayOptions.pathsShow = !appConfig.displayOptions.pathsShow;
                pathNetwork.updatePathsState();
            }
            else if ( keyboard.pressed("E") ) {
                appConfig.displayOptions.terrainShow = !appConfig.displayOptions.terrainShow;
                terrain.updateTerrainPlane();
            }
        },

        /**
         * @memberof fp
         */
        mouseIntersects: function( eventInfo ) {
            //this where begin to transform the mouse cordinates to three,js cordinates
            mouse.x = ( eventInfo.clientX / window.innerWidth ) * 2 - 1;
            mouse.y = -( eventInfo.clientY / window.innerHeight ) * 2 + 1;

            //this vector caries the mouse click cordinates
            mouseVector.set( mouse.x, mouse.y, mouse.z );

            //the final step of the transformation process, basically this method call
            //creates a point in 3d space where the mouse click occurd
            mouseVector.unproject( camera );

            var direction = mouseVector.sub( camera.position ).normalize();

            ray.set( camera.position, direction );

            //asking the raycaster if the mouse click touched the sphere object
            var intersects = ray.intersectObject( terrain.plane );

            //the ray will return an array with length of 1 or greater if the mouse click
            //does touch the plane object
            var point;
            if ( intersects.length > 0 )
                point = intersects[0].point;

            return point;
        },

        /**
         * @memberof fp
         */
        onMouseMove: function( eventInfo ) {
            //stop any other event listener from recieving this event
            eventInfo.preventDefault();

            if ( !appConfig.displayOptions.cursorShow )
                return;

            var planePoint = fp.mouseIntersects( eventInfo );
            if ( appConfig.displayOptions.cursorShowCell )
                cursor.createCellFill( planePoint.x, planePoint.z );
            else
                cursor.createCell( planePoint.x, planePoint.z );

            if (eventInfo.which == 1)
                terrain.flattenTerrain();
        },

        /**
         * @memberof fp
         */
        onMouseUp: function(eventInfo) {
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
                    addRoad(p1, p2, appConfig.roadOptions.roadWidth);
                    p1 = p2 = undefined;
                }
            }
        },

        /**
         * Toggles the visibility of the building network.
         * @memberof fp
         */
        toggleBuildingState: function() {
            if ( !appConfig.displayOptions.buildingsShow )
                scene.remove(fp.buildingNetwork.networkMesh);
            else
                scene.add(fp.buildingNetwork.networkMesh);
        },

        /**
         * Toggles the visibility of the raod network.
         * @memberof fp
         */
        toggleRoadState: function() {
            if ( !appConfig.displayOptions.roadsShow )
                scene.remove( fp.roadNetwork.networkMesh );
            else if ( !_.isUndefined( fp.roadNetwork.networkMesh ) )
                scene.add( fp.roadNetwork.networkMesh );
        },

        /**
         * Toggles the visibility of water.
         * @memberof fp
         */
        toggleWaterState: function() {
            if ( !appConfig.displayOptions.waterShow )
                scene.remove( waterMesh );
            else
                scene.add( waterMesh );
        },

        /**
         * Toggles the visibility of the agent network.
         * @memberof fp
         */
        toggleAgentNetwork: function() {
            if ( !appConfig.displayOptions.networkShow ) {
                fp.agentNetwork.networks.forEach( function( network ) {
                    scene.remove( network.networkMesh );
                });
            }
            else {
                fp.agentNetwork.networks.forEach( function( network ) {
                    scene.add( network.networkMesh );
                });
            }
        },

        /**
         * Toggles the visibility of terrain patches.
         * @memberof fp
         */
        togglePatchesState: function() {
            if ( appConfig.displayOptions.patchesUseShader )
                fp.patchNetwork.togglePatchesStateWithShader();
            else
                fp.patchNetwork.togglePatchesStateWithoutShader();
        },

        /**
         * Toggles the visibility of the trail.
         * @memberof fp
         */
        toggleTrailState: function() {
            if ( !appConfig.displayOptions.trailsShow ||
                !appConfig.displayOptions.trailsShowAsLines ) {
                scene.remove( trailNetwork.globalTrailLine );
            }
            else if ( appConfig.displayOptions.trailsShowAsLines ) {
                scene.add( trailNetwork.globalTrailLine );
            }
        },

        /**
         * Removes cursor.
         * @memberof fp
         */
        removeCursor: function()  {
            scene.remove(cursor.cell);
            cursor.cell = undefined;
        },

        /**
         * Toggles the visibility of the stats widget.
         * @memberof fp
         */
        toggleStatsState: function() {
            if (appConfig.displayOptions.statsShow && stats === null) {
                stats = new Stats();
                stats.domElement.style.position = "absolute";
                stats.domElement.style.top = "0px";
                container.appendChild( stats.domElement );
            }
            $("#stats").toggle(appConfig.displayOptions.statsShow);
        },

        /**
         * Toggles the visibility of the heads-up display.
         * @memberof fp
         */
        toggleHUDState: function() {
            $("#hudDiv").toggle(appConfig.displayOptions.hudShow);
        },

        /**
         * Toggles the visibility of the wireframe.
         * @memberof fp
         */
        toggleWireframeState: function() {
            terrain.simpleTerrainMaterial.wireframe = appConfig.displayOptions.wireframeShow;
            terrain.richTerrainMaterial.wireframe = appConfig.displayOptions.wireframeShow;
            fp.buildingNetwork.buildings.forEach(function(building) {
                building.highResMeshContainer.children.forEach(function(mesh) { mesh.material.wireframe = appConfig.displayOptions.wireframeShow; });
            });
        },

        /**
         * Toggles day or night visibility.
         * @memberof fp
         */
        toggleDayNight: function() {
            var colorBackground, colorBuilding, colorRoad,
                colorAgent, colorNetwork, colorTrail,
                colorBuildingFill, colorBuildingLine, colorBuildingWindow;
            if (appConfig.displayOptions.dayShow) {
                colorBackground = appConfig.colorOptions.colorDayBackground;
                colorRoad = appConfig.colorOptions.colorDayRoad;
                colorAgent = appConfig.colorOptions.colorDayAgent;
                colorNetwork = appConfig.colorOptions.colorDayNetwork;
                colorTrail = appConfig.colorOptions.colorDayTrail;
                colorBuildingFill = appConfig.colorOptions.colorDayBuildingFill;
                colorBuildingLine = appConfig.colorOptions.colorDayBuildingLine;
                colorBuildingWindow = appConfig.colorOptions.colorDayBuildingWindow;
                terrain.richTerrainMaterial.uniforms = fp.ShaderUtils.lambertUniforms( terrain.dayTerrainUniforms );
                terrain.simpleTerrainMaterial.color = new THREE.Color( appConfig.colorOptions.colorDayTerrainLowland1 );
                if ( appConfig.displayOptions.skyboxShow )
                    scene.add( skyBox );
            }
            else {
                colorBackground = appConfig.colorOptions.colorNightBackground;
                colorRoad = appConfig.colorOptions.colorNightRoad;
                colorAgent = appConfig.colorOptions.colorNightAgent;
                colorNetwork = appConfig.colorOptions.colorNightNetwork;
                colorTrail = appConfig.colorOptions.colorNightTrail;
                colorBuildingFill = appConfig.colorOptions.colorNightBuildingFill;
                colorBuildingLine = appConfig.colorOptions.colorNightBuildingLine;
                colorBuildingWindow = appConfig.colorOptions.colorNightBuildingWindow;
                terrain.richTerrainMaterial.uniforms = fp.ShaderUtils.lambertUniforms( terrain.nightTerrainUniforms );
                terrain.simpleTerrainMaterial.color = new THREE.Color( appConfig.colorOptions.colorNightTerrainLowland1 );
                scene.remove( skyBox );
            }
            terrain.richTerrainMaterial.needsUpdate = true; // important!
            terrain.simpleTerrainMaterial.needsUpdate = true; // important!
            terrain.plane.material.needsUpdate = true; // important!
            renderer.setClearColor( colorBackground, 1);
            if ( appConfig.buildingOptions.useShader ) {
                fp.buildingNetwork.buildings.forEach(function(building) {
                    building.highResMeshContainer.children.forEach( function(floor) {
                        floor.material.uniforms.fillColor.value = fp.buildColorVector( colorBuildingFill );
                        floor.material.uniforms.lineColor.value = fp.buildColorVector( colorBuildingLine );
                        floor.material.uniforms.windowColor.value = fp.buildColorVector( colorBuildingWindow );
                        floor.material.needsUpdate = true; // important!
                    });
                });
            }
            if (!_.isNull(fp.roadNetwork.networkMesh)) {
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
            if (!_.isNull(trailNetwork.globalTrailLine)) {
                trailNetwork.globalTrailLine.material.color = new THREE.Color( colorTrail );
                trailNetwork.globalTrailLine.material.colorsNeedUpdate = true;
            }
            if (!_.isNull( fp.agentNetwork.particles ))
                fp.agentNetwork.agents.forEach(function(agent) { agent.color = colorAgent; });
        },

        ShaderUtils: {
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
                    "float posY = pos.z;",
                    "float posZ = pos.y;",
                    "",
                    "// Paint windows",
                    "if (showWindows == 1) {",
                        "// Normalise height",
                        "float height = posY / dimY;",
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
                                "col = vec4(mix(darkGrey, windowColor, pow( rand( vec2( p, floorLevel ) ), vMixin ) ), opacity);",
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
    if (typeof(window) !== "undefined")
        window.fp = fp;
    return fp;
});


