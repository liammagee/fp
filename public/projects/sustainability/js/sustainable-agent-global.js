

/**
 * Agent subclass that adds specific behaviour for
 * sustainability.
 */
var SustainableAgentGlobal = function( fp ) {

    fp.FiercePlanet.Agent.call( this, fp );


    // Set up an agent class that can exercise, consume, reproduce and die
    this.exercise = function() {

        var index = fp.getPatchIndex( this.position.x, this.position.z );
        var patch = fp.patchNetwork.patches[ index ];

        if ( !_.isUndefined( patch ) ) {

            var patchValue = fp.patchNetwork.patches[ index ];

            var consumed = fp.appConfig.globalSustainabilityOptions.rateOfConsumption / fp.timescale.ticksToYear;

            if ( patchValue.value === patchValue.minValue ) {

                // Pick a random value
                for ( var i = 0; i < 1; i++ ) {

                    var r = Math.floor( Math.random() * fp.patchNetwork.patches.length );
                    if ( fp.patchNetwork.patches[ r ].value > patchValue.minValue ) {

                        patchValue = fp.patchNetwork.patches[ r ];
                        break;

                    }

                }

            }
            else if ( patchValue.value < consumed ) {

                consumed = patchValue.value;

            }

            patchValue.updatePatchValue( -consumed );
            fp.sim.annualConsumed += consumed;

        }

        if (this.health > 0) {

            var factor = fp.appConfig.globalSustainabilityOptions.energyLoss * ( 16 / fp.timescale.ticksToYear );
            this.health -= factor;

        }

    }


    this.consume = function() {

        var foodAvailable = fp.sim.getFoodYield();
        this.health += fp.appConfig.globalSustainabilityOptions.energyGain * foodAvailable;
        this.health = (this.health > 100) ? 100 : this.health;

    };

    this.die = function() {

        fp.scene.remove( fp.agentNetwork.particles );
        var index = fp.agentNetwork.agents.indexOf(this);
        fp.agentNetwork.agents.splice(index, 1);
        fp.agentNetwork.updateAgentParticleSystem();
        fp.scene.add( fp.agentNetwork.particles );

        if ( fp.agentNetwork.agents.length === 0 )
            fp.endSim();

    };

    this.reproduce = function() {

        // Crude set of assumptions about conditions for reproduction
        var current = fp.agentNetwork.agents.length;
        var initial = fp.appConfig.agentOptions.initialPopulation;
        var popCorrection = Math.pow( ( current / initial ), 2 );

        var index = fp.getPatchIndex( this.position.x, this.position.z );
        var patchValue = fp.patchNetwork.patches[ index ];

        if ( Math.random() * popCorrection <  fp.appConfig.globalSustainabilityOptions.reproductionChance &&
             this.children.length < fp.appConfig.globalSustainabilityOptions.maxChildren &&
             this.gender == "f" &&
             Math.random() * this.health > 50 &&
             this.age > 15 && this.age < 50 &&
             this.health > 50 &&
             fp.sim.getFoodYield() > 0.02 )  {

            var agent = fp.agentNetwork.createAgent();
            agent.mother = this;
            agent.setPosition( this.position );
            agent.setRandomDirection();
            agent.health = this.health + Math.random() * ( 100 - this.health );
            agent.color = this.color;
            this.children.push(agent);
            fp.agentNetwork.agents.push(agent);

            fp.scene.remove( fp.agentNetwork.   particles );
            fp.agentNetwork.updateAgentParticleSystem();
            fp.scene.add( fp.agentNetwork.particles );

        }

    };



};



