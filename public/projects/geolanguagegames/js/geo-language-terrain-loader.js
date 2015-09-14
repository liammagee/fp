
/**
 * Hack around using TerrainLoader, which assumes binary data type
 */
var loadCustomTerrain = function( terrainURL ) {

    var wholeFile;
    fp.scene.remove( fp.terrain.plane );
    fp.terrain = new fp.FiercePlanet.Terrain( fp );

    $.get(terrainURL, function( data ) {

        wholeFile = data;
        var lines = wholeFile.split( '\n' );
        var cols = lines[ 0 ].split( ' ' )[ 1 ];
        var rows = lines[ 1 ].split( ' ' )[ 1 ];
        var len = lines.length;
        var heights = lines.slice(6, lines.length - 1).join( ' ' ).split( ' ' );
        // Get data into a scale initTerrain expects
        heights = _.chain( heights).map( function( h ) { var v = parseFloat( h ); return isNaN( v ) ? null : v; } ).compact().value();

        var max = _.max( heights );
        var min = _.min( heights );
        // heights = _.map( heights, function( h ) { return 5 * h - min; } );
        // heights = _.map( heights, function( h ) { return 1000 * ( ( h - min ) / ( max - min ) ); } );
        // console.log(( ( max - min ) ))
        fp.appConfig.terrainOptions.loadHeights  = true;
        fp.terrain.initTerrain( heights );

        fp.animate(); // Kick off the animation loop

        // Update chart - keep population

        var chart = fp.chart;
        var series = chart.chart.seriesSet;

        for ( var i = series.length - 1; i >= 0 ; i-- ) {

            var timeSeries = series[ i ].timeSeries;
            chart.chart.removeTimeSeries( timeSeries );

        }

        var colorPop = "#ff0000", colorLexicon= "#0000ff";
        var popSeries = new TimeSeries( { strokeStyle: colorPop } );
        var lexiconSeries = new TimeSeries( { strokeStyle: colorLexicon } );
        var initPop = fp.appConfig.agentOptions.initialPopulation;

        var popSeriesFunc = function() {

            var popProportion = fp.agentNetwork.agents.length / ( initPop * 2 );
            return popProportion;

        }
        var lexiconSeriesFunc = function() {

            var lexiconMean = jStat.mean( _.map( fp.agentNetwork.agents, function( agent ) { return agent.lexicon; } ) );
            return lexiconMean;

        }

        chart.setupChart( [
            popSeriesFunc, lexiconSeriesFunc
        ] );


        // Force new min / max values
        chart.chart.options = _.extend( { minValue: 0.0, maxValue: 1.0 }, SmoothieChart.defaultChartOptions );
        chart.chart.updateValueRange();

        fp.appController.Setup();
        fp.appController.Run();

    } )

};
