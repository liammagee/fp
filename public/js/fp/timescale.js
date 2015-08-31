

define( [
        'fp/fp-base'
    ],

    function( FiercePlanet ) {


        /**
         * Represents the time scale used by the world.
         * @constructor
         * @memberof fp
         * @inner
         */
       FiercePlanet.Timescale = function() {     // Time variables

            this.initialYear = 1800;
            this.movesPerYear = 10;
            this.endYear = 2200;
            this.terminate = false;
            this.currentYear = this.initialYear;
            this.MAX_FRAMES_TO_TICK = 480;
            this.MIN_FRAMES_TO_TICK = 1;
            this.TOP_SPEED = 60 / this.MIN_FRAMES_TO_TICK;
            this.framesToTick = 4;
            this.ticksToYear = 10;
            this.frameCounter = 0;

        };

        return FiercePlanet;

    }

)
