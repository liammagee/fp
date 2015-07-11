
// Show all heights
fp.agentNetwork.agents.forEach(function(a) { console.log(a.position.y); } )

// Mininum height
var agent = _.min(fp.agentNetwork.agents, function(a) { return a.position.y; } );
