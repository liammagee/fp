define(

    'config',


    function() {

        "use strict";

        var config = {
          "preset": "Default",
          "remembered": {
            "Default": {
                "1": {
                    "noWater": true,
                    "initialY": 30,
                    "initialPopulat,ion": 250,
                    "initialExtent": 25,
                    "maxExtent": 100,
                    "size": 200
                },
                "2": { "create": false },
                "3": { "create": false },
                "4": {
                    "waterShow": true,
                    "terrainShow": true,
                    "buildingsShow": false,
                    "roadsShow": false,
                    "dayShow": false,
                    // Show patches
                    "patchesShow": true,
                    "lightHemisphereShow": false,
                    "lightDirectionalShow": false,
                    "hudShow": true,

                    "cameraOverride": true,
                    "cameraX": 0,
                    "cameraY": 2500,
                    "cameraZ": 0,
                    // "guiShowColorFolder": false
                },
                "5": {
                    "colorNightAgent": 0x00ff00,
                    "colorNightTerrainGroundLevel": 0x000000,
                    "colorNightTerrainLowland1": 0x272727,
                    "colorNightTerrainLowland2": 0x3F3F3F,
                    "colorNightTerrainMidland1": 0x696969,
                    "colorNightTerrainMidland2": 0xA2A2A2,
                    "colorNightTerrainHighland": 0xFDFDFD,

                    "colorLightHemisphereSky": 0x000000,
                    "colorLightHemisphereGround": 0xffffff,
                    "colorLightHemisphereIntensity": 1.0,
                    "colorLightDirectional": 0xffffff,
                    "colorLightDirectionalIntensity": 1.0,

                    "coloriseAgentsByHealth": false,
                },
                "6": {
                    "mapIndex": 1,
                    "multiplier": 1,
                    "loadHeights": true,
                    "gridExtent": 8000,
                    "gridPoints": 400,
                    "maxTerrainHeight": 400,
                    "patchSize": 21
                },

            }

          }

        };

        return config;

    }

);


