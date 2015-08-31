

define( [
        'fp/fp-base',
        'fp/agent'
    ],

    function( FiercePlanet ) {


        /**
         * Represents a network of agents. Also provides factory and utility methods.
         *
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.AgentNetwork = function( fp ) {

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
                        var agent1 = link.agent1
                        var agent2 = link.agent2;
                        var p1 = fp.terrain.transformPointFromPlaneToSphere( agent1.position.clone(), fp.terrain.wrappedPercent );
                        var p2 = fp.terrain.transformPointFromPlaneToSphere( agent2.position.clone(), fp.terrain.wrappedPercent );

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

                    if ( !FiercePlanet.AppState.runSimulation || !
                        fp.appConfig.displayOptions.networkShow ) {

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

                    if ( !FiercePlanet.AppState.runSimulation ) {

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
                var agent = new fp.agentNetwork.AgentClass( fp );
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

                if ( !FiercePlanet.AppState.runSimulation || _.isUndefined( this.particles ) ) {

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

                    positionValues[ i * 3 + 0 ] = position.x;
                    positionValues[ i * 3 + 1 ] = position.y;
                    positionValues[ i * 3 + 2 ] = position.z;
                    // geometry.attributes.position.array[ i * 3 + 0 ] = position.x;
                    // geometry.attributes.position.array[ i * 3 + 1 ] = position.y;
                    // geometry.attributes.position.array[ i * 3 + 2 ] = position.z;

                    if ( fp.appConfig.displayOptions.coloriseAgentsByHealth ) {

                        var health = agent.health;
                        var r = ( 100 - health ) / 100.0;
                        var g = fp.appConfig.displayOptions.dayShow ? 0.0 : 1.0;
                        var b = fp.appConfig.displayOptions.dayShow ? 1.0 : 0.0;
                        g *= ( health / 100.0 );
                        b *= ( health / 100.0 );

                        colourValues[ i * 3 + 0 ] = r;
                        colourValues[ i * 3 + 1 ] = g;
                        colourValues[ i * 3 + 2 ] = b;

                        alphaValues[ i ] = 0.75;

                    }
                    else {

                        var color = new THREE.Color( this.agents[ i ].color );
                        colourValues[ i * 3 + 0 ] = color.r;
                        colourValues[ i * 3 + 1 ] = color.g;
                        colourValues[ i * 3 + 2 ] = color.b;

                        alphaValues[ i ] = ( this.agents[ i ].health * 0.0075 ) + 0.025;

                    }

                }

                geometry.addAttribute( 'position', new THREE.BufferAttribute( positionValues, 3 ) );
                geometry.addAttribute( 'color', new THREE.BufferAttribute( colourValues, 3 ) );
                geometry.addAttribute( 'alpha', new THREE.BufferAttribute( alphaValues, 1 ) );

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

                // point cloud material
                var agentShaderMaterial = new THREE.ShaderMaterial( {

                    size: fp.appConfig.agentOptions.size,
                    uniforms: agentParticleSystemUniforms,
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

            this.AgentClass = FiercePlanet.Agent;
            this.agents = [ ];
            this.networks = [ ];
            this.networks.push( new this.AgentNetworkNetwork() );
            this.particles = null;
            this.agentParticleSystemAttributes = null;
        };

        return FiercePlanet;

    }

)

