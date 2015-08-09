

define( [
        'fp/fp-base',
        'fp/config'
    ],

    function( FiercePlanet ) {



        /**
         * Singleton Chart object.
         * @type {Object}
         */
        FiercePlanet.Chart = function( fp ) {

            this.chart = null;

            this.setupChart = function ( ) {

                var agentDiv = FiercePlanet.appConfig.agentOptions.initialPopulation * 2;
                this.chart = new SmoothieChart( { maxValue: agentDiv, minValue: 0.0  } );
                var agentPopulationSeries = new TimeSeries();
                var agentHealthSeries = new TimeSeries();
                var patchValuesSeries = new TimeSeries();
                setInterval( function() {
                    if ( FiercePlanet.AppState.runSimulation ) {
                        agentPopulationSeries.append( new Date().getTime(), fp.agentNetwork.agents.length );
                        agentHealthSeries.append( new Date().getTime(), agentDiv * jStat( _.map( fp.agentNetwork.agents, function( agent ) { return agent.health; } ) ).mean() / 100 );
                        patchValuesSeries.append( new Date().getTime(), agentDiv * fp.patchNetwork.patchMeanValue );
                    }
                }, 500 );
                var chartCanvas = document.createElement( "canvas" );
                chartCanvas.setAttribute( "id", "chartCanvas-" + fp.container.id );
                chartCanvas.setAttribute( "width", "400" );
                chartCanvas.setAttribute( "height", "100" );
                chartCanvas.setAttribute( "style", "z-index: 1; position: absolute; left: 0px; bottom: 0px  " );
                fp.container.insertBefore( chartCanvas, fp.container.firstChild );
                this.chart.addTimeSeries( agentPopulationSeries, { fillStyle: "rgba( 0, 0, 255, 0.2 )", lineWidth: 4 } );
                this.chart.addTimeSeries( agentHealthSeries, { fillStyle: "rgba( 255, 0, 0, 0.2 )", lineWidth: 4 } );
                this.chart.addTimeSeries( patchValuesSeries, { fillStyle: "rgba( 0, 255, 0, 0.2 )", lineWidth: 4 } );
                // fp.updateChartColors();
                this.chart.streamTo( chartCanvas, 500 );
                this.updateGraph();
            };

            this.updateGraph = function() {
                $( "#chartCanvas-" + fp.container.id ).toggle( FiercePlanet.appConfig.displayOptions.chartShow );
            };

        };


        return FiercePlanet;

    }
)
