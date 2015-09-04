

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
            this.isDirty = true;
            this.initialValue = val;
            this.minValue = 0.0001;

            /**
             * Updates the value of the patch.
             * @param  {Number} change the change to increment the value by.
             */
            this.updatePatchValue = function( change ) {

                var val = this.value;
                if ( val + change < this.minValue ) {

                    val = this.minValue;

                }
                else if ( val + change > 1.0 ) {

                    val = 1.0;

                }
                else {

                    val += change;

                }

                if ( val != this.value ) {

                    this.value = val;
                    this.isDirty = true;

                }
                else {

                    this.isDirty = false;

                }

            };

        };


        return FiercePlanet;

    }
)
