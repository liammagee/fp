

define( [
        'fp/fp-base',
        'fp/config'
    ],

    function( FiercePlanet ) {


        /**
         * Singleton Chart object.
         * @type {FiercePlanet}
         */
        FiercePlanet.Chart = function( fp ) {

            this.chart = null;
            this.series = [];


            /**
             * Constructs the chart, using SmoothieChart.
             *
             * The default series are:
             *  - the total of the agent population (blue)
             *  - the average health of the population (red)
             *  - the average value of the patches (green)
             */
            this.setupChart = function ( seriesSetFuncs ) {

                var agentInitialCount = fp.appConfig.agentOptions.initialPopulation * 2;

                this.chart = new SmoothieChart( {

                    maxValue: agentInitialCount,
                    minValue: 0.0

                } );


                if ( $( '#chartDiv' ).length === 0 ) {

                    var chartDiv = 'chartCanvas';
                    var chartCanvas = document.createElement( "canvas" );
                    chartCanvas.setAttribute( "id", chartDiv );
                    chartCanvas.setAttribute( "width", "400" );
                    chartCanvas.setAttribute( "height", "100" );
                    chartCanvas.setAttribute( "style", "z-index: 1; position: absolute; left: 0px; bottom: 0px  " );
                    fp.container.insertBefore( chartCanvas, fp.container.firstChild );

                }

                for ( var i = 0; i < seriesSetFuncs.length; i++ ) {

                    this.chart.addTimeSeries( new TimeSeries() );

                }

                setInterval( function() {

                    if ( FiercePlanet.AppState.runSimulation ) {

                        for ( var i = 0; i < seriesSetFuncs.length; i++ ) {

                            var seriesFunc = seriesSetFuncs[ i ];
                            var value = seriesFunc();
                            var timeSeries = fp.chart.chart.seriesSet[ i ].timeSeries;
                            timeSeries.append( new Date().getTime(), value );

                        }

                        /*
                        agentPopulationSeries.append( new Date().getTime(),
                            function() {

                                return fp.agentNetwork.agents.length

                            }
                        );
                        agentHealthSeries.append( new Date().getTime(),
                            agentInitialCount / 2 * jStat( _.map( fp.agentNetwork.agents, function( agent ) { return agent.health; } ) ).mean() / 100
                        );
                        patchValuesSeries.append( new Date().getTime(),
                            agentInitialCount / 2 * fp.patchNetwork.patchMeanValue
                        );
                        */

                    }

                }, 500 );

                this.updateGraphColors();

                this.chart.streamTo( chartCanvas, 500 );
                this.toggleVisibility();

            };


            /**
             * Updates the visibility of the graph.
             */
            this.toggleVisibility = function() {

                $( "#chartCanvas-" + fp.container.id ).toggle( fp.appConfig.displayOptions.chartShow );

            };


            /**
             * Adjusts the graph size if needed.
             */
            this.adjustGraphSize = function() {

                if ( this.chart.seriesSet.length == 3 &&
                    this.chart.options.maxValue <= fp.agentNetwork.agents.length ) {

                    // this.chart.options.maxValue *= 2;

                }

            };


            /**
             * Update the colors of the graph.
             */
            this.updateGraphColors = function() {

                var generateRGBA = function( colorValue, alpha ) {

                    var b = colorValue % 256;
                    colorValue = colorValue - b;
                    var g = ( colorValue / 256 ) % 256;
                    colorValue = colorValue - ( g * 256 );
                    var r = colorValue / ( 256 * 256 );

                    if ( alpha === undefined ) {

                        alpha = 1.0;

                    }

                    var rgba = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ' )';

                    return rgba;

                };

                var addChartOption = function( seriesNumber, color ) {

                    _.extend( fp.chart.chart.seriesSet[ seriesNumber ].options, {

                        strokeStyle: generateRGBA( color, 1.0 ),
                        fillStyle: generateRGBA( color, 0.4 ),
                        lineWidth: 4

                    } );

                };

                // Set up the colors
                var seriesSet = fp.chart.chart.seriesSet;

                if ( seriesSet.length > 0 ) {

                    addChartOption( 0, fp.appConfig.colorOptions.colorGraphPopulation );

                }

                if ( seriesSet.length > 1 ) {

                    addChartOption( 1, fp.appConfig.colorOptions.colorGraphHealth );

                }

                if ( seriesSet.length > 2 ) {

                    addChartOption( 2, fp.appConfig.colorOptions.colorGraphPatchValues );

                }

            };

        };

        return FiercePlanet;

    }
)
