

/**
 * Agent subclass that adds specific behaviour for
 * sustainability.
 */
var SustainableAgent = function( fp ) {

    fp.FiercePlanet.Agent.call( this, fp );


    // Set up an agent class that can exercise, consume, reproduce and die
    this.exercise = function() {

        if (this.health > 0) {

            this.health -= fp.appConfig.globalSustainabilityOptions.energyLoss;

        }

    }

    this.consume = function() {

        var index = fp.getPatchIndex( this.position.x, this.position.z );
        var patch = fp.patchNetwork.agentsOnPatches[index];

        if ( !_.isUndefined( patch ) ) {

            var numAgentsOnPatch = patch.length;
            var patchValue = fp.patchNetwork.patches[ index ];
            var availableYield = patchValue.value / numAgentsOnPatch;
            patchValue.updatePatchValue( - fp.appConfig.globalSustainabilityOptions.rateOfConsumption );
            this.health += fp.appConfig.globalSustainabilityOptions.energyGain * availableYield;
            this.health = (this.health > 100) ? 100 : this.health;

        }

    };

    this.die = function() {
        fp.scene.remove( fp.agentNetwork.particles );
        var index = fp.agentNetwork.agents.indexOf(this);
        fp.agentNetwork.agents.splice(index, 1);
        fp.agentNetwork.updateAgentParticleSystem();
        fp.scene.add( fp.agentNetwork.particles );
    };

    this.reproduce = function() {
        // Crude set of assumptions about conditions for reproduction
        var current = fp.agentNetwork.agents.length;
        var initial = fp.appConfig.agentOptions.initialPopulation;
        var popCorrection = Math.pow( ( current / initial ), 2 );
        if ( Math.random() * popCorrection <  fp.appConfig.globalSustainabilityOptions.reproductionChance &&
             this.children.length < fp.appConfig.globalSustainabilityOptions.maxChildren &&
             this.gender == "f" &&
             Math.random() * this.health > 50 &&
             this.age > 15 && this.age < 50 )  {
            var agent = fp.agentNetwork.createAgent();
            agent.mother = this;
            agent.color = this.color;
            agent.position = this.position;
            this.children.push(agent);
            fp.agentNetwork.agents.push(agent);
            fp.agentNetwork.updateAgentParticleSystem();
        }
    };


};



