
var sim =  {

    counter: 0,
    positions: [],

    updateAgentColor: function( agent ) {

        var lexicon = agent.lexicon;
        var redComponent = Math.floor( 256 * (agent.lexicon) + 64 );
        redComponent = (redComponent > 255) ? 255 : redComponent;
        var blueComponent = Math.floor( 256 * agent.lexicon );
        var greenComponent = Math.floor( 256 * agent.lexicon );
        agent.color = 'rgb(' + redComponent + ', ' + greenComponent + ', ' + blueComponent + ')';
        // agent.color = 'rgb(' + Math.floor(256 * (1.0 - agent.lexicon)) + ', 0, ' + Math.floor(256 * agent.lexicon) + ')';

    },

    distributeGrammars: function() {

        var sim = this;
        fp.agentNetwork.agents.forEach(function(agent) {

            var chance = Math.random();
            if ( chance > fp.appConfig.geoGamesOptions.percentageLanguage1 )
                agent.lexicon = 0.0;
            else
                agent.lexicon = 1.0;
            agent.originalState = agent.lexicon;
            agent.spokenState = agent.lexicon;
            agent.wordList = _.range(10).map(function () { return agent.originalState });
            sim.updateAgentColor( agent );

        });

        // the next bit deals with making one node William Marsters so he can not change his lexicon and be historically accurate with age at death
        var agentsWithOne = _.select(fp.agentNetwork.agents, function( a ) { return a.lexicon == 1.0 } );
        var index = Math.floor( Math.random() * agentsWithOne.length );
        // For debugging: fp.sim.marsters
        this.marsters = agentsWithOne[ index ];
        agentsWithOne[ index ].age = 40;

        fp.agentNetwork.updateAgentParticleSystem();

        // Shorthand to count agent lexicons
        //_.reduce(_.map(fp.agentNetwork.agents, function(a){return a.lexicon}), function(memo, num) {return num + memo;}, 0);
    },

    redistribute: function() {

        LanguageChange.distributeGrammars();

    },

    chooseLanguage: function( agent, index ) {

        var modifier = agent.wordList[ index ];
        if ( modifier < Math.random() )
            agent.spokenState = 0;
        else
            agent.spokenState = 1;

    },

    // ;;this is where the "self" agent updates its wordlist on the basis of the interaction. ;;CHECK DO I HAVE TO USE "OF MYSELF" HERE TO REF SELF?
    updateSelf: function( agent, result, wordIndex ) {

        var rate = fp.appConfig.geoGamesOptions.rate;

        if ( result == 0 ) { //;; i.e. situation where agent used 0 and succeeded

            var newValue = agent.wordList[ wordIndex ] - rate; //;; so they are encouraged in their use of 0 for that item by decreasing likelihood of using 1 by whatever the rate has been set to in the slider.
            newValue = newValue < 0 ? 0 : newValue;
            agent.wordList[ wordIndex ] = newValue;

        }
        else if ( result == 1 ) { //;; ie. situation where agent (self) used 1 and failed

            var newValue = agent.wordList[ wordIndex ] - rate;
            newValue = newValue < 0 ? 0 : newValue;
            agent.wordList[ wordIndex ] = newValue;

        }
        else if ( result == 2 ) { //;; so they are encouraged and increase chance of using 1 again

            var newValue = agent.wordList[ wordIndex ] + rate;
            newValue = newValue > 1 ? 1 : newValue;
            agent.wordList[ wordIndex ] = newValue;

        }
        else if ( result == 3 ) { //;; i.e. situation where agent used 0 and failed.

            var newValue = agent.wordList[ wordIndex ] + rate;
            newValue = newValue > 1 ? 1 : newValue;
            agent.wordList[ wordIndex ] = newValue;

        }

        if ( agent.marsters == true && fp.appConfig.geoGamesOptions.marstersDoesntChange == true ) {

            agent.lexicon = 1;
            agent.wordList = _.range( 10 ).map( function () { return 1.0 } );

        }

    },

    interact: function() {

        var sim = this;
        var rate = fp.appConfig.geoGamesOptions.rate;

        for ( var i = 0; i < fp.agentNetwork.agents.length; i++ ) {

            var agent = fp.agentNetwork.agents[ i ];

            var allAgentsOnPatch = fp.patchNetwork.agentsOnPatches[ fp.getPatchIndex( agent.position.x, agent.position.z ) ];
            if ( _.isUndefined( allAgentsOnPatch ) )
                continue;
            if ( allAgentsOnPatch.length <= 1 )
                continue;
            var wordIndex = Math.floor( Math.random() * 10 );
            var result = 5;
            // Pick a partner at random
            var otherAgent = allAgentsOnPatch[ Math.floor( Math.random() * allAgentsOnPatch.length ) ]
            if ( otherAgent == agent )
                continue;

            var otherWordIndex = Math.floor( Math.random() * 10 );
            sim.chooseLanguage( otherAgent, otherWordIndex );

            if ( otherAgent.spokenState == 0 ) { // i.e. if partner uses language 0

                if ( agent.spokenState == 0 ) { // and self-agent also choose language 0 then success

                    // so they are encouraged in their use of 0 for that item by decreasing likelihood of using 1 by whatever the rate has been set to in the slider.
                    var newValue = otherAgent.wordList[ otherWordIndex ] - rate;
                    newValue = newValue < 0 ? 0 : newValue;
                    otherAgent.wordList[ otherWordIndex ] = newValue;
                    result = 0;

                }
                else {

                    var newValue = otherAgent.wordList[ otherWordIndex ] + rate;
                    newValue = newValue > 1 ? 1 : newValue;
                    otherAgent.wordList[ otherWordIndex ] = newValue;
                    result = 1;

                }

            }
            else {

                if ( agent.spokenState == 1 ) {

                    var newValue = otherAgent.wordList[ otherWordIndex ] + rate;
                    newValue = newValue > 1 ? 1 : newValue;
                    otherAgent.wordList[ otherWordIndex ] = newValue;
                    result = 2;

                }
                else {

                    var newValue = otherAgent.wordList[ otherWordIndex ] - rate;
                    newValue = newValue < 0 ? 0 : newValue;
                    otherAgent.wordList[ otherWordIndex ] = newValue;
                    result = 3;

                }

            }

            otherAgent.lexicon = jStat.mean( otherAgent.wordList );
            this.updateSelf( agent, result, wordIndex );
            agent.lexicon = jStat.mean( agent.wordList );

            if ( otherAgent.marsters == true && fp.appConfig.geoGamesOptions.marstersDoesntChange == true ) {

                otherAgent.lexicon = 1;
                otherAgent.wordList = _.range( 10 ).map( function () { return 1.0 } );

            }

        }

    },

    updateTicks: function() {

        var rate = fp.appConfig.geoGamesOptions.rate;

        for ( var i = 0; i < fp.agentNetwork.agents.length; i++ ) {

            var agent = fp.agentNetwork.agents[ i ];
            agent.ticksSinceReproduction++;

        }

    },


    haveBaby: function( agent ) {

        // i.e. if a year or more has passed since her previous baby was born
        if ( agent.ticksSinceReproduction > fp.timescale.ticksToYear ) {

            var eligibleHusbands = _.select( fp.agentNetwork.agents, function( male ) {

                return ( male.sex == 0 && male.age > 18 && male.motherNode != agent.motherNode );

            } );

            var husband = _.chain( eligibleHusbands ).shuffle().first().value();

            // ;; this needs to equal approximately 30% chance over a year, but it's going to depend on ticks-per-year rate.
            if ( Math.random() * 100 <= ( 300 * fp.timescale.ticksToYear ) ) {

                var child = fp.agentNetwork.createAgent();
                child.sex = Math.floor( Math.random() * 2 );
                child.size = 2;
                child.age = 0;
                child.ticksSinceReproduction = 0;
                child.motherNode = agent;
                child.setPosition( agent.position );
                fp.agentNetwork.agents.push( child );

                if ( fp.appConfig.agentOptions.childrensLanguage == "bilingual" ) {

                    child.lexicon = ( agent.lexicon + husband.lexicon ) / 2;
                    child.wordList = _.range( 10 ).map( function () { return 0.0 } );

                    for ( var i = 0; i < 10; i++ ) {

                        child.wordList[ i ] = ( agent.wordList[ i ] + husband.wordList[ i ] ) / 2;

                    }

                }
                else if ( fp.appConfig.agentOptions.childrensLanguage == "paternal" ) {
                    child.lexicon = husband.lexicon;
                    child.wordList = husband.wordList;

                }

                agent.ticksSinceReproduction = 0;

            }

        }

    },

    reproduce: function() {

        var reproducibles = _.select( fp.agentNetwork.agents, function( agent ) {

            return ( agent.sex == 1 && agent.age > 18 && agent.age < 40 );

        } );

        for ( var i = 0; i < reproducibles.length; i++ ) {

            var agent = reproducibles[ i ];
            this.haveBaby( agent );

        }

        //;; import extra woman
        var importedWoman = fp.agentNetwork.createAgent();
        importedWoman.gender = 1;
        importedWoman.sex = 1;
        importedWoman.age = 18 + Math.floor( Math.random() * 20 );
        importedWoman.ticksSinceReproduction = 0;
        importedWoman.motherNode = importedWoman;
        importedWoman.lexicon = 0.0;
        importedWoman.wordList = _.range( 10 ).map( function () { return 0.0 } );
        importedWoman.origState = 0;
        fp.agentNetwork.agents.push( importedWoman );
        this.haveBaby( importedWoman );

    },

    checkBirthDeath: function() {

        if ( fp.timescale.frameCounter % fp.timescale.ticksToYear == 0 ) {

            var rate = fp.appConfig.geoGamesOptions.rate;

            for ( var i = 0; i < fp.agentNetwork.agents.length; i++ ) {

                var agent = fp.agentNetwork.agents[ i ];
                agent.age++;

                if ( agent.marsters && fp.appConfig.geoGamesOptions.historicallyAccurate ) {

                    if ( agent.age == 82 )
                        agent.die();

                }
                else {

                    // ;; equation mattias wrote to approximate a shifted bell curve where at age 100 you have 1, and two std devs bring you to 60 years old.
                    var prob = Math.pow( Math.E, ( -Math.pow( ( agent.age - 100 ), 2 ) ) / ( 2 * Math.pow( 20, 2 ) ) );
                    if ( Math.random() < prob )
                        agent.die();

                }
                if ( agent.age > 14 && agent.age < 30 ) {

                    if ( Math.random() < fp.appConfig.geoGamesOptions.leavingRate )
                        agent.die();

                }

            }

            this.reproduce();

        }

    },


    setup: function() {

        fp.timescale.framesToTick = 1;
        fp.timescale.ticksToYear = 100;

        this.marsters = null;
        this.elevation = null;
        this.slope = null;
        this.aspect = null;

        this.distributeGrammars();

    },

    tick: function() {

        if ( fp.timescale.frameCounter % fp.timescale.ticksToYear == 0 ) {

            console.log( "Years: " + fp.timescale.frameCounter / fp.timescale.ticksToYear  );

        }

         var sim = this;
         sim.interact();

         fp.agentNetwork.agents.forEach( function( agent ) {

             sim.updateAgentColor( agent );

         });

         sim.updateTicks();

         if ( fp.appConfig.geoGamesOptions.reproduction == true ) {

             sim.checkBirthDeath();

         }

    }

}
