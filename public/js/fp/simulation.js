
define(

    [
         'fp/fp-base',
         'fp/app-state',
         'fp/app-controller',
         'fp/app-config',
         'fp/terrain',
         'fp/agent-network',
         'fp/building-network',
         'fp/road-network',
         'fp/patch-network',
         'fp/trail-network',
         'fp/path-network',
         'fp/timescale',
         'fp/cursor',
         'fp/chart'
     ],

    function( FiercePlanet ) {



        /**
         * Drives the simulation.
         *
         * @module fp
         * @namespace fp
         */
        FiercePlanet.Simulation = function() {

            var fp = this;

            // Export the entire namespace, so classes can be instantiated
            // just with reference to this instance
            fp.FiercePlanet = FiercePlanet;

            // Copy class definitions into this instance, to simplify imports
            fp.Agent = FiercePlanet.Agent;
            fp.PatchNetwork = FiercePlanet.PatchNetwork;

            fp.container = null;
            fp.scene = null;
            fp.appConfig = null;
            fp.camera = null;
            fp.renderer = null;
            fp.clock = new THREE.Clock();
            fp.mouse = { x: 0, y: 0, z: 1 };
            fp.mouseVector = new THREE.Vector3();
            fp.keyboard = new THREEx.KeyboardState();
            fp.stats = null;
            fp.terrain = null;
            fp.controls = null;
            fp.gui = null;
            fp.chart = null;
            fp.ray = new THREE.Raycaster( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, 0 ) );
            fp.skyBox = null;
            fp.waterMesh = null;
            fp.water = null;
            fp.agentNetwork = null;
            fp.pathNetwork = null;
            fp.trailNetwork = null;
            fp.cursor = null;
            fp.sim = null;
            fp.lightHemisphere = null;
            fp.lightDirectional = null;
            fp.chart = null;
            fp.appState = new FiercePlanet.AppState();


            /**
             * Generates a THREE.Vector3 object containing RGB values from either
             * a number or string color representation
             * @param  {string/number} color the color to convert
             * @return {THREE.Vector3}       [ description ]
             */
            fp.buildColorVector = function( color ) {

                var bc, r, g, b;

                if ( !isNaN( parseInt( color )) ) {

                    b = color % 256;
                    g = ( ( color - b ) / 256 ) % 256;
                    r = ( ( color - ( g * 256 ) - b ) / ( 256 * 256 ) ) % 256;

                }
                else {

                    bc = parseCSSColor( color );
                    r = bc[ 0 ];
                    g = bc[ 1 ];
                    b = bc[ 2 ];

                }

                return new THREE.Vector3( r / 255.0, g / 255.0, b / 255.0 );

            };


            /**
             * Builds an integer representation of a color.
             * @memberof fp
             */
            fp.buildColorInteger = function( r, g, b ) {

                return r * 256 * 256 + g * 256 + b;

            };


            /**
             * Resizes the renderer and camera aspect.
             */
            fp.onWindowResize = function() {

                if ( fp.appConfig.displayOptions.maximiseView ) {

                    fp.camera.aspect = window.innerWidth / window.innerHeight;
                    fp.camera.updateProjectionMatrix();
                    fp.renderer.setSize( window.innerWidth, window.innerHeight );

                }
                else {

                    var width = $( "#container1" ).width(), height = $( "#container1" ).height();
                    fp.camera.aspect = width / height;
                    fp.camera.updateProjectionMatrix();
                    fp.renderer.setSize( width, height );

                }

            };


            /**
             * Returns a list of the most visited trail points.
             */
            fp.mostVisited = function() {

                return _.chain( trailNetwork.trails ).pairs().sortBy( function( a ) {return a[ 1 ];} ).last( 100 ).value();

            };


            /**
             * Counts the vertices of the object's geometry.
             */
            fp.vertexCount = function( obj ) {

                var count = 0;

                if ( !_.isUndefined( obj.geometry ) ) {

                    if ( !_.isUndefined( obj.geometry.vertices ) ) {
                        count += obj.geometry.vertices.length;
                    }
                    else if ( !_.isUndefined( obj.geometry.attributes.position ) ) {
                        count += obj.geometry.attributes.position.array.length / 3;
                    }

                }

                if ( !_.isUndefined( obj.children ) ) {

                    obj.children.forEach( function( child ) {

                        count += fp.vertexCount( child );

                    } );

                }

                return count;

            };


            /**
             * Sets up the basic sim objects
             */
            fp.setupSimObjects = function() {

                // Set up root objects
                fp.terrain = new FiercePlanet.Terrain( fp );
                fp.terrain.gridExtent = fp.appConfig.terrainOptions.gridExtent;

                fp.agentNetwork = new FiercePlanet.AgentNetwork( fp );
                fp.buildingNetwork = new FiercePlanet.BuildingNetwork( fp );
                fp.roadNetwork = new FiercePlanet.RoadNetwork( fp );
                fp.pathNetwork = new FiercePlanet.PathNetwork( fp );
                fp.trailNetwork = new FiercePlanet.TrailNetwork( fp );
                fp.patchNetwork = new FiercePlanet.PatchNetwork( fp );
                fp.timescale = new FiercePlanet.Timescale();
                fp.cursor = new FiercePlanet.Cursor();

            };


            /**
             * Sets up the THREE.js camera.
             */
            fp.setupCamera = function() {

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
            fp.setupControls = function() {

                if ( fp.appConfig.displayOptions.firstPersonView ) {

                    fp.controls = new THREE.PointerLockControls( fp.camera );
                    fp.scene.add( fp.controls.getObject() );
                    fp.controls.enabled = true;
                    fp.container.requestPointerLock();

                }
                else {

                    // fp.controls = new THREE.TrackballControls( fp.camera, fp.container );
                    // Works better - but has no rotation?
                    fp.controls = new THREE.OrbitControls( fp.camera, fp.container );
                    fp.controls.rotateSpeed = 0.15;
                    fp.controls.zoomSpeed = 0.6;
                    fp.controls.panSpeed = 0.3;

                    fp.controls.enableRotate = true;
                    fp.controls.enableZoom = true;
                    fp.controls.enablePan = true;
                    fp.controls.noRoll = true;
                    fp.controls.minDistance = 1.0;
                    fp.controls.maxDistance = fp.appConfig.terrainOptions.gridExtent;

                }

            };


            /**
             * Resets the state of the camera, controls and water object.
             * @memberof fp
             */
            fp.resetControls = function() {

                fp.setupCamera();
                fp.setupControls();
                fp.setupWater();

            };


            /**
             * Sets up the THREE.js renderer.
             * @memberof fp
             */
            fp.setupRenderer = function() {

                fp.renderer = new THREE.WebGLRenderer( {
                    alpha: true,
                    antialias: true,
                    preserveDrawingBuffer: true  // to allow screenshot
                } );
                fp.renderer.gammaInput = true;
                fp.renderer.gammaOutput = true;

                fp.renderer.shadowMap.enabled = true;
                fp.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                fp.renderer.shadowMap.cullFace = THREE.CullFaceBack;

                fp.renderer.setClearColor( fp.appConfig.colorOptions.colorNightBackground, 1 );
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
            fp.setupLighting = function() {

                // Remove existing lights
                fp.scene.remove( fp.lightHemisphere );
                fp.scene.remove( fp.lightDirectional );

                fp.lightHemisphere = new THREE.HemisphereLight(
                    new THREE.Color( fp.appConfig.colorOptions.colorLightHemisphereSky ),
                    new THREE.Color( fp.appConfig.colorOptions.colorLightHemisphereGround ),
                    new THREE.Color( fp.appConfig.colorOptions.colorLightHemisphereIntensity )
                );
                // var fp.lightHemisphere = new THREE.HemisphereLight( 0xbfbfbf, 0xbfbfbf, 0.8 );
                // var fp.lightHemisphere = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
                // var fp.lightHemisphere = new THREE.HemisphereLight( 0xefeeb0, 0xefeeb0, 1.0 );
                fp.lightHemisphere.position.set( 0, 1000, 0 );
                // if ( fp.appConfig.displayOptions.lightHemisphereShow )
                    // fp.scene.add( fp.lightHemisphere );

                fp.lightDirectional = new THREE.DirectionalLight(
                    new THREE.Color( fp.appConfig.colorOptions.colorLightDirectional ),
                    fp.appConfig.colorOptions.colorLightDirectionalIntensity
                );
                // var fp.lightDirectional = new THREE.DirectionalLight( 0x8f8f4f, 0.5 );
                var extent = fp.terrain.gridExtent;
                fp.lightDirectional.position.set( -extent * 4, extent * 4, -extent * 4 );
                fp.lightDirectional.shadowDarkness = Math.pow( fp.appConfig.colorOptions.colorLightDirectionalIntensity, 2 );
                fp.lightDirectional.castShadow = true;
                // these six values define the boundaries of the yellow box seen above
                fp.lightDirectional.shadowCameraNear = extent / 10;
                fp.lightDirectional.shadowCameraFar = extent * 8;
                // var d = fp.terrain.gridExtent // * fp.appConfig.terrainOptions.multiplier / 2;
                var d = fp.terrain.gridExtent / 2; // * fp.appConfig.terrainOptions.multiplier / 2;
                fp.lightDirectional.shadowMapWidth = d;
                fp.lightDirectional.shadowMapHeight = d;
                fp.lightDirectional.shadowCameraLeft = -d;
                fp.lightDirectional.shadowCameraRight = d;
                fp.lightDirectional.shadowCameraTop = d;
                fp.lightDirectional.shadowCameraBottom = -d;
                fp.lightDirectional.shadowBias = -0.0001;
                //fp.lightDirectional.shadowBias = -0.05;
                // fp.lightDirectional.shadowCameraVisible = true; // for debugging
                if ( fp.appConfig.displayOptions.lightDirectionalShow ) {

                    fp.scene.add( fp.lightDirectional );

                }

            };


            /**
             * @memberof fp
             */
            fp.updateGraphColors = function() {

                if ( _.isNull( fp.chart ) )
                    return null;

                fp.chart.updateGraphColors();

            };


            /**
             * @memberof fp
             */
            fp.updateLighting = function() {

                if ( _.isNull( fp.lightHemisphere ) || _.isNull( fp.lightDirectional ) )
                    return null;

                fp.lightHemisphere.color = new THREE.Color( fp.appConfig.colorOptions.colorLightHemisphereSky );
                fp.lightHemisphere.groundColor = new THREE.Color( fp.appConfig.colorOptions.colorLightHemisphereGround );
                fp.lightHemisphere.intensity = fp.appConfig.colorOptions.colorLightHemisphereIntensity;
                fp.lightDirectional.color = new THREE.Color( fp.appConfig.colorOptions.colorLightDirectional );
                fp.lightDirectional.intensity = fp.appConfig.colorOptions.colorLightDirectionalIntensity;
                fp.lightDirectional.shadowDarkness = Math.pow( fp.appConfig.colorOptions.colorLightDirectionalIntensity, 2 );

            };


            /**
             * @memberof fp
             */
            fp.setupWater = function() {

                if ( !fp.appConfig.displayOptions.waterShow ) {

                    return;

                }

                if ( _.isNull( fp.waterMesh ) ) {

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

                    if ( !_.isUndefined( fp.waterMesh ) ) {

                        fp.scene.remove( fp.waterMesh );

                    }

                    fp.waterMesh = new THREE.Mesh(
                        new THREE.PlaneBufferGeometry( parameters.width * 500, parameters.height * 500, 50, 50 ),
                        fp.water.material
                    );

                    fp.waterMesh.add( fp.water );
                    fp.waterMesh.rotation.x = - Math.PI * 0.5;
                    fp.waterMesh.position.y = 0;

                }

                fp.scene.add( fp.waterMesh );

            };


            /**
             * Sets up the default chart, with three functions for
             * agent population (blue), mean agent health (red), and mean pathch values (green).
             * @memberof fp
             */
            fp.setupChart = function() {

                fp.chart = new FiercePlanet.Chart( fp );
                var agentInitialCount = fp.appConfig.agentOptions.initialPopulation * 2;

                var agentPopulationFunc = function() {

                    return fp.agentNetwork.agents.length;

                }

                var agentHealthFunc = function() {

                    var healthMean = jStat(
                        _.map( fp.agentNetwork.agents,
                            function( agent ) {
                                return agent.health;
                            }
                        )
                    ).mean() / 100;

                    return agentInitialCount / 2 * healthMean;

                }

                var patchMeanFunc = function() {

                    return agentInitialCount / 2 * fp.patchNetwork.patchMeanValue;

                }

                // Add three default functions to generate time series chart data
                fp.chart.setupChart( [

                    agentPopulationFunc,
                    agentHealthFunc,
                    patchMeanFunc

                ] );

            };

            /**
             * @memberof fp
             */
            fp.setupSky = function() {

                // load skybox
                var cubeMap = new THREE.CubeTexture( [ ] );
                cubeMap.format = THREE.RGBFormat;
                cubeMap.flipY = false;
                var loader = new THREE.ImageLoader();

                var skies = [   [ "/textures/skyboxsun25degtest.png", 1024, 0 ],
                                [ "/textures/skyboxsun5deg.png", 1024, 0 ],
                                [ "/textures/skyboxsun5deg2.png", 1024, 0 ],
                                [ "/textures/skyboxsun45deg.png", 1024, 0 ]
                ]; // Skies courtesy of http://reije081.home.xs4all.nl/skyboxes/

                var skyI = Math.floor( Math.random() * skies.length );
                loader.load( skies[ skyI ][ 0 ], function ( image ) {
                    var getSide = function ( x, y ) {
                        var size = skies[ skyI ][ 1 ];
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

                var cubeShader = THREE.ShaderLib[ "cube" ];
                cubeShader.uniforms[ "tCube" ].value = cubeMap;

                var skyBoxMaterial = new THREE.ShaderMaterial( {
                    fragmentShader: cubeShader.fragmentShader,
                    vertexShader: cubeShader.vertexShader,
                    uniforms: cubeShader.uniforms,
                    depthWrite: false,
                    side: THREE.BackSide
                } );

                fp.skyBox = new THREE.Mesh(
                    new THREE.BoxGeometry( 1000000, 1000000, 1000000 ),
                    skyBoxMaterial
                );

                fp.skyBox.position.set( 0, skies[ skyI ][ 2 ], 0 );
                if ( fp.appConfig.displayOptions.skyboxShow )
                    fp.scene.add( fp.skyBox );

            };


            /**
             * @memberof fp
             */
            fp.setOutputHUD = function() {

                $( "#yearValue" ).html( fp.timescale.currentYear );
                $( "#speedValue" ).html( fp.timescale.framesToTick );
                $( "#populationValue" ).html( fp.agentNetwork.agents.length );

            };


            /**
             * @memberof fp
             */
            fp.setupGUI = function( config ) {

                if ( !_.isUndefined( config ) ) {

                    fp.doGUI( config );

                }
                else if ( !_.isUndefined( $ ) && !_.isUndefined( $.urlParam ) ) {

                    var recipe = $.urlParam( "recipe" ), recipeData = $.urlParam( "recipeData" );
                    if ( !_.isUndefined( recipeData ) ) {

                        fp.doGUI( $.parseJSON( decodeURIComponent( recipeData ) ) );

                    }
                    else if ( !_.isUndefined( recipe ) ) {

                        $.getJSON( "/recipes/" + recipe + ".json", function( data ) {

                            fp.doGUI( data );

                        } );

                    }
                    else {

                        fp.doGUI();

                    }
                }
                else {

                    fp.doGUI();

                }

            };

            /**
             * Initialises the simulation.
             * @memberof fp
             * @param  {Object}   config   An object containing overriden config parameters.
             * @param  {Object}   sim      An Object containing a setup() and a tick() function.
             * @param  {Function} callback Callback function to call at the end of initialisation.
             */
            fp.init = function( config, sim, callback ) {

                fp.container = $( "#container" )[ 0 ] || config.container;
                fp.scene = new THREE.Scene();

                // Add helpers and plugins here
                // fp.scene.add( new THREE.AxisHelper( 100 ));
                // fp.scene.add( new THREE.GridHelper( 100,10 ));
                // fp.scene.fog = new THREE.FogExp2( 0xefd1b5, 0.0025 );

                // Do the rest of the setup
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
                fp.setupChart();
                fp.toggleGuiControlsState(); // Add GUI Controls
                fp.toggleHUDState(); // Add HUD
                fp.toggleStatsState(); // Add stats

                window.addEventListener( "resize", fp.onWindowResize, false );

                // Load the terrain asynchronously
                // Only execute the callback once terrain is loaded
                fp.loadTerrain( callback );

            };

            /**
             * The core simulation animation method.
             * @memberof fp
             */
            fp.animate = function() {

                if ( !fp.appState.animate ) {

                    return;

                }

                // Update simulation-specific variables
                fp.doTick();

                // Update year and state
                fp.updateTime();
                fp.updateSimState();

                if ( !_.isNull( fp.chart ) ) {

                    fp.chart.adjustGraphSize();

                }

                fp.updateStats();
                fp.updateControls();
                fp.updateCamera();
                fp.updateKeyboard();
                fp.updateWater();

                requestAnimationFrame( fp.animate );

                // Render
                fp.renderer.render( fp.scene, fp.camera );

            };

            /**
             * Runs the simulation-specific instructions
             */
            fp.doTick = function() {

                if ( fp.appState.runSimulation ) {

                    if ( fp.timescale.frameCounter % fp.timescale.framesToTick === 0 ) {

                        // Must call this first!
                        fp.patchNetwork.updatePatchAgents();

                        fp.sim.tick.call( fp.sim ); // Get around binding problem - see: http://alistapart.com/article/getoutbindingsituations

                        fp.agentNetwork.updateAgentNetwork();

                        fp.buildingNetwork.updateBuildings();
                        fp.patchNetwork.updatePatchValues();
                        fp.trailNetwork.updateTrails();
                        fp.terrain.updateTerrain();

                        fp.pathNetwork.updatePath();

                    }

                }

            };

            /**
             * Factory method to generate a default sim object.
             * @memberof fp
             */
            fp.simDefault = function() {

                return {

                    counter: 0,
                    setup: function() { /* console.log( "Default sim set up" ); */ },
                    tick: function()  { /* console.log( "Default sim tick: " + (++ fp.counter )); */ }

                };

            };

            /**
             * Updates the simulation state.
             * @memberof fp
             */
            fp.updateSimState = function() {

                if ( fp.appState.stepSimulation ) {

                    fp.appState.runSimulation = false;

                }

            };


            /**
             * Updates the water object, if it exists.
             * @memberof fp
             */
            fp.updateWater = function() {

                if ( !_.isNull( fp.water ) && !_.isUndefined( fp.water.material.uniforms.time ) ) {

                    fp.water.material.uniforms.time.value += 1.0 / 60.0;
                    fp.water.render();

                }

            };


            /**
             * Updates the controls.
             * @memberof fp
             */
            fp.updateControls = function() {

                if ( !fp.appConfig.displayOptions.cursorShow ) {

                    if ( fp.controls.update ) {

                        fp.controls.update( fp.clock.getDelta() );

                    }

                    if ( !_.isUndefined( fp.controls.getObject ) ) {

                        var obj = fp.controls.getObject();
                        var height = fp.getHeight( obj.position.x, obj.position.z );
                        /*
                        if ( height < obj.position.y )
                            obj.position.y = obj.position.y - 1;
                        else if ( height > obj.position.y )
                            obj.position.y = obj.position.y + 1;
                        */
                        if ( height != obj.position.y ) {
                            obj.position.y = height;
                        }
                        //obj.translateY( fp.getHeight( obj.position.x, obj.position.z ) );
                    }

                }

            };


            /**
             * Adjusts the graph size if needed.
             * @memberof fp
             */
            fp.updateGraph = function() {

                if ( fp.chart.chart.seriesSet.length == 3 &&
                    fp.chart.chart.options.maxValue <= fp.agentNetwork.agents.length ) {

                    fp.chart.chart.options.maxValue *= 2;

                }

            };


            /**
             * Updates the stats widget.
             * @memberof fp
             */
            fp.updateStats = function() {
                if ( fp.appConfig.displayOptions.statsShow )
                    fp.stats.update();
            };

            /**
             * Updates the camera for the scene and its objects.
             * @memberof fp
             */
            fp.updateCamera = function() {
                fp.scene.traverse( function( object ) {
                    if ( object instanceof THREE.LOD )
                        object.update( fp.camera );
                } );
                fp.scene.updateMatrixWorld();
            };

            /**
             * Ends the simulation.
             * @memberof fp
             */
            fp.endSim = function() {

                fp.appState.runSimulation = false;
                fp.appConfig.displayOptions.buildingsShow = false;
                fp.appConfig.displayOptions.patchesUpdate = false;

            };

            /**
             * Updates the year of the simulation.
             * @memberof fp
             */
            fp.updateTime = function() {

                if ( fp.appState.runSimulation ) {

                    fp.timescale.frameCounter++;

                    if ( fp.timescale.frameCounter % ( fp.timescale.framesToTick * fp.timescale.ticksToYear ) === 0 ) {

                        if ( !fp.timescale.terminate || fp.timescale.currentYear < fp.timescale.endYear ) {

                            fp.timescale.currentYear++;
                            fp.setOutputHUD();

                        }
                        else {

                            fp.endSim();

                        }

                    }

                }

            };

            /**
             * Obtains the patch index for a given plane coordinate.
             * @memberof fp
             */
            fp.getPatchIndex = function( x, y ) {

                var multiplier = fp.appConfig.terrainOptions.multiplier;
                x = Math.floor( x / multiplier );
                y = Math.floor( y / multiplier );
                var dim = ( fp.terrain.gridPoints - 1 ) / fp.patchNetwork.patchSize;
                var halfGrid = fp.terrain.gridExtent / 2;
                var pX = Math.floor( dim * ( x + halfGrid ) / fp.terrain.gridExtent );
                var pY = Math.floor( dim * ( y + halfGrid ) / fp.terrain.gridExtent );
                var index = Math.floor( pY * dim + pX );
                index = ( index < 0 ) ? 0 : index;
                index = ( index >= fp.patchNetwork.patches.length ) ?
                        fp.patchNetwork.patches.length - 1 :
                        index;

                return index;

            };


            /**
             * Gets the terrain index point for a given ( x, y ) co-ordinate.
             *
             * @param {Number} x
             * @param {Number} y
             */
            fp.getIndex = function( x, y ) {

                // Get config variables
                var multiplier = fp.appConfig.terrainOptions.multiplier;
                var halfExtent = fp.terrain.halfExtent;
                var maxExtent = fp.appConfig.agentOptions.maxExtent;
                var gridExtent = fp.terrain.gridExtent;
                var gridPoints = fp.terrain.gridPoints;

                // Normalise: Divide by terrain multiplier
                x /= multiplier;
                y /= multiplier;

                // Obtain the maximum extent agents can move
                var bounds = ( maxExtent / 100 ) * halfExtent;

                // Return a value if either x or y value is outside the maximum allowable
                if ( x < -bounds || y < -bounds || x > bounds || y > bounds ) {

                    return -1;

                }

                // Grid ratio
                var gridRatio = gridExtent / gridPoints;

                // Shift by half the patch width
                x += gridRatio / 2;
                y += gridRatio / 2;

                // Get indexed values
                var indexedX = Math.floor( ( x + halfExtent ) / gridRatio );
                var indexedY = Math.floor( ( y + halfExtent ) / gridRatio );
                var index = gridPoints * indexedY + indexedX;

                return index;

            };


            /**
             * Gets the terrain height for a given ( x, y ) co-ordinate.
             *
             * @memberof fp
             */
            fp.getHeight = function( x, y ) {

                return fp.terrain.getHeightForIndex( fp.getIndex( x, y ) );

            };

            /**
             * @memberof fp
             */
            fp.speedOfSim = function() {

                return 1.0;

            };

            /**
             * @memberof fp
             */
            fp.likelihoodOfGrowth = function() {

                return ( 1 - ( fp.buildingNetwork.speedOfConstruction * fp.speedOfSim() ) );

            };

            /**
             * @memberof fp
             */
            fp.checkProximityOfRoads = function( index ) {
                var cells = fp.surroundingCells( index );
                for ( var i = 0; i < cells.length; i++ ) {
                    var cell = cells[ i ];
                    if ( fp.roadNetwork.indexValues.indexOf( fp.getIndex( cell.x, cell.y )) > -1 )
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
            fp.checkProximityOfWater = function( index ) {
                // Now count how many surrounding are also sea level
                // We count in 8 directions, to maxDepth
                var seaLevelNeighbours = 0, totalNeighbours = 0;
                fp.surroundingCells( index ).forEach( function( cell ) {
                    if ( cell.z <= 0 )
                        seaLevelNeighbours++;
                    totalNeighbours++;
                } );
                return seaLevelNeighbours / totalNeighbours;
            };


            /**
             * Count how many surrounding cells are also buildings.
             * @memberof fp
             * @param  {Number} index
             * @return {Number}
             */
            fp.checkProximityOfBuildings = function( index, threshold ) {
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
                return ( chance > ( 1 - threshold ) );
            };


            /**
             * Count how many surrounding cells are also buildings
             * @memberof fp
             * @param  {Number} index
             * @return {Number}
             */
            fp.checkNearestNeighbour = function( index, min, max ) {
                // Get coordinates for index
                var coords = fp.terrain.getCoordinatesForIndex( index );
                if ( _.isNull( coords ) )
                    return false;
                var x = coords[ 0 ], z = coords[ 1 ];
                // Get nearest neighbouring building
                var nnDistance = fp.nearestNeighbouringBuildings( x, z );
                return ( min <= nnDistance && nnDistance <= max );
            };


            /**
             * Determines nearest neighbouring building.
             */
            fp.nearestNeighbouringBuildings = function( x, z ) {
                var minSquaredDistance = -1;
                for ( var i = 0; i < fp.buildingNetwork.buildings.length; i++ ) {
                    var building = fp.buildingNetwork.buildings[ i ];
                    var bx = building.lod.position.x, bz = building.lod.position.z;
                    var squaredDistance = Math.pow( bx - x, 2 ) + Math.pow( bz - z, 2 );
                    if ( minSquaredDistance == -1 || squaredDistance < minSquaredDistance )
                        minSquaredDistance = squaredDistance;
                }
                return Math.sqrt( minSquaredDistance );
            };


            /**
             * Now count how many surrounding are also sea level.
             * We count in 8 directions, to maxDepth.
             * @memberof fp
             * @param  {Number} index
             */
            fp.checkProximiteBuildingHeight = function( index ) {
                if ( fp.buildingNetwork.buildings.length === 0 )
                    return 0;

                var surrounding = fp.surroundingCells( index );
                // Count number of positions
                var buildingNeighbours = 0, totalNeighbours = 0;

                var allHeights = jStat( _.map( fp.buildingNetwork.buildings, function( building ) {return building.maxHeight; } ) );
                var meanHeights = allHeights.mean();
                var stdevHeights = allHeights.stdev();

                if ( isNaN( meanHeights ) || isNaN( stdevHeights ))
                    return 0;

                var localBuildings = [ ];
                for ( var j = 0; j < surrounding.length; j++ ) {
                    var cell = surrounding[ j ];
                    if ( cell !== null ) {
                        // Also zero?
                        var key = fp.getIndex( cell.x, cell.y );
                        var building = fp.buildingNetwork.buildingHash[ key ];
                        if ( !_.isUndefined( building ) ) {
                            localBuildings.push( building );
                        }
                    }
                }

                if ( localBuildings.length > 0 ) {

                    var localHeights = jStat( _.map( localBuildings, function( building ) {return building.maxHeight; } ) );
                    var meanLocalHeights = localHeights.mean();

                    // Take the difference between the local and total heights - return that difference as a multiple of total standard deviations
                    return ( meanLocalHeights - meanHeights ) / stdevHeights;

                }
                else {

                    return 0;

                }

            };

            /**
             * Retrieves a collection of THREE.Vector3 objects around a given
             * index point.
             * @memberof fp
             * @param  {Number} index
             * @return {Array} a collection of THREE.Vector3 objects
             */
            fp.surroundingCells = function( index ) {
                // Now count how many surrounding are also sea level
                // We count in 8 directions, to maxDepth
                // We also try to ignore cases which go over grid boundaries
                var surroundingCells = [ ];
                var maxCells = fp.terrain.gridPoints * fp.terrain.gridPoints,
                    positions = fp.terrain.planeArray.array;
                var indexY = Math.floor( index / fp.terrain.gridPoints ),
                    indexX = index % fp.terrain.gridPoints,
                    //indexMirroredOnY = ( indexY ) * fp.terrain.gridPoints + indexX,
                    indexMirroredOnY = ( fp.terrain.gridPoints - indexY ) * fp.terrain.gridPoints + indexX,
                    inc = fp.appConfig.terrainOptions.multiplier,
                    threshold = fp.appConfig.worldOptions.maxLandSearchDepth * inc;

                for ( var j = inc; j <= threshold; j += inc ) {
                    if ( Math.floor( (indexMirroredOnY - j ) / fp.terrain.gridPoints ) == Math.floor( indexMirroredOnY / fp.terrain.gridPoints )) {
                        surroundingCells.push( new THREE.Vector3(
                                positions[ 3 * ( indexMirroredOnY - j - ( fp.terrain.gridPoints * j ) ) + 0 ],
                                positions[ 3 * ( indexMirroredOnY - j - ( fp.terrain.gridPoints * j ) ) + 1 ],
                                positions[ 3 * ( indexMirroredOnY - j - ( fp.terrain.gridPoints * j ) ) + 2 ]
                        ) );
                        surroundingCells.push( new THREE.Vector3(
                                positions[ 3 * ( indexMirroredOnY - j ) + 0 ],
                                positions[ 3 * ( indexMirroredOnY - j ) + 1 ],
                                positions[ 3 * ( indexMirroredOnY - j ) + 2 ]
                        ) );
                        surroundingCells.push( new THREE.Vector3(
                                positions[ 3 * ( indexMirroredOnY - j + ( fp.terrain.gridPoints * j ) ) + 0 ],
                                positions[ 3 * ( indexMirroredOnY - j + ( fp.terrain.gridPoints * j ) ) + 1 ],
                                positions[ 3 * ( indexMirroredOnY - j + ( fp.terrain.gridPoints * j ) ) + 2 ]
                        ) );
                    }
                    if ( Math.floor( (indexMirroredOnY + j ) / fp.terrain.gridPoints ) == Math.floor( indexMirroredOnY / fp.terrain.gridPoints )) {
                        surroundingCells.push( new THREE.Vector3(
                                positions[ 3 * ( indexMirroredOnY + j - ( fp.terrain.gridPoints * j ) ) + 0 ],
                                positions[ 3 * ( indexMirroredOnY + j - ( fp.terrain.gridPoints * j ) ) + 1 ],
                                positions[ 3 * ( indexMirroredOnY + j - ( fp.terrain.gridPoints * j ) ) + 2 ]
                        ) );
                        surroundingCells.push( new THREE.Vector3(
                                positions[ 3 * ( indexMirroredOnY + j ) + 0 ],
                                positions[ 3 * ( indexMirroredOnY + j ) + 1 ],
                                positions[ 3 * ( indexMirroredOnY + j ) + 2 ]
                        ) );
                        surroundingCells.push( new THREE.Vector3(
                                positions[ 3 * ( indexMirroredOnY + j + ( fp.terrain.gridPoints * j ) ) + 0 ],
                                positions[ 3 * ( indexMirroredOnY + j + ( fp.terrain.gridPoints * j ) ) + 1 ],
                                positions[ 3 * ( indexMirroredOnY + j + ( fp.terrain.gridPoints * j ) ) + 2 ]
                        ) );
                    }
                    surroundingCells.push( new THREE.Vector3(
                            positions[ 3 * ( indexMirroredOnY - ( fp.terrain.gridPoints * j ) ) + 0 ],
                            positions[ 3 * ( indexMirroredOnY - ( fp.terrain.gridPoints * j ) ) + 1 ],
                            positions[ 3 * ( indexMirroredOnY - ( fp.terrain.gridPoints * j ) ) + 2 ]
                    ) );
                    surroundingCells.push( new THREE.Vector3(
                            positions[ 3 * ( indexMirroredOnY + ( fp.terrain.gridPoints * j ) ) + 0 ],
                            positions[ 3 * ( indexMirroredOnY + ( fp.terrain.gridPoints * j ) ) + 1 ],
                            positions[ 3 * ( indexMirroredOnY + ( fp.terrain.gridPoints * j ) ) + 2 ]
                    ) );
                }

                return _.compact( surroundingCells );

            };

            /**
             * Response to keyboard shortcut strokes.
             * @memberof fp
             */
            fp.updateKeyboard = function() {

                if ( fp.keyboard.pressed( "V" ) ) {

                    fp.appConfig.displayOptions.firstPersonView = !fp.appConfig.displayOptions.firstPersonView;
                    fp.resetControls();

                }
                if ( fp.appConfig.displayOptions.firstPersonView ) {

                    return;

                }
                if ( fp.keyboard.pressed( "S" ) ) {

                    fp.appController.Setup();

                }
                else if ( fp.keyboard.pressed( "R" ) ) {

                    fp.appController.Run();

                }
                else if ( fp.keyboard.pressed( "U" ) ) {

                    fp.appController.SpeedUp();

                }
                else if ( fp.keyboard.pressed( "D" ) ) {

                    fp.appController.SlowDown();

                }
                else if ( fp.keyboard.pressed( "B" ) ) {
                    fp.appConfig.displayOptions.buildingsShow = !fp.appConfig.displayOptions.buildingsShow;
                    fp.toggleBuildingState();
                }
                else if ( fp.keyboard.pressed( "O" ) ) {
                    fp.appConfig.displayOptions.roadsShow = !fp.appConfig.displayOptions.roadsShow;
                    fp.toggleRoadState();
                }
                else if ( fp.keyboard.pressed( "M" ) ) {

                    fp.appConfig.displayOptions.waterShow = !fp.appConfig.displayOptions.waterShow;
                    fp.toggleWaterState();

                }
                else if ( fp.keyboard.pressed( "N" ) ) {

                    fp.appConfig.displayOptions.networkShow = !fp.appConfig.displayOptions.networkShow;
                    fp.toggleAgentNetwork();

                }
                else if ( fp.keyboard.pressed( "P" ) ) {

                    fp.appConfig.displayOptions.patchesShow = !fp.appConfig.displayOptions.patchesShow;
                    fp.togglePatchesState();

                }
                else if ( fp.keyboard.pressed( "T" ) ) {

                    fp.appConfig.displayOptions.trailsShow = !fp.appConfig.displayOptions.trailsShow;
                    fp.toggleTrailState();

                }
                else if ( fp.keyboard.pressed( "C" ) ) {

                    fp.appConfig.displayOptions.cursorShow = !fp.appConfig.displayOptions.cursorShow;
                    fp.removeCursor();

                }
                else if ( fp.keyboard.pressed( "A" ) ) {

                    fp.appConfig.displayOptions.statsShow = !fp.appConfig.displayOptions.statsShow;
                    fp.toggleStatsState();

                }
                else if ( fp.keyboard.pressed( "W" ) ) {

                    fp.appConfig.displayOptions.wireframeShow = !fp.appConfig.displayOptions.wireframeShow;
                    fp.toggleWireframeState();

                }
                else if ( fp.keyboard.pressed( "Y" ) ) {

                    fp.appConfig.displayOptions.dayShow = !fp.appConfig.displayOptions.dayShow;
                    fp.toggleDayNight();

                }
                else if ( fp.keyboard.pressed( "G" ) ) {

                    fp.appConfig.displayOptions.chartShow = !fp.appConfig.displayOptions.chartShow;
                    fp.toggleChart();

                }
                else if ( fp.keyboard.pressed( "X" ) ) {

                    fp.appConfig.displayOptions.pathsShow = !fp.appConfig.displayOptions.pathsShow;
                    fp.togglePathsState();

                }
                else if ( fp.keyboard.pressed( "E" ) ) {

                    fp.appConfig.displayOptions.terrainShow = !fp.appConfig.displayOptions.terrainShow;
                    fp.toggleTerrainPlane();

                }
            };

            /**
             * @memberof fp
             */
            fp.mouseIntersects = function( eventInfo ) {
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
                    point = intersects[ 0 ].point;

                return point;
            };

            /**
             * @memberof fp
             */
            fp.onMouseMove = function( eventInfo ) {
                //stop any other event listener from recieving this event
                eventInfo.preventDefault();

                if ( !fp.appConfig.displayOptions.cursorShow ) {

                    return;

                }

                var planePoint = fp.mouseIntersects( eventInfo );

                if ( fp.appConfig.displayOptions.cursorShowCell ) {

                    fp.cursor.createCellFill( planePoint.x, planePoint.z );

                }
                else {

                    fp.cursor.createCell( planePoint.x, planePoint.z );

                }

                // Specific behaviour for flatting terrain
                if ( eventInfo.which == 1 ) {
                    
                    fp.terrain.flattenTerrain();

                }

            };


            /**
             * Responds to mouse up events.
             * If the meta/alt key is pressed, either (a) creating the starting point of a road or
             * (b) marking the end point, and adding the road.
             * 
             * Otherwise, simply prints the plane point, if any, to the console.
             * 
             * @param   {Object} eventInfo
             * @memberof fp
             */
            fp.onMouseUp = function( eventInfo ) {

                //stop any other event listener from recieving this event
                eventInfo.preventDefault();

                var planePoint = fp.mouseIntersects( eventInfo ), p1, p2;

                if ( ! eventInfo.metaKey ) {

                    console.log( planePoint )
                    return;

                }

                if ( !_.isUndefined( planePoint ) ) {

                    if ( _.isUndefined( p1 ) ) {

                        p1 = planePoint;

                    }
                    else if ( _.isUndefined( p2 )) {
                        
                        p2 = planePoint;
                        fp.roadNetwork.addRoad( p1, p2, appConfig.roadOptions.roadWidth );
                        p1 = p2 = undefined;

                    }

                }

            };


            /**
             * Toggles the visibility of the agent network.
             * @memberof fp
             */
            fp.toggleAgentState = function() {
                
                if ( !fp.appConfig.displayOptions.agentsShow ) {

                    fp.scene.remove(  fp.agentNetwork.particles  );

                }
                else {

                    fp.scene.add(  fp.agentNetwork.particles  );

                }

            };


            /**
             * Toggles the visibility of the building network.
             * @memberof fp
             */
            fp.toggleBuildingState = function() {

                if ( !fp.appConfig.displayOptions.buildingsShow ) {

                    fp.scene.remove( fp.buildingNetwork.networkMesh );

                }
                else {

                    fp.scene.add( fp.buildingNetwork.networkMesh );

                }

            };


            /**
             * Toggles the visibility of the raod network.
             * @memberof fp
             */
            fp.toggleRoadState = function() {

                if ( !fp.appConfig.displayOptions.roadsShow ) {

                    fp.scene.remove( fp.roadNetwork.networkMesh );

                }
                else if ( !_.isUndefined( fp.roadNetwork.networkMesh ) ) {

                    fp.scene.add( fp.roadNetwork.networkMesh );

                }

            };


            /**
             * Toggles the visibility of water.
             * @memberof fp
             */
            fp.toggleWaterState = function() {
                if ( fp.appConfig.displayOptions.waterShow ) {

                    if ( _.isNull( fp.waterMesh ) ) {

                        fp.setupWater();

                    }

                }
                else {

                    fp.scene.remove( fp.waterMesh );

                }
            };

            /**
             * Toggles the visibility of the agent network.
             * @memberof fp
             */
            fp.toggleAgentNetwork = function() {

                if ( !fp.appConfig.displayOptions.networkShow ) {

                    fp.agentNetwork.networks.forEach( function( network ) {

                        fp.scene.remove( network.networkMesh );

                    } );

                }
                else {

                    fp.agentNetwork.networks.forEach( function( network ) {

                        if ( !_.isNull( network.networkMesh ) ) {

                            fp.scene.add( network.networkMesh );

                        }

                    } );

                }

            };

            /**
             * Toggles the visibility of fp.terrain patches.
             * @memberof fp
             */
            fp.togglePatchesState = function() {

                fp.patchNetwork.togglePatchesState();

            };


            /**
             * Toggles the visibility of the trail.
             * @memberof fp
             */
            fp.toggleTrailState = function() {

                if ( !fp.appConfig.displayOptions.trailsShow ||
                    !fp.appConfig.displayOptions.trailsShowAsLines ) {

                    fp.scene.remove( fp.trailNetwork.globalTrailLine );

                }
                else if ( appConfig.displayOptions.trailsShowAsLines ) {

                    fp.scene.add( fp.trailNetwork.globalTrailLine );

                }

            };


            /**
             * Toggles the visibility of the chart.
             * @memberof fp
             */
            fp.toggleChart = function() {

                if ( fp.chart !== null ) {

                    fp.chart.toggleVisibility();

                }

            };


            /**
             * Toggles the visibility of the path network.
             * @memberof fp
             */
            fp.togglePathsState = function() {
                if ( !fp.appConfig.displayOptions.pathsShow )
                    fp.scene.remove( fp.pathNetwork.networkMesh );
                else
                    fp.scene.add( fp.pathNetwork.networkMesh );
            };


            /**
             * Toggles the visibility of the terrain.
             * @memberof fp
             */
            fp.toggleTerrainPlane = function() {
                if ( !fp.appConfig.displayOptions.terrainShow )
                    fp.scene.remove( fp.terrain.plane );
                else
                    fp.scene.add( fp.terrain.plane );
            };


            /**
             * Toggles the visibility of the lights.
             * @memberof fp
             */
            fp.toggleLights = function() {

                if ( !fp.appConfig.displayOptions.lightHemisphereShow ) {

                    fp.scene.remove( fp.lightHemisphere );

                }
                else {

                    fp.scene.add( fp.lightHemisphere );

                }

                if ( !fp.appConfig.displayOptions.lightDirectionalShow ) {

                    fp.scene.remove( fp.lightDirectional );

                }
                else {

                    fp.scene.add( fp.lightDirectional );

                }

            };



            /**
             * Removes cursor.
             * @memberof fp
             */
            fp.removeCursor = function()  {
                fp.scene.remove( fp.cursor.cell );
                fp.cursor.cell = undefined;
            };

            /**
             * Toggles the visibility of the stats widget.
             * @memberof fp
             */
            fp.toggleStatsState = function() {

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
            fp.toggleHUDState = function() {

                $( "#hudDiv" ).toggle( fp.appConfig.displayOptions.hudShow );

            };


            /**
             * Toggles the visibility of the gui controls.
             * @memberof fp
             */
            fp.toggleGuiControlsState = function() {

                $( ".dg.ac" ).toggle( fp.appConfig.displayOptions.guiControlsShow );

            };


            /**
             * Toggles the visibility of the wireframe.
             * @memberof fp
             */
            fp.toggleWireframeState = function() {
                fp.terrain.simpleTerrainMaterial.wireframe = fp.appConfig.displayOptions.wireframeShow;
                fp.terrain.richTerrainMaterial.wireframe = fp.appConfig.displayOptions.wireframeShow;
                fp.buildingNetwork.buildings.forEach( function( building ) {
                    building.highResMeshContainer.children.forEach( function( mesh ) {
                        mesh.material.wireframe = fp.appConfig.displayOptions.wireframeShow;
                    } );
                } );
            };

            /**
             * Toggles day or night visibility.
             * @memberof fp
             */
            fp.toggleDayNight = function() {

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
                    fp.terrain.richTerrainMaterial.uniforms = FiercePlanet.ShaderUtils.phongUniforms( fp.terrain.createUniforms() );
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
                    fp.terrain.richTerrainMaterial.uniforms = FiercePlanet.ShaderUtils.phongUniforms( fp.terrain.createUniforms() );
                    fp.terrain.simpleTerrainMaterial.color = new THREE.Color( fp.appConfig.colorOptions.colorNightTerrainLowland1 );
                    if ( fp.appConfig.displayOptions.skyboxShow )
                        fp.scene.remove( fp.skyBox );
                }

                fp.terrain.richTerrainMaterial.needsUpdate = true; // important!
                fp.terrain.simpleTerrainMaterial.needsUpdate = true; // important!
                fp.terrain.plane.material.needsUpdate = true; // important!
                fp.renderer.setClearColor( colorBackground, 1 );

                if ( fp.appConfig.buildingOptions.useShader ) {
                    fp.buildingNetwork.buildings.forEach( function( building ) {
                        building.highResMeshContainer.children.forEach( function( floor ) {
                            floor.material.uniforms.fillColor.value = fp.buildColorVector( colorBuildingFill );
                            floor.material.uniforms.lineColor.value = fp.buildColorVector( colorBuildingLine );
                            floor.material.uniforms.windowColor.value = fp.buildColorVector( colorBuildingWindow );
                            floor.material.needsUpdate = true; // important!
                        } );
                    } );
                }

                if ( !_.isNull( fp.roadNetwork.networkMesh ) ) {
                    fp.roadNetwork.networkMesh.children.forEach( function( road ) {
                        road.material.color = new THREE.Color( colorRoad );
                        road.material.colorsNeedUpdate = true;
                    } );
                }

                fp.agentNetwork.networks.forEach( function( network ) {
                    if ( !_.isNull( network.networkMesh ) ) {
                        network.networkMesh.material.color = new THREE.Color( colorNetwork );
                        network.networkMesh.material.colorsNeedUpdate = true;
                    }
                } );

                if ( !_.isNull( fp.trailNetwork.globalTrailLine ) ) {
                    fp.trailNetwork.globalTrailLine.material.color = new THREE.Color( colorTrail );
                    fp.trailNetwork.globalTrailLine.material.colorsNeedUpdate = true;
                }

                if ( !_.isNull( fp.agentNetwork.particles ) ) {

                    fp.agentNetwork.agents.forEach( function( agent ) { agent.color = colorAgent; } );

                }

            };

            /**
             * Loads the actual terrain, using the THREE.TerrainLoader class.
             * @param  {Function} callback A function that is called after the terrain is loaded successfully.
             */
            fp.loadTerrain = function( callback ) {

                var terrainLoader = new THREE.TerrainLoader();
                var terrainFile = FiercePlanet.TERRAIN_MAPS[ fp.terrain.terrainMapIndex ]

                if ( !_.isUndefined( fp.terrain.terrainMapFile ) && fp.terrain.terrainMapFile !== "" ) {

                    terrainFile = fp.terrain.terrainMapFile;

                }

                // Load the terrain, with a callback for terrain data
                terrainLoader.load( terrainFile, function( terrainData ) {

                    fp.terrain.initTerrain( terrainData );

                    // Toggle the patches, in case they need to be shown now
                    fp.togglePatchesState();

                    // Kick off the animation loop
                    fp.animate();

                    if ( _.isFunction( callback ) ) {

                        callback(); // Run the callback

                    }

               } );

            };


            /**
             * Updates the terrain with current values
             */
            fp.updateTerrain = function() {

                fp.terrain.plane.material.uniforms = FiercePlanet.ShaderUtils.phongUniforms( fp.terrain.createUniforms() );
                fp.terrain.plane.material.needsUpdate = true;

            };


            /**
             * Gets the offset for the level of a building.
             * NOTE: Should be moved to building.js
             */
            fp.getOffset = function( currentLevel, len ) {

                var initOffset = ( currentLevel > 0 ) ? len * 2 : 0;
                var offset = initOffset + ( currentLevel ) * len * 4;
                return offset;

            };

            /**
             * Creates a dat.GUI interface for controlling and configuring the simulation.
             * @param  {Object} config  An object representation of properties to override defaults for the fp.AppConfig object.
             */
            fp.doGUI = function( config ) {

                fp.appConfig = new FiercePlanet.AppConfig();
                fp.appController = new FiercePlanet.AppController( fp );

                fp.gui = new dat.GUI( { load: config } );

                fp.gui.remember( fp.appConfig );
                fp.gui.remember( fp.appConfig.agentOptions );
                fp.gui.remember( fp.appConfig.buildingOptions );
                fp.gui.remember( fp.appConfig.roadOptions );
                fp.gui.remember( fp.appConfig.terrainOptions );
                fp.gui.remember( fp.appConfig.displayOptions );
                fp.gui.remember( fp.appConfig.colorOptions );

                fp.gui.add( fp.appController, "Setup" );
                fp.gui.add( fp.appController, "Run" );
                fp.gui.add( fp.appController, "Step" );

                if ( fp.appConfig.displayOptions.guiShowControls ) {

                    var controlPanel = fp.gui.addFolder( "More controls" );
                    controlPanel.add( fp.appController, "SpeedUp" );
                    controlPanel.add( fp.appController, "SlowDown" );
                    controlPanel.add( fp.appController, "Snapshot" );
                    controlPanel.add( fp.appController, "FullScreen" );
                    controlPanel.add( fp.appController, "SwitchTerrain" );
                    controlPanel.add( fp.appController, "WrapTerrain" );
                    controlPanel.add( fp.appController, "UnwrapTerrain" );

                }

                if ( fp.appConfig.displayOptions.guiShowAgentFolder ) {

                    var agentsFolder = fp.gui.addFolder( "Agent Options" );

                    agentsFolder.add( fp.appConfig.agentOptions, "initialPopulation", 0, 1000 ).step( 1 );
                    agentsFolder.add( fp.appConfig.agentOptions, "initialExtent", 1, 100 ).step( 1 );
                    agentsFolder.add( fp.appConfig.agentOptions, "maxExtent", 1, 100 ).step( 1 );
                    agentsFolder.add( fp.appConfig.agentOptions, "initialX",  0, 100 ).step( 1 );
                    agentsFolder.add( fp.appConfig.agentOptions, "initialY",  0, 100 ).step( 1 );
                    agentsFolder.add( fp.appConfig.agentOptions, "initialCircle" );
                    agentsFolder.add( fp.appConfig.agentOptions, "initialSpeed", 1, 100 ).step( 1 );
                    agentsFolder.add( fp.appConfig.agentOptions, "initialPerturbBy", 0, 1 ).step( 0.05 );
                    agentsFolder.add( fp.appConfig.agentOptions, "randomAge" );
                    agentsFolder.add( fp.appConfig.agentOptions, "shuffle" );

                    agentsFolder.add( fp.appConfig.agentOptions, "establishLinks" );
                    agentsFolder.add( fp.appConfig.agentOptions, "chanceToJoinNetwork", 0.0, 1.0 ).step( 0.01 );
                    agentsFolder.add( fp.appConfig.agentOptions, "chanceToJoinNetworkWithHome", 0.0, 1.0 ).step( 0.01 );
                    agentsFolder.add( fp.appConfig.agentOptions, "chanceToJoinNetworkWithBothHomes", 0.0, 1.0 ).step( 0.01 );
                    agentsFolder.add( fp.appConfig.agentOptions, "chanceToFindPathToHome", 0.0, 1.0 ).step( 0.01 );
                    agentsFolder.add( fp.appConfig.agentOptions, "chanceToFindPathToOtherAgentHome", 0.0, 1.0 ).step( 0.01 );

                    agentsFolder.add( fp.appConfig.agentOptions, "noWater" );
                    agentsFolder.add( fp.appConfig.agentOptions, "noUphill" );
                    agentsFolder.add( fp.appConfig.agentOptions, "visitHomeBuilding", 0.0, 1.0 ).step( 0.001 );
                    agentsFolder.add( fp.appConfig.agentOptions, "visitOtherBuilding", 0.0, 1.0 ).step( 0.001 );
                    agentsFolder.add( fp.appConfig.agentOptions, "movementRelativeToPatch" );
                    agentsFolder.add( fp.appConfig.agentOptions, "movementInPatch", 1, 100 ).step( 1 );
                    agentsFolder.add( fp.appConfig.agentOptions, "movementStrictlyIntercardinal" );
                    agentsFolder.add( fp.appConfig.agentOptions, "changeDirectionEveryTick" );
                    agentsFolder.add( fp.appConfig.agentOptions, "perturbDirectionEveryTick" );

                    agentsFolder.add( fp.appConfig.agentOptions, "useStickman" );
                    agentsFolder.add( fp.appConfig.agentOptions, "size", 10, 1000  ).step( 10 );
                    agentsFolder.add( fp.appConfig.agentOptions, "terrainOffset", 0, 100  ).step( 1 );

                }

                if ( fp.appConfig.displayOptions.guiShowBuildingsFolder ) {

                    var buildingsFolder = fp.gui.addFolder( "Building Options" );
                    buildingsFolder.add( fp.appConfig.buildingOptions, "create" );
                    buildingsFolder.add( fp.appConfig.buildingOptions, "maxNumber", 1, 100 ).step( 1 );
                    buildingsFolder.add( fp.appConfig.buildingOptions, "detectBuildingCollisions" );
                    buildingsFolder.add( fp.appConfig.buildingOptions, "detectRoadCollisions" );

                    var forms = buildingsFolder.addFolder( "Form" );
                    forms.add( fp.appConfig.buildingOptions, "buildingForm", FiercePlanet.BUILDING_FORMS.names );
                    forms.add( fp.appConfig.buildingOptions, "spread", 1, 100 ).step( 1 );
                    forms.add( fp.appConfig.buildingOptions, "randomForm" );
                    forms.add( fp.appConfig.buildingOptions, "rotateRandomly" );
                    forms.add( fp.appConfig.buildingOptions, "rotateSetAngle", 0, 360 ).step( 1 );

                    var dimensions = buildingsFolder.addFolder( "Dimensions" );
                    dimensions.add( fp.appConfig.buildingOptions, "minHeight", 1, 100 ).step( 1 );
                    dimensions.add( fp.appConfig.buildingOptions, "maxHeight", 2, 200 ).step( 1 );
                    dimensions.add( fp.appConfig.buildingOptions, "heightA", 0.1, 10.0 ).step( 0.1 );
                    dimensions.add( fp.appConfig.buildingOptions, "heightB", 1, 100 ).step( 1 );
                    dimensions.add( fp.appConfig.buildingOptions, "riseRate", 1, 100 ).step( 1 );
                    dimensions.add( fp.appConfig.buildingOptions, "levelHeight", 10, 100 ).step( 1 );
                    dimensions.add( fp.appConfig.buildingOptions, "minWidth", 1, 200 ).step( 1 );
                    dimensions.add( fp.appConfig.buildingOptions, "maxWidth", 41, 400 ).step( 1 );
                    dimensions.add( fp.appConfig.buildingOptions, "minLength", 1, 200 ).step( 1 );
                    dimensions.add( fp.appConfig.buildingOptions, "maxLength", 41, 400 ).step( 1 );

                    var influences = buildingsFolder.addFolder( "Influences" );
                    influences.add( fp.appConfig.buildingOptions, "roads", 0.0, 1.0 ).step( 0.1 );
                    influences.add( fp.appConfig.buildingOptions, "water", 0.0, 1.0 ).step( 0.1 );
                    influences.add( fp.appConfig.buildingOptions, "otherBuildings", 0.0, 1.0 ).step( 0.1 );
                    influences.add( fp.appConfig.buildingOptions, "distanceFromOtherBuildingsMin", 0, 10000 ).step( 100 );
                    influences.add( fp.appConfig.buildingOptions, "distanceFromOtherBuildingsMax", 0, 10000 ).step( 100 );
                    influences.add( fp.appConfig.buildingOptions, "buildingHeight", 0.0, 1.0 ).step( 0.1 );

                    var view = buildingsFolder.addFolder( "Appearance" );
                    view.add( fp.appConfig.buildingOptions, "useShader" );
                    view.add( fp.appConfig.buildingOptions, "useLevelOfDetail" );
                    view.add( fp.appConfig.buildingOptions, "lowResDistance", 2000, 20000 ).step( 1000 );
                    view.add( fp.appConfig.buildingOptions, "highResDistance", 100, 2000 ).step( 100 );
                    view.add( fp.appConfig.buildingOptions, "opacity", 0.0, 1.0 ).step( 0.01 );

                    var fill = view.addFolder( "Fill" );
                    fill.add( fp.appConfig.buildingOptions, "showFill" );
                    fill.add( fp.appConfig.buildingOptions, "fillRooves" );

                    var line = view.addFolder( "Line" );
                    line.add( fp.appConfig.buildingOptions, "showLines" );
                    line.add( fp.appConfig.buildingOptions, "linewidth", 0.1, 8 ).step( 0.1 );

                    var windows = view.addFolder( "Window" );
                    var showWindowsOptions = windows.add( fp.appConfig.buildingOptions, "showWindows" );
                    showWindowsOptions.onChange( function( value ) {

                        fp.buildingNetwork.buildings.forEach( function( b ) {

                            b.uniforms.showWindows.value = value ? 1 : 0;

                        } );

                    } );

                    windows.add( fp.appConfig.buildingOptions, "windowsRandomise" );
                    windows.add( fp.appConfig.buildingOptions, "windowsFlickerRate", 0, 1 ).step( 0.01 );
                    windows.add( fp.appConfig.buildingOptions, "windowWidth", 1, 100 ).step( 1 );
                    windows.add( fp.appConfig.buildingOptions, "windowPercent", 1, 100 ).step( 1 );
                    windows.add( fp.appConfig.buildingOptions, "windowsStartY", 1, 100 ).step( 1 );
                    windows.add( fp.appConfig.buildingOptions, "windowsEndY", 1, 100 ).step( 1 );

                    var stagger = buildingsFolder.addFolder( "Stagger" );
                    stagger.add( fp.appConfig.buildingOptions, "stagger" );
                    stagger.add( fp.appConfig.buildingOptions, "staggerAmount", 1, 100 );

                    var taper = buildingsFolder.addFolder( "Taper" );
                    taper.add( fp.appConfig.buildingOptions, "taper" );
                    taper.add( fp.appConfig.buildingOptions, "taperExponent", 1, 10 ).step( 1 );
                    taper.add( fp.appConfig.buildingOptions, "taperDistribution", 0.1, 5 );

                    var animation = buildingsFolder.addFolder( "Animation" );
                    animation.add( fp.appConfig.buildingOptions, "destroyOnComplete" );
                    animation.add( fp.appConfig.buildingOptions, "loopCreateDestroy" );
                    animation.add( fp.appConfig.buildingOptions, "turning" );
                    animation.add( fp.appConfig.buildingOptions, "falling" );

                }

                if ( fp.appConfig.displayOptions.guiShowRoadsFolder ) {

                    var roadsFolder = fp.gui.addFolder( "Road Options" );
                    roadsFolder.add( fp.appConfig.roadOptions, "create" );
                    roadsFolder.add( fp.appConfig.roadOptions, "maxNumber", 1, 100 ).step( 1 );
                    roadsFolder.add( fp.appConfig.roadOptions, "roadWidth", 5, 50 ).step( 5 );
                    roadsFolder.add( fp.appConfig.roadOptions, "roadDeviation", 0, 50 ).step( 1 );
                    roadsFolder.add( fp.appConfig.roadOptions, "roadRadiusSegments", 2, 20 ).step( 1 );
                    roadsFolder.add( fp.appConfig.roadOptions, "roadSegments", 1, 20 ).step( 1 );
                    roadsFolder.add( fp.appConfig.roadOptions, "initialRadius", 0, 1000 ).step( 100 );
                    roadsFolder.add( fp.appConfig.roadOptions, "probability", 50, 1000 ).step( 50 );
                    roadsFolder.add( fp.appConfig.roadOptions, "lenMinimum", 0, 2000 ).step( 100 );
                    roadsFolder.add( fp.appConfig.roadOptions, "lenMaximum", 100, 2000 ).step( 100 );
                    roadsFolder.add( fp.appConfig.roadOptions, "lenDistributionFactor", 1, 10 ).step( 1 );
                    roadsFolder.add( fp.appConfig.roadOptions, "overlapThreshold", 1, 100 ).step( 1 );
                    roadsFolder.add( fp.appConfig.roadOptions, "flattenAdjustment", 0.025, 1.0 ).step( 0.025 );
                    roadsFolder.add( fp.appConfig.roadOptions, "flattenLift", 0, 40 ).step( 1 );

                }

                if ( fp.appConfig.displayOptions.guiShowTerrainFolder ) {

                    var terrainFolder = fp.gui.addFolder( "Terrain Options" );
                    terrainFolder.add( fp.appConfig.terrainOptions, "loadHeights" ).onFinishChange( fp.loadTerrain );
                    terrainFolder.add( fp.appConfig.terrainOptions, "gridExtent", 1000, 20000 ).step( 1000 ).onFinishChange( fp.loadTerrain );
                    terrainFolder.add( fp.appConfig.terrainOptions, "gridPoints", 2, 2000 ).step( 100 ).onFinishChange( fp.loadTerrain );
                    terrainFolder.add( fp.appConfig.terrainOptions, "defaultHeight", -100, 100 ).step( 1 ).onFinishChange( fp.loadTerrain );
                    terrainFolder.add( fp.appConfig.terrainOptions, "maxTerrainHeight", 0, 2000 ).step( 100 ).onFinishChange( fp.loadTerrain );
                    terrainFolder.add( fp.appConfig.terrainOptions, "shaderUse" ).onFinishChange( fp.loadTerrain );
                    terrainFolder.add( fp.appConfig.terrainOptions, "shaderShadowMix", 0, 1 ).step( 0.05 ).onFinishChange( fp.updateTerrain );
                    terrainFolder.add( fp.appConfig.terrainOptions, "multiplier", 0.1, 10 ).step( 0.1 ).onFinishChange( fp.loadTerrain );
                    terrainFolder.add( fp.appConfig.terrainOptions, "patchSize", 1, 100 ).step( 1 ).onFinishChange( fp.loadTerrain );
                    terrainFolder.add( fp.appConfig.terrainOptions, "mapIndex", 0, 1 ).step( 1 ).onFinishChange( fp.loadTerrain );
                    terrainFolder.add( fp.appConfig.terrainOptions, "mapFile" ).onFinishChange( fp.loadTerrain );

                }

                if ( fp.appConfig.displayOptions.guiShowDisplayFolder ) {

                    var displayFolder = fp.gui.addFolder( "Display Options" );
                    displayFolder.add( fp.appConfig.displayOptions, "agentsShow" ).onFinishChange( fp.toggleAgentState );
                    displayFolder.add( fp.appConfig.displayOptions, "buildingsShow" ).onFinishChange( fp.toggleBuildingState );
                    displayFolder.add( fp.appConfig.displayOptions, "roadsShow" ).onFinishChange( fp.toggleRoadState );
                    displayFolder.add( fp.appConfig.displayOptions, "waterShow" ).onFinishChange( fp.toggleWaterState );
                    displayFolder.add( fp.appConfig.displayOptions, "networkShow" ).onFinishChange( fp.toggleAgentNetwork );
                    displayFolder.add( fp.appConfig.displayOptions, "networkCurve" );
                    displayFolder.add( fp.appConfig.displayOptions, "networkCurvePoints", 4, 20 ).step( 1 );
                    displayFolder.add( fp.appConfig.displayOptions, "patchesUpdate" );
                    displayFolder.add( fp.appConfig.displayOptions, "patchesShow" ).onFinishChange( fp.togglePatchesState );
                    displayFolder.add( fp.appConfig.displayOptions, "trailsShow" ).onFinishChange( fp.toggleTrailState );
                    displayFolder.add( fp.appConfig.displayOptions, "trailsUpdate" ).onFinishChange( fp.toggleTrailState );
                    displayFolder.add( fp.appConfig.displayOptions, "trailsShowAsLines" ).onFinishChange( fp.toggleTrailState );
                    displayFolder.add( fp.appConfig.displayOptions, "trailLength", 1, 10000 ).step( 1 );
                    displayFolder.add( fp.appConfig.displayOptions, "cursorShow" ).onFinishChange( fp.removeCursor );
                    displayFolder.add( fp.appConfig.displayOptions, "statsShow" ).onFinishChange( fp.toggleStatsState );
                    displayFolder.add( fp.appConfig.displayOptions, "hudShow" ).onFinishChange( fp.toggleHUDState );
                    displayFolder.add( fp.appConfig.displayOptions, "guiControlsShow" ).onFinishChange( fp.toggleGuiControlsState );
                    displayFolder.add( fp.appConfig.displayOptions, "wireframeShow" ).onFinishChange( fp.toggleWireframeState );
                    displayFolder.add( fp.appConfig.displayOptions, "dayShow" ).onFinishChange( fp.toggleDayNight );
                    displayFolder.add( fp.appConfig.displayOptions, "skyboxShow" ).onFinishChange( fp.toggleDayNight );
                    displayFolder.add( fp.appConfig.displayOptions, "chartShow" ).onFinishChange( fp.toggleChart );
                    displayFolder.add( fp.appConfig.displayOptions, "pathsShow" ).onFinishChange( fp.togglePathsState );
                    displayFolder.add( fp.appConfig.displayOptions, "terrainShow" ).onFinishChange( fp.toggleTerrainPlane );
                    displayFolder.add( fp.appConfig.displayOptions, "lightHemisphereShow" ).onFinishChange( fp.toggleLights );
                    displayFolder.add( fp.appConfig.displayOptions, "lightDirectionalShow" ).onFinishChange( fp.toggleLights );
                    displayFolder.add( fp.appConfig.displayOptions, "coloriseAgentsByHealth" );
                    displayFolder.add( fp.appConfig.displayOptions, "firstPersonView" ).onFinishChange( fp.resetControls );
                    displayFolder.add( fp.appConfig.displayOptions, "cameraOverride" ).onFinishChange( fp.resetControls );
                    displayFolder.add( fp.appConfig.displayOptions, "cameraX", 0, 5000 ).onFinishChange( fp.resetControls );
                    displayFolder.add( fp.appConfig.displayOptions, "cameraY", 0, 5000 ).onFinishChange( fp.resetControls );
                    displayFolder.add( fp.appConfig.displayOptions, "cameraZ", 0, 5000 ).onFinishChange( fp.resetControls );
                    displayFolder.add( fp.appConfig.displayOptions, "maximiseView" );
                    displayFolder.add( fp.appConfig.displayOptions, "guiShow" );

                    var folders = displayFolder.addFolder( "Folder Options" );
                    folders.add( fp.appConfig.displayOptions, "guiShowControls" );
                    folders.add( fp.appConfig.displayOptions, "guiShowAgentFolder" );
                    folders.add( fp.appConfig.displayOptions, "guiShowBuildingsFolder" );
                    folders.add( fp.appConfig.displayOptions, "guiShowRoadsFolder" );
                    folders.add( fp.appConfig.displayOptions, "guiShowTerrainFolder" );
                    folders.add( fp.appConfig.displayOptions, "guiShowDisplayFolder" );
                    folders.add( fp.appConfig.displayOptions, "guiShowColorFolder" );

                }

                if ( fp.appConfig.displayOptions.guiShowColorFolder ) {

                    var colorFolder = fp.gui.addFolder( "Color Options" );
                    var colorTerrainFolder = colorFolder.addFolder( "Terrain Colors" );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorDayTerrainGroundLevel" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorNightTerrainGroundLevel" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorDayTerrainLowland1" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorNightTerrainLowland1" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorDayTerrainLowland2" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorNightTerrainLowland2" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorDayTerrainMidland1" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorNightTerrainMidland1" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorDayTerrainMidland2" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorNightTerrainMidland2" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorDayTerrainHighland" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.addColor( fp.appConfig.colorOptions, "colorNightTerrainHighland" ).onChange( fp.loadTerrain );
                    colorTerrainFolder.add( fp.appConfig.colorOptions, "colorTerrainStop1", 0.0, 1.0 ).step(0.01).onChange( fp.loadTerrain );
                    colorTerrainFolder.add( fp.appConfig.colorOptions, "colorTerrainStop2", 0.0, 1.0 ).step(0.01).onChange( fp.loadTerrain );
                    colorTerrainFolder.add( fp.appConfig.colorOptions, "colorTerrainStop3", 0.0, 1.0 ).step(0.01).onChange( fp.loadTerrain );
                    colorTerrainFolder.add( fp.appConfig.colorOptions, "colorTerrainStop4", 0.0, 1.0 ).step(0.01).onChange( fp.loadTerrain );
                    colorTerrainFolder.add( fp.appConfig.colorOptions, "colorTerrainStop5", 0.0, 1.0 ).step(0.01).onChange( fp.loadTerrain );
                    colorTerrainFolder.add( fp.appConfig.colorOptions, "colorTerrainOpacity", 0.0, 1.0 ).step(0.01).onChange( fp.loadTerrain );

                    var colorBuildingFolder = colorFolder.addFolder( "Building Colors" );
                    colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorDayBuildingFill" );
                    colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorNightBuildingFill" );
                    colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorDayBuildingLine" );
                    colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorNightBuildingLine" );
                    colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorDayBuildingWindow" );
                    colorBuildingFolder.addColor( fp.appConfig.colorOptions, "colorNightBuildingWindow" );

                    var colorGraphFolder = colorFolder.addFolder( "Graph Colors" );
                    colorGraphFolder.addColor( fp.appConfig.colorOptions, "colorGraphPopulation" ).onChange( fp.updateChartColors );
                    colorGraphFolder.addColor( fp.appConfig.colorOptions, "colorGraphHealth" ).onChange( fp.updateChartColors );
                    colorGraphFolder.addColor( fp.appConfig.colorOptions, "colorGraphPatchValues" ).onChange( fp.updateChartColors );

                    var colorLightingFolder = colorFolder.addFolder( "Lighting Colors" );
                    colorLightingFolder.addColor( fp.appConfig.colorOptions, "colorLightHemisphereSky" ).onChange( fp.updateLighting );
                    colorLightingFolder.addColor( fp.appConfig.colorOptions, "colorLightHemisphereGround" ).onChange( fp.updateLighting );
                    colorLightingFolder.add( fp.appConfig.colorOptions, "colorLightHemisphereIntensity", 0, 1 ).step( 0.01 ).onChange( fp.updateLighting );
                    colorLightingFolder.addColor( fp.appConfig.colorOptions, "colorLightDirectional" ).onChange( fp.updateLighting );
                    colorLightingFolder.add( fp.appConfig.colorOptions, "colorLightDirectionalIntensity", 0, 1 ).step( 0.01 ).onChange( fp.updateLighting );

                    var colorOtherFolder = colorFolder.addFolder( "Other Colors" );
                    colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorDayBackground" );
                    colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorNightBackground" );
                    colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorDayRoad" );
                    colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorNightRoad" );
                    colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorDayAgent" );
                    colorOtherFolder.addColor( fp.appConfig.colorOptions, "colorNightAgent" );
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

        }

        return FiercePlanet;

    }

)

