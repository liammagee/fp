

define( [
        'fp/fp-base'
    ],

    function( FiercePlanet ) {


        /**
         * Represents relevant state about a given simulation.
         *
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.AppState = function( fp ) {

            return {

                animate: true,
                runSimulation: false,
                stepSimulation: false

            };

        };

        return FiercePlanet;

    }
)
