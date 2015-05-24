describe("Agent", function() {
  var agent;

  beforeEach(function() {
    agent = fp.agentNetwork.agents[0];
  });

  describe( "#movement", function() {
    it("should generate direction vectors and weights", function() {
      var directions = agent.generateDirectionVectorsAndWeights( 0.5 );
      expect( directions.length ).toEqual( 8 );
      expect( directions[0][0] ).toHaveAnEqualVector( agent.direction );
      expect( directions[0][1] ).toEqual( 0.5 );
      var totalWeights = _.chain( directions )
        .map( function( arr ) { return arr[ 1 ]; } )
        .reduce( function( memo, value ) { return memo + value; }, 0 )
        .value();
      expect( totalWeights ).toEqual( 1.0 );
    } );

    it( "should be report correct heights", function() {
      var position = agent.position;
      expect( position.y ).toEqual( fp.getHeight( position.x, position.z ) + fp.appConfig.agentOptions.terrainOffset );
    } );
  });

});
