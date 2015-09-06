

define( [
        'fp/fp-base'
    ],

    function( FiercePlanet ) {

        /**
         * Represents a network of roads. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.RoadNetwork = function( fp ) {

            this.networkMesh = null;
            this.planeVertices = [ ];
            this.networkJstsCache = [ ];
            this.roads = {};
            this.indexValues = [ ];
            this.points = [ ];
            this.networkGeometry = null;
            this.intersections = [ ];

            /**
             * Creates a series of points from a start to end points.
             * The "road" will try to follow the path of least resistance
             * if the fp.terrain has variable height, effectively "curving"
             * around increases in height.
             * Taken from webgl_geometry_extrude_splines.html
             *
             * @param  {THREE.Vector3} p1
             * @param  {THREE.Vector3} p2
             * @return {Array} points
             */
            this.getRoadTerrainPoints = function( p1, p2 ) {
                var points = [ ];
                var xLast = p1.x, yLast = 0, zLast = p1.z, lastChange = 0;
                var xd = p2.x - xLast, zd = p2.z - zLast;
                var distance = Math.sqrt( xd * xd + zd * zd ) / fp.appConfig.roadOptions.roadSegments,
                    remaining = distance;
                var yOffset = fp.appConfig.terrainOptions.defaultHeight + 20; //fp.appConfig.buildingOptions.levelHeight - 10;
                p1 = new THREE.Vector3( p1.x, fp.getHeight( p1.x, p1.z ) + yOffset, p1.z );
                p2 = new THREE.Vector3( p2.x, fp.getHeight( p2.x, p2.z ) + yOffset, p2.z );
                points.push( p1 );
                for ( var i = 0; i < distance; i++ ) {
                    var angle = Math.atan2( zd, xd ),
                        angleLeft = angle - Math.PI / 2,
                        angleRight = angle + Math.PI / 2;
                    var x0 = xLast + xd * ( 1 / ( remaining + 1 )),
                        z0 = zLast + zd * ( 1 / ( remaining + 1 )),
                        y0 = fp.getHeight( x0, z0 ) + yOffset;
                    var x = x0, y = y0, z = z0, k;
                    for ( var j = 1; j <= fp.appConfig.roadOptions.roadDeviation; j++ ) {
                        var xL = x0 + Math.cos( angleLeft ) * j,
                            zL = z0 + Math.sin( angleLeft ) * j,
                            yL = fp.getHeight( xL, zL ) + yOffset;
                        if ( yL < y && yL > 0 ) {
                            x = xL;
                            y = yL;
                            z = zL;
                        }
                    }
                    for ( k = 1; k <= fp.appConfig.roadOptions.roadDeviation; k++ ) {
                        var xR = x0 + Math.cos( angleRight ) * k,
                            zR = z0 + Math.sin( angleRight ) * k,
                            yR = fp.getHeight( xR, zR ) + yOffset;
                        if ( yR < y && yR > 0 ) {
                            x = xR;
                            y = yR;
                            z = zR;
                        }
                    }
                    // Only create a point if there's a deviation from a straight line
                    if ( x != x0 || y != y0 || z != z0 ) {
                        x = Math.round( x );
                        y = Math.round( y );
                        z = Math.round( z );
                        var point = new THREE.Vector3( x, y, z );
                        points.push( point );
                        if ( y != yLast ) {
                            var yDiff = y - yLast;
                            var shift = i - lastChange + 1;
                            for ( k = lastChange + 1; k < i; k++ ) {
                                var change = yDiff * ( (k - lastChange ) / shift );
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
                points.push( p2 );
                return points;
            };

            /**
             * Creates a JSTS geometry from the points of the road.
             * @param  {fp~Road} road
             * @return {jsts.geom.Polygon}
             */
            this.createJstsGeomFromRoadPoints = function( points ) {
                var coords = _.map( points, function( p ) { return new jsts.geom.Coordinate( p.x, p.y ); } );
                var lineUnion, j = coords.length - 1;
                for ( var i = 0; i < coords.length; i++ ) {
                    var line = new jsts.geom.LineString( [ coords[ i ], coords[ j ]] );
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
             * Adds a road between two points, with a given width.
             * @param {THREE.Vector3} p1
             * @param {THREE.Vector3} p2
             * @param {Number} roadWidth
             */
            this.addRoad = function( p1, p2, roadWidth ) {
                var points = this.getRoadTerrainPoints( p1, p2 );

                // Use a cut-off of 5 intersecting points to prevent this road being built
                var jstsCoords = _.map( points, function( p ) { return new jsts.geom.Coordinate( p.x, p.z ); } );
                var jstsGeom = new jsts.geom.LineString( jstsCoords );
                var overlap = fp.roadNetwork.countCollisions( jstsGeom );
                if ( overlap > fp.appConfig.roadOptions.overlapThreshold )
                    return false;

                // The above code probably should supercede this
                var thisIndexValues = _.map( points, function( p ) { return fp.getIndex( p.x,p.z ); } );
                overlap = _.intersection( fp.roadNetwork.indexValues, thisIndexValues ).length;
                if ( overlap > fp.appConfig.roadOptions.overlapThreshold )
                    return false;

                var extrudePath = new THREE.CatmullRomCurve3( points );
                var roadColor = ( fp.appConfig.displayOptions.dayShow ) ? fp.appConfig.colorOptions.colorDayRoad : fp.appConfig.colorOptions.colorNightRoad;
                // var roadMaterial = new THREE.MeshBasicMaterial( { color: roadColor } );
                var roadMaterial = new THREE.MeshLambertMaterial( { color: roadColor } );
                roadMaterial.side = THREE.DoubleSide;
                var roadGeom = new THREE.TubeGeometry( extrudePath, points.length, roadWidth, fp.appConfig.roadOptions.roadRadiusSegments, false );

                var adjust = fp.appConfig.roadOptions.flattenAdjustment,
                    lift = fp.appConfig.roadOptions.flattenLift;
                var vertices = roadGeom.vertices;
                for ( var i = 0; i <= vertices.length - fp.appConfig.roadOptions.roadRadiusSegments; i += fp.appConfig.roadOptions.roadRadiusSegments ) {
                    var coil = vertices.slice( i, i + fp.appConfig.roadOptions.roadRadiusSegments );
                    var mean = jStat.mean( _.map( coil, function( p ) { return p.y; } ) );
                    for ( var j = 0; j < coil.length; j++ ) {
                        var y = coil[ j ].y;
                        var diff = y - mean;
                        var newDiff = diff * adjust;
                        vertices[ i+j ].y = lift + mean + newDiff;
                    }
                }

                // Cache the ordinary plane vertices
                fp.roadNetwork.planeVertices.push( vertices );

                // Transform vertices
                var percent = fp.terrain.wrappedPercent;
                if ( percent > 0 ) {
                    var transformedVertices = [];
                    for ( var k = 0; k < vertices.length; k++ ) {
                        transformedVertices.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ k ], percent ) );
                    }
                    roadGeom.vertices = transformedVertices;
                }

                // Add the road
                var roadMesh = new THREE.Mesh( roadGeom, roadMaterial );
                fp.roadNetwork.networkMesh.add( roadMesh );
                thisIndexValues.forEach( function( p ) { fp.roadNetwork.roads[ p ] = roadMesh; } );
                if ( _.isNull( this.networkGeometry ) )
                    this.networkGeometry = new jsts.geom.LineString( jstsCoords );
                else {
                    try {
                        this.networkGeometry = this.networkGeometry.union( jstsGeom );
                    }
                    catch ( e ) { console.log( e ); } // Sometimes get a TopologyError
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

            /**
             * Implementation of Surveyor's Formula - cf. http://www.mathopenref.com/coordpolygonarea2.html
             * @param  {jsts.geom.Polygon} polygon
             * @return {number}
             */
            this.getPolygonArea = function( polygon ) {
                var points = polygon.shell.points;
                var area = 0;           // Accumulates area in the loop
                var j = points.length - 1;  // The last vertex is the 'previous' one to the first
                for ( var i = 0; i < points.length; i++ ) {
                    area = area + ( points[ j ].x + points[ i ].x ) * ( points[ j ].y - points[ i ].y );
                    j = i;  //j is previous vertex to i
                }
                return area / 2;
            };
        };


        return FiercePlanet;

    }
)
