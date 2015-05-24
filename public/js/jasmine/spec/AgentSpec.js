describe("Agent", function() {
  var agent;

  beforeEach(function() {
    agent = fp.agentNetwork.agents[0];
  });

  it("should be able to generate direction vectors and weights", function() {
    var directions = agent.generateDirectionVectorsAndWeights();
    expect( directions.length ).toEqual( 8 );
    expect( directions[0][0] ).toHaveAnEqualVector( agent.direction );
    expect( directions[0][1] ).toEqual( 0.5 );
    var totalWeights = _.chain( directions )
      .map( function( arr ) { return arr[ 1 ]; } )
      .reduce( function( memo, value ) { return memo + value; }, 0 )
      .value();
    expect( totalWeights ).toEqual( 1.0 );
  });

});
