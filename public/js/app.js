require.config({
	"shim": {
        "underscore": { exports: "_" },
        "dat.gui": { exports: "dat.gui" },
        "smoothie": { exports: "SmoothieChart" },
        "stats.min": { exports: "Stats" },
        "jstat.min": { exports: "jStat" },
        "three": { exports: "THREE" },
        "Mirror": ["three"],
        "WaterShader": ["three"],
        "TerrainLoader": {
        	deps: ["three"],
        	exports: "TerrainLoader"
        },
        "js/controls/TrackballControls.js": {
            deps: ["three"],
            exports: "TrackballControls"
        },
        "js/controls/PointerLockControls.js": {
        	deps: ["three"],
        	exports: "PointerLockControls"
        },
    }
})
require([
        "fp",
        "dat.gui",
        "smoothie",
        "stats.min",
        "jstat.min",
        "javascript.util",
        "jsts",
        "Mirror",
        "TerrainLoader",
        "js/THREEx.KeyboardState.js",
        "js/controls/TrackballControls.js",
        "js/controls/PointerLockControls.js",
], function() {
    require(["WaterShader"], function() {
        // Final call to app/main
        require([
            "app/main"
        ])
    });
});
