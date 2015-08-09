

define( [
        'fp/fp-base'
    ],

    function( FiercePlanet ) {


        /**
         * Represents a cursor operating on the world.
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.Cursor = function() {
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


        return FiercePlanet;

    }
)
