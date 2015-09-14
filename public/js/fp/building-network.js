

define( [
        'fp/fp-base',
        'fp/building'
    ],

    function( FiercePlanet ) {


        /**
         * Represents a network of buildings. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.BuildingNetwork = function( fp ) {

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
                
                if ( _.isNull( fp.roadNetwork.networkGeometry ) ) {

                    return false;

                }

                var buildingGeometry = this.createJstsGeomFromBoundingBox( building );
                return fp.roadNetwork.networkGeometry.crosses( buildingGeometry );

            };


            /**
             * Updates each building.
             */
            this.updateBuildings = function() {
                
                if ( ! fp.appState.runSimulation || !fp.appConfig.displayOptions.buildingsShow ) {

                    return;

                }

                for ( var i = 0; i < fp.buildingNetwork.buildings.length; i++ ) {
                    var building = fp.buildingNetwork.buildings[ i ];
                    var likelihoodToGrow = Math.random();
                    if ( likelihoodToGrow > fp.likelihoodOfGrowth() ) {

                        building.updateBuilding();

                    }

                }

            };

            /**
             * Creates a new building, given a position and dimension
             * Some of the logic derived from: http://learningthreejs.com/blog/2013/08/02/how-to-do-a-procedural-city-in-100lines/
             */
            this.createBuilding = function( position, dimensions ) {

                // Give the building a form
                var buildingForm = fp.appConfig.buildingOptions.buildingForm;

                if ( fp.appConfig.buildingOptions.randomForm ) {

                    buildingForm = FiercePlanet.BUILDING_FORMS.names[
                        Math.floor( Math.random() * FiercePlanet.BUILDING_FORMS.names.length )
                    ];

                }

                var rotateY = ( fp.appConfig.buildingOptions.rotateSetAngle / 180 ) * Math.PI;

                if ( fp.appConfig.buildingOptions.rotateRandomly ) {

                    rotateY = Math.random() * Math.PI;

                }

                var rotation = new THREE.Vector3( 0, rotateY, 0 );
                var building = new FiercePlanet.Building( fp, buildingForm, dimensions, position, rotation );

                // Before we add this, try to detect collision
                if ( fp.appConfig.buildingOptions.detectBuildingCollisions ) {

                    if ( fp.buildingNetwork.collidesWithOtherBuildings( building ) ) {

                        return undefined;

                    }

                }

                if ( fp.appConfig.buildingOptions.detectRoadCollisions ) {

                    if ( fp.buildingNetwork.collidesWithRoads( building ) ) {

                        return undefined;

                    }

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

                if ( fp.appConfig.buildingOptions.detectBuildingCollisions ||
                        fp.appConfig.buildingOptions.detectRoadCollisions ) {

                    fp.buildingNetwork.networkJstsCache.push( this.createJstsGeomFromBoundingBox( building ) );

                }

                return building;

            };

        };

        return FiercePlanet;

    }

)
