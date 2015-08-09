

define( [
        'fp/fp-base'
    ],

    function( FiercePlanet ) {

        /**
         * Represents a square block of the fp.terrain. It has a value that can be used to represent some property of interest.
         * Using the default assumptions of the PatchNetwork functions, the value should be in the range [ 0, 1 ].
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.Patch = function( val ) {
            this.value = val;
            this.initialValue = val;

            /**
             * Updates the value of the patch.
             * @param  {Number} amount the amount to increment the value by.
             */
            this.updatePatchValue = function( amount ) {
                var val = this.value;
                if ( val + amount < 0.0001 )
                    val = 0.0001;
                else if ( val + amount > 1.0 )
                    val = 1.0;
                else
                    val += amount;
                this.value = val;
            };
        };



        return FiercePlanet;

    }
)
