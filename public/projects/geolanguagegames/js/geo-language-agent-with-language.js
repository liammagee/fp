

/**
 * Agent subclass that adds specific behaviour for the
 * geo-language-game models.
 */
var GeoLanguageAgentWithLanguage = function( fp ) {

    GeoLanguageAgent.call( this, fp );

    // Likelihood of differences
    // Review WALS
    // Symmetric - Assymetrical
    this.languageLikelihood = {

        lexicon: 0.8,
        wordOrder: 0.3,
        numPhonemes: 0.2,
        wordComplexity: 0.2

    };

};



