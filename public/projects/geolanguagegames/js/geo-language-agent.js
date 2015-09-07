

/**
 * Agent subclass that adds specific behaviour for the
 * geo-language-game models.
 */
var GeoLanguageAgent = function( fp ) {

    fp.FiercePlanet.Agent.call( this, fp );

    this.lexicon = 0.0;
    this.origState = null;
    this.spokenState = 0;
    this.age = 20 + Math.floor( Math.random() * 20 );
    this.sex = Math.floor( Math.random() * 2 );
    this.ticksSinceReproduction = 0;
    this.motherNode = null;
    this.wordList = _.range( 10 ).map( function () { return 0.0 } );


    /**
     * Overrides the Agent implementation.
     */
    this.generateDirectionVectorsAndWeights = function( seed ) {
        var xl = this.lastPosition.x,
                yl = this.lastPosition.y,
                zl = this.lastPosition.z,
                xd = this.direction.x,
                yd = this.direction.y,
                zd = this.direction.z,
                isAlreadyOnRoad = fp.roadNetwork.indexValues.indexOf( fp.getIndex( xl, zl ) ) > -1;

        // Logic for handling pre-determined paths
        if ( _.isUndefined( this.pathComputed ) || this.pathComputed.length < 2 ) {
            if ( Math.random() < fp.appConfig.agentOptions.chanceToFindPathToHome )  {
                this.pathComputed = fp.pathNetwork.findPathHome( this );
                this.pathPosition = 0;
            }
            else if ( Math.random() < fp.appConfig.agentOptions.chanceToFindPathToOtherAgentHome ) {
                this.pathComputed = fp.pathNetwork.findPathToOtherAgentsHome( this );
                this.pathPosition = 0;
            }
        }

        // Work out if we have a precomputed path
        var dir = this.nextComputedDirection();
        if ( !_.isUndefined( dir ) )
            return [ [ dir, 1.0 ] ];

        var directionCount = 8,
                directions = new Array( directionCount  );

        // Weight variables
        var weight = 1.0, weightForRoadIsSet = false;

        // Pre-calculate speed and current angle
        var patchSize = fp.appConfig.terrainOptions.patchSize *
                fp.appConfig.terrainOptions.multiplier *
                ( fp.appConfig.agentOptions.movementInPatch / 100 );
        var angle = Math.atan2( zd, xd ),
                hyp = Math.sqrt( xd * xd + zd * zd ),
                divisor = directionCount / 2;

        // First obtain heights from the surrounding points
        var newDirections = [];
        for ( var i = 0; i < directionCount; i++ ) {
            // Slight rounding errors using above calculation
            var newAngle = angle + ( i * Math.PI / divisor );
            xd = Math.cos( newAngle ) * hyp;
            yd = 0;
            zd = Math.sin( newAngle ) * hyp;

            // Calculate new position
            var xn = xl + xd, yn = yl + yd, zn = zl + zd;

            yn = fp.getHeight( xn, zn );
            yn += fp.appConfig.agentOptions.terrainOffset;
            yn += fp.appConfig.agentOptions.size / 2;

            yd = ( yn - yl ) / fp.terrain.ratioExtentToPoint;
            newDirections.push( new THREE.Vector3( xd, yd, zd ) );

            // Set the direction
            directions[ i ] = [ new THREE.Vector3( xd, yd, zd ), 0 ];
        }

        newDirections = _.chain( newDirections ).
                shuffle(). // To disorder duplicate values before sort
                sortBy( function( vec ) { return Math.abs( vec.y ); } ).
                reverse().
                value();

        for ( var i = 0; i < newDirections.length; i++ ) {
            var direction = newDirections[ i ];
            var weight = Math.pow( seed, 0.125 );
            // For proper randomness, set all weights tot he same value
            switch( i ) {
                case 0:
                    weight = 0.3;
                    break;
                case 1:
                    weight = 0.2;
                    break;
                case 2:
                    weight = 0.15;
                    break;
                case 3:
                    weight = 0.1;
                    break;
                case 4:
                    weight = 0.1;
                    break;
                case 5:
                    weight = 0.05;
                    break;
                case 6:
                    weight = 0.05;
                    break;
                case 7:
                    weight = 0.05;
                    0.1;
                    break;
            }

            directions[ i ] = [ direction, weight ];
        }

        directions = _.chain( directions ).
                compact().
                shuffle().
                sort( function( a, b ) { return ( a[ 1 ] > b[ 1 ] ) ? 1 : ( a[ 1 ] < b [ 1 ]? -1 : 0 ); } ).
                value();

        return directions;

    };


    this.die = function() {

        fp.scene.remove( fp.agentNetwork.particles );
        var index = fp.agentNetwork.agents.indexOf(this);
        fp.agentNetwork.agents.splice(index, 1);
        fp.agentNetwork.updateAgentParticleSystem();
        fp.scene.add( fp.agentNetwork.particles );

    };

};



