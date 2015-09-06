require.config({

    paths: {

        astar: "utils/astar"

    }

});

define( [
        'fp/fp-base',
        'astar',
        'fp/app-config'

    ],

    function( FiercePlanet, astar ) {


        /**
         * Represents a network of paths. Also provides factory and utility methods.
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.PathNetwork = function( fp ) {

            var gridExtent = FiercePlanet.appConfig.terrainOptions.gridExtent;
            var gridPoints = FiercePlanet.appConfig.terrainOptions.gridPoints;
            this.stepsPerNode = gridExtent / gridPoints;

            this.networkMesh = null;
            this.graphAStar = null;
            this.nodes = [ ];
            this.opts = null;

            this.setupAStarGraph = function() {

                this.opts = {
                    // wallFrequency: $selectWallFrequency.val(),
                    // fp.terrain.gridSize: $selectGridSize.val(),
                    // debug: $checkDebug.is( "checked" ),
                    diagonal: true,
                    closest: true
                };

                var gridPoints = fp.terrain.gridPoints;

                for ( var i = 0; i < gridPoints; i++ ) {

                    var nodeRow = [];

                    for ( var j = 0; j < gridPoints; j++ ) {

                        var weight = 1 - fp.terrain.getHeightForIndex( i * gridPoints + j ) / fp.terrain.maxTerrainHeight;
                        weight = ( weight === 1 ? 0 : weight );
                        nodeRow.push( weight );

                    }

                    this.nodes.push( nodeRow );

                }

                this.graphAStar = new astar.Graph( this.nodes );
                this.graphAStar.diagonal = true;

            };

            this.nodeAt = function( position ) {

                var index = fp.getIndex( position.x, position.z );
                var x = index % fp.terrain.gridPoints, y = Math.floor( index / fp.terrain.gridPoints );

                try {

                    return this.graphAStar.grid[ x ][ y ];

                }
                catch ( err ) {

                    return undefined;

                }

            };


            /**
             * Find path to the home of another agent in this network
             * @param  {fp.Agent} agent [ description ]
             * @return {Array}       Of nodes
             */
            this.findPathHome = function( agent ) {

                if ( !agent.home )
                    return [ ];
                var start = this.nodeAt( agent.position );
                var end = this.nodeAt( agent.home.lod.position );
                if ( _.isUndefined( start ) || _.isUndefined( end ) )
                    return [ ];
                var path = astar.astar.search( this.graphAStar, start, end, { closest: this.opts.closest } );
                return path;
            };


            /**
             * Find path to an agent's home
             * @param  {fp.Agent} agent [ description ]
             * @return {Array}       Of nodes
             */
            this.findPathToOtherAgentsHome = function( agent ) {

                var otherAgentHome = null;
                var networks = _.shuffle( fp.agentNetwork.networks );

                for ( var i = 0; i < networks.length; i++ ) {

                    var network = fp.agentNetwork.networks[ i ];
                    var links = _.shuffle( network.links );

                    for ( var j = 0; j < links.length; j++ ) {

                        var link = links[ j ];
                        if ( link.agent1 == agent )
                            otherAgentHome = link.agent2.home;
                        else if ( link.agent2 ==  agent )
                            otherAgentHome = link.agent1.home;

                    }

                }

                if ( !otherAgentHome )
                    return [ ];

                var start = this.nodeAt( agent.position );
                var end = this.nodeAt( otherAgentHome.lod.position );

                if ( _.isUndefined( start ) || _.isUndefined( end ) )
                    return [ ];

                var path = astar.astar.search( this.graphAStar, start, end, { closest: this.opts.closest } );
                return path;

            };


            /**
             * Draws a path between this agent and its home
             * @param  {Agent} agent
             * @return {Array}       of nodes describing the path
             */
            this.drawPathHome = function( agent ) {
                var path = agent.pathComputed;
                if ( _.isUndefined( path ) || path.length < 2 ) // Need 2 points for a line
                    return undefined;
                var pathGeom = new THREE.Geometry();
                var multiplier = fp.terrain.ratioExtentToPoint;
                var wrapPercent = fp.terrain.wrappedPercent;
                path.forEach( function( point ) {
                    var x = ( point.x * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier,
                        z = ( point.y * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier,
                        y = fp.getHeight( x, z ) + fp.appConfig.agentOptions.terrainOffset,
                        point3d = new THREE.Vector3( x, y, z );

                    /*
                    // Transform vertices
                    var percent = fp.terrain.wrappedPercent;
                    if ( percent > 0 ) {
                        var transformedVertices = [ ];
                        for ( var i = 0; i < vertices.length; i++ ) {
                            transformedVertices.push( fp.terrain.transformPointFromPlaneToSphere( vertices[ i ], percent ) );
                        }
                        roadGeom.vertices = transformedVertices;
                    }
                    */

                    var transformedPoint3d = fp.terrain.transformPointFromPlaneToSphere( point3d, wrapPercent );
                    pathGeom.vertices.push( transformedPoint3d );
                } );

                var pathColor = ( fp.appConfig.displayOptions.dayShow ) ? fp.appConfig.colorOptions.colorDayPath : fp.appConfig.colorOptions.colorNightPath;
                var pathMaterial = new THREE.LineBasicMaterial( { color: pathColor, linewidth: 1.0 } );
                var pathLine = new THREE.Line( pathGeom, pathMaterial );
                this.networkMesh.add( pathLine );
                return pathLine;

            };


            /**
             * Update the visualisation of all agent paths.
             */
            this.updatePath = function() {

                if ( !FiercePlanet.appState.runSimulation )
                    return;

                var children = fp.pathNetwork.networkMesh.children;

                for ( var i = children.length - 1; i >= 0; i-- ) {

                    fp.pathNetwork.networkMesh.remove( children[ i ] );

                }
                var agentsWithPaths = _.chain( fp.agentNetwork.agents ).
                    map( function( agent ) { if ( !_.isUndefined( agent.pathComputed ) && agent.pathComputed.length > 1 ) return agent; } ).
                        compact().
                        value();

                _.each( agentsWithPaths, function( agent ) {

                    fp.pathNetwork.drawPathHome( agent );

                } );

            };

        };

        return FiercePlanet;

    }
)
