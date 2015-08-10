

define( [
        'fp/fp-base',
        'fp/config',
        'fp/patch'
    ],

    function( FiercePlanet ) {

        /**
         * Represents a network of patches. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.PatchNetwork = function( fp, func ) {

            this.plane = null;
            this.patches = {};
            this.patchValues = [ ];
            this.patchPlaneArray = [ ];
            this.patchSphereArray = [ ];
            this.patchMeanValue = 0;
            this.patchSize = FiercePlanet.appConfig.terrainOptions.patchSize;
            this.initialisePatchFunction = !_.isUndefined( func ) ? func : function() { return Math.random(); };

            /**
             * Initialises each patch value with a random value.
             */
            this.initialisePatches = function() {

                var dim = Math.ceil( fp.terrain.gridPoints / fp.patchNetwork.patchSize ) - 1;
                fp.patchNetwork.patchValues = new Array( dim * dim );

                for ( var i = 0; i < fp.patchNetwork.patchValues.length; i++ ) {

                    fp.patchNetwork.patchValues[ i ] = new FiercePlanet.Patch( this.initialisePatchFunction() );

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

                if ( fp.appConfig.displayOptions.patchesUpdate && FiercePlanet.AppState.runSimulation ) {

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


            /**
             * Adds or removes the patch network from the scene.
             */
            this.togglePatchesState = function() {

                if ( fp.appConfig.displayOptions.patchesShow  ) {

                    if ( this.plane === null ) {

                        this.buildPatchMesh();

                    }

                    fp.scene.add( this.plane );

                }
                else {

                    fp.scene.remove( this.plane );

                }

            };

        };

        return FiercePlanet;

    }
)
