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
        "THREEx.KeyboardState": {
            deps: ["three"],
            exports: "THREEx.KeyboardState"
        },
        "TrackballControls": {
            deps: ["three"],
            exports: "TrackballControls"
        },
        "OrbitControls": {
            deps: ["three"],
            exports: "OrbitControls"
        },
        "PointerLockControls": {
        	deps: ["three"],
        	exports: "PointerLockControls"
        },
    }
})
require([
        "fp",
        "dat.gui",
        "csscolorparser",
        "smoothie",
        "stats.min",
        "jstat.min",
        "javascript.util",
        "jsts",
        "Mirror",
        "TerrainLoader",
        "THREEx.KeyboardState",
        "OrbitControls",
        "TrackballControls",
        "PointerLockControls",
], function() {
    require(["THREEx.KeyboardState", "WaterShader"], function() {
        // Final call to app/main
        require([
            "app/main"
        ])
    });
});
