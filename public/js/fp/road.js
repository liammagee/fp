

define( [
        'fp/fp-base'
    ],

    function( FiercePlanet ) {


        /**
         * Represents a road or path between two points.
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.Road = function() {

            this.mesh = null;
            this.position = null;
            
            this.setupRoad = function( _x, _y, _z ) {
            
                this.x = _x || 0;
                this.y = _y || 0;
                this.z = _z || 0;
            
            };
            
            this.shadedShape = function ( points ) {};
            
            this.update = function() { };

        };


        return FiercePlanet;

    }
)
