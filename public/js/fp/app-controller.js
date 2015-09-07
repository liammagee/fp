

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
                fp.updateTime();
                fp.timescale.frameCounter = 0;
                if ( fp.trailNetwork.trailMeshes ) {

                    fp.trailNetwork.trailMeshes.forEach( function( trail ) {

                        scene.remove( trail );

                    } );

                }

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

                fp.appController.Reset();
                fp.agentNetwork.createInitialAgentPopulation();

                if ( fp.appConfig.displayOptions.agentsShow ) {

                    fp.scene.add( fp.agentNetwork.particles );

                }

                fp.buildingNetwork.networkMesh = new THREE.Object3D();
                fp.buildingNetwork.networkMesh.castShadow = true;
                fp.buildingNetwork.networkMesh.receiveShadow = true;

                if ( fp.appConfig.displayOptions.buildingsShow ) {

                    fp.scene.add( fp.buildingNetwork.networkMesh );

                }

                fp.roadNetwork.networkMesh = new THREE.Object3D();
                fp.roadNetwork.planeVertices = [ ];
                if ( fp.appConfig.displayOptions.roadsShow ) {

                    fp.scene.add( fp.roadNetwork.networkMesh );

                }

                fp.pathNetwork.networkMesh = new THREE.Object3D();
                if ( fp.appConfig.displayOptions.pathsShow ) {

                    fp.scene.add( fp.pathNetwork.networkMesh );

                }

                fp.trailNetwork.buildTrailNetwork( false );

                fp.sim.setup.call( fp.sim ); // Get around binding problem - see: http://alistapart.com/article/getoutbindingsituations

                // Call this after the sim setup has been called, in
                // case the attributes need updating
                if ( fp.appConfig.displayOptions.patchesShow ) {

                    fp.patchNetwork.updateTerrainPatchAttributes();

                }

            };


            /**
             * Runs the simulation.
             */
            this.Run = function() {

                FiercePlanet.appState.runSimulation = !FiercePlanet.appState.runSimulation;
                FiercePlanet.appState.stepSimulation = false;

                if ( !_.isUndefined( fp.chart ) ) {

                    if ( FiercePlanet.appState.runSimulation ) {

                        fp.chart.chart.start();

                    }
                    else {

                        fp.chart.chart.stop();

                    }

                }

            };


            /**
             * Runs one step of the simulation.
             */
            this.Step = function() {

                FiercePlanet.appState.runSimulation = FiercePlanet.appState.stepSimulation = true;

            };


            /**
             * Increase the frame rate relative to the timescale interval.
             */
            this.SpeedUp = function() {

                if ( fp.timescale.framesToTick > fp.timescale.MIN_FRAMES_TO_TICK ) {

                    fp.timescale.framesToTick -= 1;

                }

                console.log( "Speed: " + fp.timescale.framesToTick );

            };

            /**
             * Decrease the frame rate relative to the timescale interval.
             */
            this.SlowDown = function() {

                if ( fp.timescale.framesToTick < fp.timescale.MAX_FRAMES_TO_TICK ) {

                    fp.timescale.framesToTick += 1;

                }

                console.log( "Speed: " + fp.timescale.framesToTick );

            };

            /**
             * Takes a snapshot of the current screen (only the canvas).
             */
            this.Snapshot = function() {

                var mimetype = mimetype  || "image/png";
                var url = fp.renderer.domElement.toDataURL( mimetype );
                window.open( url, "name-" + Math.random() );

            };

            /**
             * Toggles full screen view.
             */
            this.FullScreen = function() {

                if ( document.documentElement.requestFullscreen ) {

                    document.documentElement.requestFullscreen();

                }
                else if ( document.documentElement.mozRequestFullScreen ) {

                    document.documentElement.mozRequestFullScreen();

                }
                else if ( document.documentElement.webkitRequestFullscreen ) {

                    document.documentElement.webkitRequestFullscreen();

                }
                else if ( document.documentElement.msRequestFullscreen ) {

                    document.documentElement.msRequestFullscreen();

                }

            };

            /**
             * Cycles through the list of available terrains.
             */
            this.SwitchTerrain = function() {

                fp.appConfig.Reset();
                fp.terrain.terrainMapIndex =
                    ( fp.terrain.terrainMapIndex == fp.TERRAIN_MAPS.length - 1 ) ?
                      0 :
                      fp.terrain.terrainMapIndex + 1;
                fp.loadTerrain();

            };


            /**
             * Sets the terrain to wrap into a sphere.
             */
            this.WrapTerrain = function() {

                fp.appConfig.waterShow = false;
                fp.terrain.wrappingState = 1;

            };

            /**
             * Sets the terrain to return to a plane.
             */
            this.UnwrapTerrain = function() {

                fp.terrain.wrappingState = -1;

            };

        };

        return FiercePlanet;

    }
)
