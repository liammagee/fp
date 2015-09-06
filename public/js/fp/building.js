

define( [
        'fp/fp-base'
    ],

    function( FiercePlanet ) {


        FiercePlanet.BUILDING_FORMS = {

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
         * Represents a building with a position, dimesions, and one or more floors.
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.Building = function( fp, form, dimensions, position, rotation ) {

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
                var points = FiercePlanet.BUILDING_FORMS[ this.buildingForm ]( this.localWidth, this.localLength, base );

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
                var points = FiercePlanet.BUILDING_FORMS[ this.buildingForm ]( this.localWidth, this.localLength, base );

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

                        var shaderMaterial = new THREE.ShaderMaterial( {

                            uniforms: FiercePlanet.ShaderUtils.lambertUniforms( this.uniforms ),
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



        return FiercePlanet;

    }
)
