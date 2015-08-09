

define( [
        'fp/fp-base'
    ],

    function( FiercePlanet ) {


        /**
         * Represents a mobile and alive agent
         * @constructor
         * @memberof fp
         * @inner
         */
        FiercePlanet.Agent = function() {

            /**
             * @memberof Agent
             */
            this.updateTick = function() {
                this.ticks++;
                this.age++;
            };

            /**
             * @memberof Agent
             */
            this.setDirection = function( dir ) {
                this.direction = dir;
            };

            /**
             * @memberof Agent
             */
            this.setPosition = function( v ) {
                this.lastPosition = this.position = v;
            };

            /**
             * @memberof Agent
             */
            this.findBuilding = function() {
                var xl = this.lastPosition.x, zl = this.lastPosition.z;
                return fp.buildingNetwork.buildingHash[ fp.getIndex( xl, zl ) ];
            };

            /**
             * @memberof Agent
             */
            this.goingUp = function( building ) {
                return ( building == this.home ) ?
                    ( Math.random() < fp.appConfig.agentOptions.visitHomeBuilding ) :
                     ( Math.random() < fp.appConfig.agentOptions.visitOtherBuilding );
            };
            /**
             * @memberof Agent
             */
            this.updateGroundedState = function( building ) {
                var xl = this.lastPosition.x, yl = this.lastPosition.y, zl = this.lastPosition.z,
                    xd = this.direction.x, yd = this.direction.y, zd = this.direction.z;

                if ( !this.grounded ) {
                    var base = fp.getHeight( xl, zl ) + fp.appConfig.agentOptions.terrainOffset;
                    if ( yl <= base && yd < 0 )
                        this.grounded = true;
                }
                else if ( !_.isUndefined( building ) && this.goingUp( building ) ) { // grounded == true
                    this.grounded = false;
                }
            };

            /**
             * Determines the next step for a computed direction.
             * @memberof Agent
             */
            this.nextComputedDirection = function() {

                if ( !this.pathComputed )
                    return undefined;

                if ( this.pathPosition + 1 >= this.pathComputed.length ) {

                    this.pathPosition = 0;
                    this.pathComputed = undefined;
                    return this.randomDirection();

                }

                // If we have prearranged a path, ensure the current direction points towards that
                var multiplier = fp.terrain.ratioExtentToPoint;
                var nextNode = this.pathComputed[ this.pathPosition + 1 ],
                    x = ( nextNode.x * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier,
                    z = ( nextNode.y * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier;

                // Time to move position?
                var unsignedX = Math.sign( this.direction.x );
                var unsignedZ = Math.sign( this.direction.z );

                if ( ( this.position.x + this.direction.x - x ) * unsignedX > 0  ||
                     ( this.position.z + this.direction.z - z ) * unsignedZ > 0 ) {

                    this.pathPosition++;

                    if ( this.pathPosition + 1 < this.pathComputed.length ) {

                        nextNode = this.pathComputed[ this.pathPosition + 1 ];
                        x = ( nextNode.x * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier;
                        z = ( nextNode.y * multiplier - fp.terrain.halfExtent ) * fp.appConfig.terrainOptions.multiplier;

                    }

                }
                var xd = x - this.position.x,
                    zd = z - this.position.z,
                    xDir = xd / ( Math.abs( xd ) + Math.abs( zd ) ),
                    zDir = zd / ( Math.abs( xd ) + Math.abs( zd ) ),
                    dir = new THREE.Vector3( xDir, 0, zDir );

                return dir;

            };


            /**
             * Generates candicate directions from an existing direction.
             * @memberof Agent
             */
            this.candidateDirections = function() {
                // Check if we are in a building, and offer possibility of going up
                var xl = this.lastPosition.x,
                    yl = this.lastPosition.y,
                    zl = this.lastPosition.z,
                    xd = this.direction.x,
                    yd = this.direction.y,
                    zd = this.direction.z,
                    isAlreadyOnRoad = fp.roadNetwork.indexValues.indexOf( fp.getIndex( xl, zl ) ) > -1;

                var directionCount = 10,
                    directions = new Array( directionCount );

                // Work out if we have a precomputed path
                var dir = this.nextComputedDirection();
                if ( !_.isUndefined( dir ) )
                    return [ [ dir, 1.0 ] ];

                // Update whether we are in  a building, and should be going up or do wn
                var building = this.findBuilding();
                this.updateGroundedState( building );

                // Weight variables
                var weight = 1.0, weightForRoadIsSet = false;

                // Pre-calculate speed and current angle
                var newSpeed = Math.random() * this.speed / 2,
                    angle = Math.atan2( zd, xd ),
                    hyp = Math.sqrt( xd * xd + zd * zd ),
                    divisor = ( directionCount - 2 ) / 2;

                for ( var i = 0; i < directionCount; i++ ) {
                    if ( ( i < 8 && ! this.grounded ) || ( i >= 8 && this.grounded ) )
                        continue; // Move horizontally if grounded, vertically if not

                    if ( i < 8 && this.grounded ) { // Horizonal directions
                        var newAngle = angle + ( i * Math.PI / divisor );
                        xd = Math.cos( newAngle ) * hyp;
                        yd = 0;
                        zd = Math.sin( newAngle ) * hyp;
                    }
                    else if ( !this.grounded && i >= 8 ) { // Vertical directions
                        xd = 0;
                        yd = ( i == 8 ) ? newSpeed : -newSpeed;
                        zd = 0;
                    }

                    // Calculate new position
                    var xn = xl + xd, yn = yl + yd, zn = zl + zd,
                        isRoad = ( fp.roadNetwork.indexValues.indexOf( fp.getIndex( xn, zn )) > -1 );

                    // If we've had a horizontal shift, for now neutralise the vertical to the fp.terrain height
                    if ( yd === 0 ) {
                        yn = fp.getHeight( xn, zn );
                        // Smooth the transition between heights
                        yd = ( ( fp.appConfig.agentOptions.terrainOffset + yn ) - yl ) / fp.terrain.ratioExtentToPoint;
                    }
                    if ( yn === null )
                        continue; // Off the grid - don't return this option

                    // Work out weights

                    if ( i === 0 ) { // Current direction most preferred
                        weight = 0.999;
                        if ( isRoad )
                            weightForRoadIsSet = true;
                    }
                    else {
                        if ( !weightForRoadIsSet && isRoad ) {
                            if ( !isAlreadyOnRoad )
                                weight = 0.999;
                            else
                                weight = 0.5;
                            weightForRoadIsSet = true;
                        }
                        else
                            weight = 0.001;
                    }

                    // If moving upward, decrease the preference
                    if ( yn > yl && this.grounded && fp.appConfig.agentOptions.noUphill )
                        weight *= yl / yn;

                    // If currect direction is moving to water, set the preference low
                    if ( i === 0 && yn <= 0 && fp.appConfig.agentOptions.noWater )
                        weight = 0.0;

                    // If inside a building, adjust weights
                    if ( !this.grounded && !_.isUndefined( building ) ) {
                        var buildingHeight = building.levels * fp.appConfig.buildingOptions.levelHeight + building.lod.position.y;
                        if ( i == 8 ) {
                            if ( yl >= buildingHeight || this.direction.y < 0 )
                                weight = 0.0;
                            else
                                weight = 1.0;
                        }
                        else if ( i == 9 ) {
                            if ( yl >= buildingHeight || this.direction.y < 0 )
                                weight = 1.0;
                            else if ( this.direction.y > 0 && Math.random() > 0.99 )
                                weight = 1.0;
                            else
                                weight = 0.0;
                        }
                    }

                    // Set the direction
                    directions[ i ] = [ new THREE.Vector3( xd, yd, zd ), weight ];
                }

                // Compact directions and sort by weight descending
                directions = _.chain( directions ).compact().sort( function( a,b ) { return ( a[ 1 ] > b[ 1 ] ) ? 1 : ( a[ 1 ] < b [ 1 ]? -1 : 0 ); } ).value();

                // If no directions are found, reverse current direction
                if ( directions.length === 0 ) {
                    var x = -this.direction.x;
                    var z = -this.direction.z;
                    var direction = new THREE.Vector3( x, fp.getHeight( x, z ), z );
                    directions.push( [ direction, 1.0 ] );
                }

                return directions;
            };

            /**
             * Generates directions and weights, given an agent's existing direction.
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
                var angle = Math.atan2( zd, xd ),
                    hyp = Math.sqrt( xd * xd + zd * zd ),
                    divisor = directionCount / 2;

                for ( var i = 0; i < directionCount; i++ ) {
                    // Slight rounding errors using above calculation
                    var newAngle = angle + ( i * Math.PI / divisor );
                    // directionAtSpeed = directionAtSpeed.multiplyScalar( patchSize );
                    xd = Math.cos( newAngle ) * hyp;
                    yd = 0;
                    zd = Math.sin( newAngle ) * hyp;

                    // Calculate new position
                    var xn = xl + xd, yn = yl + yd, zn = zl + zd,
                        isRoad = ( fp.roadNetwork.indexValues.indexOf( fp.getIndex( xn, zn )) > -1 );

                    // Work out weights - should be
                    switch( i ) {
                        case 0:
                            weight = Math.pow( seed, 1 );
                            break;
                        case 1:
                        case 7:
                            weight = Math.pow( seed, 3 );
                            break;
                        case 2:
                        case 4:
                        case 6:
                            weight = Math.pow( seed, 4 );
                            break;
                        case 3:
                        case 5:
                            weight = Math.pow( seed, 5 );
                            break;
                    }

                    yn = fp.getHeight( xn, zn );

                    // If the new y position is zero, set the weight to zero
                    if ( yn === null )
                        continue;

                    // If the new y position is zero, set the weight to zero
                    if ( yn <= fp.appConfig.terrainOptions.defaultHeight )
                        weight = 0;

                    // Set to the height of the terrain
                    yn += fp.appConfig.terrainOptions.defaultHeight;
                    // Offset relative to the terrain
                    yn += fp.appConfig.agentOptions.terrainOffset;
                    // Add half the agent's own size
                    yn += fp.appConfig.agentOptions.size / 2;

                    // Smooth the transition between heights
                    yd = ( yn - yl ) / fp.terrain.ratioExtentToPoint;

                    // Set the direction
                    directions[ i ] = [ new THREE.Vector3( xd, yd, zd ), weight ];
                }
                directions = _.chain( directions ).
                                compact().
                                shuffle().
                                sort( function( a, b ) { return ( a[ 1 ] > b[ 1 ] ) ? 1 : ( a[ 1 ] < b [ 1 ]? -1 : 0 ); } ).
                                value();

                return directions;
            };

            /**
             * @memberof Agent
             */
            this.bestCandidate = function() {
                var directions = this.generateDirectionVectorsAndWeights( 0.1 );

                // A direction is pulled from a weighted list of possibilities
                var total = _.chain( directions ).
                    map( function( d ) { return d[ 1 ]; } ).
                    reduce( function( memo, num ) { return memo + num; }, 0 ).
                    value();
                var weightsNormed = _.chain( directions ).
                    map( function( d ) { return d[ 1 ] / total; } ).
                    sort().
                    reverse().
                    value();
                var r = Math.random();
                var index = 0, runningTotal = 0, len = directions.length - 1;
                // Note the interval array is initialisaed with an addition zero
                for ( var i = 0; i < weightsNormed.length; i++ ) {
                    var a = weightsNormed[ i ];
                    runningTotal += a;
                    if ( r < runningTotal && i < directions.length ) {
                        return directions[ len - i ][ 0 ];
                    }
                }
                return this.randomDirection();
            };

            /**
             * @memberof Agent
             */
            this.move = function() {
                var directionAtSpeed = this.direction.clone().multiplyScalar( 16 / fp.timescale.framesToYear );
                // Multiply relative to patch size
                var factor = fp.appConfig.terrainOptions.multiplier;
                if ( fp.appConfig.agentOptions.movementRelativeToPatch ) {
                    factor *= fp.appConfig.terrainOptions.patchSize *
                                ( fp.appConfig.agentOptions.movementInPatch / 100 );
                }
                directionAtSpeed.x *= factor;
                directionAtSpeed.z *= factor;
                var newPosition = this.position.clone().add( directionAtSpeed );
                var bound = fp.appConfig.terrainOptions.multiplier * fp.terrain.gridExtent / 2;
                // Simple check to ensure we're within terrain bounds
                if ( newPosition.x < -bound || newPosition.x >= bound || newPosition.z < -bound || newPosition.z >= bound ) {
                    this.setDirection( this.randomDirection() );
                }
                else {
                    this.position = newPosition;
                }
            };

            /**
             * @memberof Agent
             */
            this.evaluateDirection = function() {
                this.lastPosition = this.position;
                this.setDirection( this.bestCandidate() );
            };

            /**
             * Returns array of compass directions
             */
            this.compassDirections = function() {
                var direction = 0, directions = [ ];
                for ( var i = 0; i < 8; i++ ) {
                    var x = Math.cos( direction ) / 2;
                    var z = Math.sin( direction ) / 2;
                    directions.push( [ x, z ] );
                    direction += Math.PI / 4;
                }
                return directions;
            };

            /**
             * Genenerates a random vector.
             * @memberof Agent
             */
            this.randomDirection = function() {
                if ( fp.appConfig.agentOptions.movementStrictlyIntercardinal ) {
                    return new THREE.Vector3( this.speed * ( Math.random() - 0.5 ), 0, this.speed * ( Math.random() - 0.5 ) );
                }
                else {
                    var directions = this.compassDirections();
                    var index = Math.floor( Math.random() * 8 );
                    var pos = directions[ index ];
                    var vec = new THREE.Vector3( this.speed * pos[ 0 ], 0, this.speed * pos[ 1 ] );
                    return vec;
                }
            };

            /**
             * @memberof Agent
             */
            this.nearestNeighbour = function( ignoreHeight ) {
                var agents = fp.agentNetwork.agents;
                var x = this.position.x, y = this.position.y, z = this.position.z;
                var nearest = null, leastLen = 0;
                for ( var i = 0; i < agents.length; i++ ) {
                    var agent = agents[ i ];
                    if ( agent == this )
                        continue;
                    var ox = agent.position.x, oy = agent.position.y, oz = agent.position.z;
                    var len = Math.sqrt( Math.pow( ox - x, 2 ) + Math.pow( oz - z, 2 ) );
                    if ( ! ignoreHeight ) {
                        len = Math.sqrt( Math.pow( len, 2 ) + Math.pow( oy - y, 2 ) );
                    }
                    if ( leastLen === 0 || len < leastLen ) {
                        nearest = agent;
                        leastLen = len;
                    }
                }
                return nearest;
            };

            /**
             * @memberof Agent
             */
            this.setRandomDirection = function() {
                this.setDirection( this.randomDirection() );
            };

            /**
             * Slightly changes to the direction of the agent.
             */
            this.perturbDirection = function() {
                this.direction.x += this.perturbBy * ( Math.random() - 0.5 );
                this.direction.z += this.perturbBy * ( Math.random() - 0.5 );
            };

            /**
             * Calculate likelihood of building a home
             */
            this.calculateLikelihoodOfHome = function( index ) {
                // Simple test of local roads, water, buildings and building height
                var proximityTests = fp.buildingNetwork.proximityFunctions();
                for ( var i = proximityTests.length - 1; i >= 0; i-- ) {
                    var proximityTest = proximityTests[ i ];
                    var func = _.first( proximityTest );
                    var values = _.rest( proximityTest );
                    var response = func.apply( fp, _.union( [ index ], values ) );
                    if ( response )
                        return true;
                }
                return false;
            };

            /**
             * Builds a building on the agent's current position.
             * @return {Boolean} Whether the building construction was successful.
             */
            this.build = function() {
                if ( !fp.appConfig.buildingOptions.create )
                    return false;

                if ( this.home !== null )
                    return false;

                if ( this.position === null )
                    return false;

                var index = fp.getIndex( this.position.x, this.position.z );
                if ( _.isUndefined( index ) )
                    return false;

                // Don't build in an existing position
                if ( !_.isUndefined( fp.buildingNetwork.buildingHash[ index ] ) )
                    return false;

                var dimensions = fp.buildingNetwork.generateRandomDimensions();

                if ( fp.buildingNetwork.buildings.length === 0 ) { // If there are no buildings, build an initial "seed"
                    this.home = fp.buildingNetwork.createBuilding( this.position, dimensions );
                    return ( !_.isUndefined( this.home ) );
                }
                else if ( fp.buildingNetwork.networkMesh.children.length >= fp.appConfig.buildingOptions.maxNumber )
                    return false;

                if ( !_.isNull( fp.stats ) && fp.statss <= 10 )
                    return false;

                var shouldBuildHome = this.calculateLikelihoodOfHome( index );
                if ( shouldBuildHome ) {
                    this.home = fp.buildingNetwork.createBuilding( this.position, dimensions );
                    return ( !_.isUndefined( this.home ) );
                }

                return false;
            };

            /**
             * Builds a road on the agent's current position.
             * @return {Boolean} Whether the road construction was successful.
             */
            this.buildRoad = function() {
                if ( !fp.appConfig.roadOptions.create )
                    return false;

                var xOrig = this.position.x,
                    zOrig = this.position.z,
                    index = fp.getIndex( xOrig, zOrig ),
                    xInit = fp.appConfig.agentOptions.initialX,
                    zInit = fp.appConfig.agentOptions.initialY,
                    xd = ( xOrig - xInit ),
                    zd = ( zOrig - zInit ),
                    distanceFromInitialPoint = Math.sqrt( xd * xd + zd * zd ),
                    buildingIndex = _.map( fp.buildingNetwork.buildings, function( building ) { return fp.getIndex( building.lod.position.x, building.lod.position.z ); } );

                if ( fp.roadNetwork.networkMesh.children.length >= fp.appConfig.roadOptions.maxNumber )
                    return false;

                if ( !_.isNull( fp.stats ) && fp.statss <= 10 )
                    return false;

                if ( fp.appConfig.displayOptions.buildingsShow ) {
                    if ( fp.buildingNetwork.buildings.length === 0 ) {
                        return false;
                    }
                    else if ( fp.buildingNetwork.buildings.length == 1 ) {
                        if ( buildingIndex.indexOf( index ) == -1 )
                            return false;
                    }
                }
                if ( fp.roadNetwork.indexValues.length === 0 ) {
                    if ( distanceFromInitialPoint > fp.appConfig.roadOptions.initialRadius )
                        return false;
                }
                else {
                    if ( fp.roadNetwork.indexValues.indexOf( index ) == -1 )
                        return false;
                    if ( buildingIndex.indexOf( index ) == -1 ) {
                        var r = Math.random();
                        var chance = 1 / ( Math.log( distanceFromInitialPoint + 1 ) * fp.appConfig.roadOptions.probability );
                        if ( chance < r )
                            return false;
                    }
                }

                // Pick a random direction to create a road
                var xr = Math.random() * 2 - 0.5,
                    zr = Math.random() * 2 - 0.5,
                    lenMinimum = fp.appConfig.roadOptions.lenMinimum,
                    lenMaximum = fp.appConfig.roadOptions.lenMaximum,
                    lenFactor = Math.random();
                var existingRoad = fp.roadNetwork.roads[ index ];
                if ( existingRoad ) {
                    var ps = _.first( existingRoad.geometry.vertices ),
                        pe = _.last( existingRoad.geometry.vertices ),
                        xChange = ps.x - pe.x,
                        zChange = ps.z - pe.z,
                        angle = Math.atan2( zChange, xChange ),
                        turn = Math.round( Math.random() ),
                        angle90 = angle + Math.PI / 2 + Math.PI * turn;
                    xr = Math.cos( angle90 );
                    zr = Math.sin( angle90 );
                }
                var totalLen = lenMinimum +
                                ( lenMaximum - lenMinimum ) *
                                ( 1 - jStat.exponential.cdf( lenFactor, fp.appConfig.roadOptions.lenDistributionFactor ) ),
                    xExtent = xr * totalLen,
                    zExtent = zr * totalLen,
                    xEnd = this.position.x + xExtent,
                    zEnd = this.position.z + zExtent,
                    yEnd = fp.getHeight( xEnd, zEnd ),
                    endPoint = new THREE.Vector3( xEnd, yEnd, zEnd ),
                    xe = xOrig - xEnd,
                    ze = zOrig - zEnd,
                    distanceFromEnd = Math.sqrt( xe * xe + ze * ze ),
                    width = Math.ceil( ( ( ( 1 / Math.log( distanceFromInitialPoint + 10 ) ) ) * Math.log( distanceFromEnd ) ) * fp.appConfig.roadOptions.roadWidth );
                return fp.roadNetwork.addRoad( this.position, endPoint, width );
            };
            this.vertex = null;
            this.position = null;
            this.direction = null;
            this.speed = fp.appConfig.agentOptions.initialSpeed;
            this.perturbBy = fp.appConfig.agentOptions.initialPerturbBy;
            this.lastPosition = null;
            this.grounded = true;
            this.alpha =  0.5 + ( Math.random() / 2 );
            this.color = "#ff0000"; // Red. Alternative for this model is blue: "#0000ff"
            this.ticks = 0;
            this.age = 0;

            this.home = null;
            this.health = 100;
            this.gender = Math.random() < 0.5 ? "f": "m";
            this.children = [ ];
            this.friends = [ ];
            this.pathComputed = undefined;
            this.pathPosition = 0;
        };



        return FiercePlanet;

    }
)