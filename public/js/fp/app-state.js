

define( [
        'fp/fp-base'
    ],

    function( FiercePlanet ) {


        /**
         * Represents relevant state about the application.
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.AppState = {
            runSimulation: false,
            stepSimulation: false
        };

        return FiercePlanet;

    }
)
