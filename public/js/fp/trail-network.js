

define( [
        'fp/fp-base'
    ],

    function( FiercePlanet ) {


        /**
         * Represents a network of trails. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.TrailNetwork = function( fp ) {

            /**
             * Object containing a list of position indexes, and number of times
             * those positions have been traversed.
             *
             * @type {Object}
             */
            this.trails = {};

            // REMOVE?
            this.trailMeshes = null;


            /**
             * Global mesh containing all trails
             *
             * @type {THREE.Mesh}
             */
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

                    var agent = fp.agentNetwork.agents[ i ];
                    var vertices = new Array( len );

                    for ( var j = 0; j < len ; j++ ) {

                        var index = i * len  + j;

                        if ( !clone || index > geom.vertices.length ) {

                            geom.vertices.push( agent.lastPosition );

                        }

                    }

                    var agentIndex = agent.lastIndex;

                    // Add the last position index to the trail array
                    if ( agentIndex > -1 ) {

                        fp.trailNetwork.trails[ agentIndex ] = 1;

                    }

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

                if ( !fp.appState.runSimulation ) {

                    return;

                }

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

        return FiercePlanet;

    }
)
