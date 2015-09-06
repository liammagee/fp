describe("Agent", function() {

  var agent;

  beforeEach(function() {
    agent = window.fp.agentNetwork.agents[0];
  });

  describe( "#movement", function() {

    describe("basic movement", function() {
      var directions;
      beforeEach(function() {
        directions = agent.generateDirectionVectorsAndWeights( 0.5 );
      })

      it("should generate direction vectors and weights", function() {
        //var directionsAlt = agent.candidateDirections( );
        expect( directions.length ).toEqual( 8 );
        expect( directions[7][0] ).toHaveAnEqualVector( agent.direction );
        expect( directions[7][1] ).toEqual( 0.5 );
        var totalWeights = _.chain( directions )
          .map( function( arr ) { return arr[ 1 ]; } )
          .reduce( function( memo, value ) { return memo + value; }, 0 )
          .value();
        expect( totalWeights ).toEqual( 1.0 );
      } );

      it( "should be report correct heights", function() {
        var position = agent.position;
        expect( position.y ).toEqual( window.fp.getHeight( position.x, position.z ) + window.fp.appConfig.agentOptions.terrainOffset );
      } );
    });

    describe( "avoid water", function() {
      var originalHeight = 0, offset = 0, bestCandidate = null;

      beforeEach(function() {
        // Make sure the agent's direction points to the cell immediately on the left
        agent.direction = new THREE.Vector3( - window.fp.terrain.ratioExtentToPoint * 2, 0, 0 );
        var index = window.fp.getIndex( agent.position.x, agent.position.z );
        // Modify the y coordinate immediate to the left of the current agent's position
        offset = index * 3 - 1;
        originalHeight = window.fp.terrain.planeArray.array[ offset ];
        window.fp.terrain.planeArray.array[ offset ] = 0;
        directions = agent.generateDirectionVectorsAndWeights( 0.5 );
      });

      it("should avoid water", function() {
        expect( directions.length ).toEqual( 8 );
        // The first sorted option should now have a zero weight
        expect( directions[0][1] ).toEqual( 0 );
        expect( directions[0][0] ).not.toEqual( agent.bestCandidate() );
      });

      afterEach(function() {
        window.fp.terrain.planeArray.array[ offset ] = originalHeight;
      });
    });

    describe( "#edges", function() {
      var originalPosition, originalHeight = 0, offset = 0, bestCandidate = null;

      beforeEach(function() {
        // Make sure the agent's direction points to the cell immediately on the left
        originalPosition = agent.position;
        agent.position = agent.lastPosition = new THREE.Vector3( -window.fp.terrain.gridExtent, window.fp.getHeight( -window.fp.terrain.gridExtent, 0 ), 0 );
        agent.direction = new THREE.Vector3( - window.fp.terrain.ratioExtentToPoint * 2, 0, 0 );
        directions = agent.generateDirectionVectorsAndWeights( 0.5 );
      });

      it("should avoid the edge", function() {
        console.log( agent.position )
        expect( directions.length ).toEqual( 5 );
      });

      afterEach( function() {
        agent.position = originalPosition;
      });
    });

    describe("building home and pre-computed path", function() {
      var directions, stepDistance;

      beforeEach( function() {
        window.fp.appConfig.agentOptions.chanceToFindPathToHome = 1.0;
        var homePosition = agent.position.clone();
        // Move three grid positions to the left
        stepDistance = window.fp.appConfig.terrainOptions.multiplier * window.fp.terrain.ratioExtentToPoint
        var offset = stepDistance * 3;
        homePosition.x = homePosition.x - offset;
        var dimensions = fp.buildingNetwork.generateRandomDimensions();
        agent.home = fp.buildingNetwork.createBuilding( homePosition, dimensions );
        directions = agent.generateDirectionVectorsAndWeights( 0.5 );
      } );

      it( "should have a home", function() {
        expect( agent.home ).not.toBeNull();
      } );

      it( "should have just one direction", function() {
        expect( directions.length ).toEqual( 1 );
      } );

      it( "should have a pre-computed path", function() {
        expect( agent.pathComputed ).not.toBeNull();
      } );

      it( "should compute path back to home", function() {
        var index = fp.getIndex( agent.position.x, agent.position.z );
        var xIndex = index % fp.terrain.gridPoints;
        expect( agent.pathComputed[0].x ).toEqual( xIndex - 1 );
        expect( agent.pathComputed[1].x ).toEqual( xIndex - 2 );
        expect( agent.pathComputed[2].x ).toEqual( xIndex - 3 );
      } );

      it( "should point the direction to the east (negative x)", function() {
        expect( agent.direction ).toHaveAnEqualVector( new THREE.Vector3( -stepDistance, 0, 0 ) );
        // expect( agent.direction ).toEqual( 0 );
      });

      afterEach( function() {
        agent.home = null;
        // Reset building structures
        fp.buildingNetwork.networkJstsCache = [];
        fp.buildingNetwork.buildings = [];
        fp.buildingNetwork.buildingHash = {};
      });
    });
  });
});
