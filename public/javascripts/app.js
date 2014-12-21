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
        "javascripts/controls/TrackballControls.js": { 
            deps: ["three"],
            exports: "TrackballControls"
        },
        "javascripts/controls/PointerLockControls.js": { 
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
        "javascripts/THREEx.KeyboardState.js",
        "javascripts/controls/TrackballControls.js",
        "javascripts/controls/PointerLockControls.js",
]);
requirejs([        
    "app/main"
])