

define( [
        'fp/fp-base',
        'fp/app-config'
    ],

    function( FiercePlanet ) {


        /**
         * Singleton Chart object.
         * @type {FiercePlanet}
         */
        FiercePlanet.Chart = function( fp ) {

            this.chart = null;
            this.intervalID = null;


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

                if ( this.chart !== null ) {

                    this.chart.stop();

                }

                this.chart = new SmoothieChart( {

                    maxValue: agentInitialCount,
                    minValue: 0.0

                } );


                var chartCanvas = $( '#chartCanvas-' + fp.container.id )[0];
                if ( chartCanvas === undefined ) {

                    chartCanvas = document.createElement( "canvas" );
                    fp.container.insertBefore( chartCanvas, fp.container.firstChild );

                }

                chartCanvas.setAttribute( "id", "chartCanvas-" + fp.container.id );
                chartCanvas.setAttribute( "width", "400px" );
                chartCanvas.setAttribute( "height", "100px" );
                chartCanvas.setAttribute( "style", "z-index: 1; position: absolute; left: 0px; bottom: 0px  " );

                for ( var i = 0; i < seriesSetFuncs.length; i++ ) {

                    this.chart.addTimeSeries( new TimeSeries() );

                }

                if ( this.intervalID !== null ) {

                    clearInterval( this.intervalID );

                }

                this.intervalID = setInterval( function() {

                    if ( fp.appState.runSimulation ) {

                        for ( var i = 0; i < seriesSetFuncs.length; i++ ) {

                            var seriesFunc = seriesSetFuncs[ i ];
                            var value = seriesFunc();
                            var timeSeries = fp.chart.chart.seriesSet[ i ].timeSeries;
                            timeSeries.append( new Date().getTime(), value );

                        }

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

                for ( var i = 0; i < this.chart.seriesSet.length; i++ ) {

                    var series = this.chart.seriesSet[ i ];
                    if ( this.chart.options.maxValue <= series.timeSeries.maxValue ) {

                        this.chart.options.maxValue *= 2;

                    }

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
                        fillStyle: generateRGBA( color, 0.2 ),
                        lineWidth: 2

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
