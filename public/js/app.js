requirejs.config({
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
requirejs([
        "fp",
        "dat.gui",
        "smoothie",
        "stats.min",
        "jstat.min",
        "Mirror",
        "WaterShader",
        "TerrainLoader",
        "js/THREEx.KeyboardState.js",
        "js/controls/TrackballControls.js",
        "js/controls/PointerLockControls.js",
]);
requirejs([        
    "app/main"
])