require.config({

    baseUrl: "/js",

    paths: {

        jquery: "utils/jquery",
        astar: "utils/astar",
        underscore: "utils/underscore",
        three: "three-72",
        jstat: "utils/jstat.min",
        smoothie: "ux/smoothie",
        stats: "ux/stats.min",
        javascriptUtil: "utils/javascript.util",
        jsts: "utils/jsts",
        datGui: "ux/dat.gui",
        water: "objects/water-material",
        KeyboardState: "controls/THREEx.KeyboardState",
        TerrainLoader: "loaders/TerrainLoader",
        TrackballControls: "controls/TrackballControls",
        OrbitControls: "controls/OrbitControls",
        PointerLockControls: "controls/PointerLockControls",

        PointerLockControls: "controls/PointerLockControls",
        FiercePlanet: "fp/fp-whole"

    },

    shim: {

        jquery: { exports: "$" },
        three: { exports: "THREE" },
        underscore: { exports: "_" },
        jstat: { exports: "jStat" },
        datGui: { exports: "dat.gui" },
        smoothie: { exports: "SmoothieChart" },
        stats: { exports: "Stats" },
        jsts: { deps: [ "javascriptUtil" ] },
        water: { exports: "THREE.Water", deps: [ "three" ] },
        KeyboardState: { deps: [ "three" ] },
        TerrainLoader: { deps: [ "three" ] },
        TrackballControls: { deps: [ "three" ] },
        OrbitControls: { deps: [ "three" ] },
        PointerLockControls: { deps: [ "three" ] }

    },

    waitSeconds: 200

});

define(

    [
        // NEED TO BE NAMED
        "astar",
        "jquery",
        "three",
        "underscore",
        "FiercePlanet",

        // DO NOT NEED TO BE NAMED
        "jstat",
        "jsts",
        "ux/dat.gui",
        "smoothie",
        "stats",
        "water",
        "TerrainLoader",
        "KeyboardState",
        "TrackballControls",
        "OrbitControls",
        "PointerLockControls",

    ],

    function( astar, $, THREE, _, FiercePlanet ) {

        "use strict";

        /**
         * Extension to JQuery for URL param extraction - taken from: http://www.sitepoint.com/url-parameters-jquery/ .
         */
        $.urlParam = function( name ){

            var results = new RegExp( "[ \\?& ]" + name + "=( [ ^&# ]* )" ).exec( window.location.href );

            if ( results === null ) {

               return undefined;

            }
            else {

               return results[ 1 ] || 0;

            }

        };


        // var fp = FiercePlanet.Simulation;

        return FiercePlanet;

    }

);

