require.config({

    baseUrl: "/js",

    paths: {

        jquery: "utils/jquery",
        astar: "utils/astar",
        underscore: "utils/underscore",
        three: "three", // NO minified, for debugging purposes
        jstat: "utils/jstat.min",
        smoothie: "ux/smoothie",
        stats: "ux/stats.min",
        javascriptUtil: "utils/javascript.util",
        jsts: "utils/jsts",
        datGui: "ux/dat.gui",
        mirror: "objects/Mirror",
        water: "objects/WaterShader",
        KeyboardState: "controls/THREEx.KeyboardState",
        TerrainLoader: "loaders/TerrainLoader",
        TrackballControls: "controls/TrackballControls",
        OrbitControls: "controls/OrbitControls",
        PointerLockControls: "controls/PointerLockControls",

        fpShaderUtils: "fp/shader-utils-compiled",
        fpInstance: "fp/instance"

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
        mirror: { deps: [ "three" ] },
        water: { exports: "THREE.Water", deps: [ "three", "mirror" ] },
        KeyboardState: { deps: [ "three" ] },
        TerrainLoader: { deps: [ "three" ] },
        TrackballControls: { deps: [ "three" ] },
        OrbitControls: { deps: [ "three" ] },
        PointerLockControls: { deps: [ "three" ] },

        fpInstance: { exports: "fp", deps: [ "three", "KeyboardState" ] },

    },

    waitSeconds: 500

});

define(

    'fp',

    [
        // NEED TO BE NAMED
        "astar",
        "jquery",
        "three",
        "underscore",
        "fpInstance",

        // DO NOT NEED TO BE NAMED
        "jstat",
        "javascriptUtil",
        "jsts",
        "ux/dat.gui",
        "smoothie",
        "stats",
        "mirror",
        "water",
        "TerrainLoader",
        "KeyboardState",
        "TrackballControls",
        "OrbitControls",
        "PointerLockControls",

    ],

    function( astar, $, THREE, _, fp ) {

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

        return fp;

    }

);

