

define( [
        'fp/fp-base',
        'fp/app-state'
    ],

    function( FiercePlanet ) {


        FiercePlanet.AppController = function( fp ) {

            /**
             * Resets the state of the fp object.
             */
            this.Reset = function() {

                // First coerce grid points to some multiple of patchSize, + 1
                fp.scene.remove(  fp.agentNetwork.particles  );
                fp.agentNetwork.agents = [ ];
                fp.agentNetwork.agentParticleSystemAttributes = null;
                fp.buildingNetwork.networkJstsCache = [ ];
                fp.buildingNetwork.buildings = [ ];
                fp.buildingNetwork.buildingHash = {};
                fp.roadNetwork.indexValues = [ ];
                fp.roadNetwork.roads = {};

                fp.timescale.currentYear = fp.timescale.initialYear;
                fp.updateYear();
                fp.timescale.frameCounter = 0;
                if ( fp.trailNetwork.trailMeshes )
                    fp.trailNetwork.trailMeshes.forEach( function( trail ) { scene.remove( trail ); } );

                var len = fp.terrain.plane.geometry.attributes.position.array.length / 3,
                    trailPoints = new Float32Array( len ),
                    patchPoints = new Float32Array( len );

                for ( var i = 0; i < len; i++ ) {

                    trailPoints[ i ] = 0;
                    patchPoints[ i ] = 0;

                }

                fp.terrain.plane.geometry.addAttribute( "trail", new THREE.BufferAttribute( trailPoints, 1 ) );
                fp.terrain.plane.geometry.addAttribute( "patch", new THREE.BufferAttribute( patchPoints, 1 ) );
                fp.terrain.plane.geometry.attributes.trail.needsUpdate = true;
                fp.terrain.plane.geometry.attributes.patch.needsUpdate = true;
                fp.trailNetwork.trails = {};

                fp.agentNetwork.networks.forEach( function( network ) {

                    network.links = [ ];
                    fp.scene.remove( network.networkMesh );

                } );

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

                fp.sim.setup.call( fp.sim ); // Get around binding problem - see: http://alistapart.com/article/getoutbindingsituations

                fp.appController.Reset();
                fp.agentNetwork.createInitialAgentPopulation();

                if ( fp.appConfig.displayOptions.agentsShow )
                    fp.scene.add( fp.agentNetwork.particles );

                fp.buildingNetwork.networkMesh = new THREE.Object3D();
                fp.buildingNetwork.networkMesh.castShadow = true;
                fp.buildingNetwork.networkMesh.receiveShadow = true;

                if ( fp.appConfig.displayOptions.buildingsShow )
                    fp.scene.add( fp.buildingNetwork.networkMesh );

                fp.roadNetwork.networkMesh = new THREE.Object3D();
                fp.roadNetwork.planeVertices = [ ];
                if ( fp.appConfig.displayOptions.roadsShow )
                    fp.scene.add( fp.roadNetwork.networkMesh );

                fp.pathNetwork.networkMesh = new THREE.Object3D();
                if ( fp.appConfig.displayOptions.pathsShow )
                    fp.scene.add( fp.pathNetwork.networkMesh );

                fp.trailNetwork.buildTrailNetwork( false );
                /*
                fp.trailNetwork.globalTrailGeometry = new THREE.Geometry();
                for ( var i = 0; i < fp.appConfig.agentOptions.initialPopulation; i++ ) {
                    var vertices = new Array( fp.appConfig.displayOptions.trailLength );
                    for ( var j = 0; j < fp.appConfig.displayOptions.trailLength ; j++ ) {
                        fp.trailNetwork.globalTrailGeometry.vertices.push( fp.agentNetwork.agents[ i ].lastPosition );
                    }
                    var ai = fp.getIndex( fp.agentNetwork.agents[ i ].lastPosition.x / fp.appConfig.terrainOptions.multiplier, fp.agentNetwork.agents[ i ].lastPosition.z / fp.appConfig.terrainOptions.multiplier );
                    if ( ai > -1 )
                        fp.trailNetwork.trails[ ai ] = 1;
                }
                var trailMaterial = new THREE.LineBasicMaterial( {
                    color: fp.appConfig.colorOptions.colorNightTrail,
                var trailMaterial = new THREE.LineBasicMPath( {
                    color: fp.appConfig.colorOptions.colorNightTrail,
                    linewidth: 0.1,
                    opacity: 0.1,
                    blending: THREE.NormalBlending,
                    transparent: true
                } );
                fp.trailNetwork.globalTrailLine = new THREE.Line( fp.trailNetwork.globalTrailGeometry, trailMaterial, THREE.LineSegments );
                if ( fp.appConfig.displayOptions.trailsShowAsLines ) {
                    fp.scene.add( fp.trailNetwork.globalTrailLine );
                }
                */

            };


            this.Run = function() {

                FiercePlanet.AppState.runSimulation = !FiercePlanet.AppState.runSimulation;
                FiercePlanet.AppState.stepSimulation = false;

                if ( !_.isUndefined( fp.chart ) ) {

                    if ( FiercePlanet.AppState.runSimulation ) {

                        fp.chart.chart.start();

                    }
                    else {

                        fp.chart.chart.stop();

                    }

                }

            };


            this.Step = function() {

                FiercePlanet.AppState.runSimulation = FiercePlanet.AppState.stepSimulation = true;

            };


            /**
             * Increase the frame rate relative to the timescale interval.
             */
            this.SpeedUp = function() {

                if ( fp.timescale.framesToYear > fp.timescale.MIN_FRAMES_TO_YEAR )
                    fp.timescale.framesToYear = Math.ceil( fp.timescale.framesToYear / 2 );
                console.log( "Speed: " + fp.timescale.framesToYear );

            };

            /**
             * Decrease the frame rate relative to the timescale interval.
             */
            this.SlowDown = function() {

                if ( fp.timescale.framesToYear < fp.timescale.MAX_FRAMES_TO_YEAR )
                    fp.timescale.framesToYear *= 2;
                console.log( "Speed: " + fp.timescale.framesToYear );

            };

            this.Snapshot = function() {

                var mimetype = mimetype  || "image/png";
                var url = fp.renderer.domElement.toDataURL( mimetype );
                window.open( url, "name-" + Math.random() );

            };

            this.FullScreen = function() {

                if ( document.documentElement.requestFullscreen ) {
                    document.documentElement.requestFullscreen();
                } else if ( document.documentElement.mozRequestFullScreen ) {
                    document.documentElement.mozRequestFullScreen();
                } else if ( document.documentElement.webkitRequestFullscreen ) {
                    document.documentElement.webkitRequestFullscreen();
                } else if ( document.documentElement.msRequestFullscreen ) {
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

        return FiercePlanet;

    }
)
