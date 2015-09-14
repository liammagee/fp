
var config = {

  "preset": "Default",

  "remembered": {
    "Default": {

        // Agent options
        "1": {

            "noWater": true,
            "initialPopulation": 200,
            "initialExtent": 100,
            "maxExtent": 100,
            // "initialX": 50,
            // "initialY": 50,
            // "randomAge": true,
            "chanceToJoinNetwork": 0.05,
            "chanceToJoinNetworkWithHome": 0.5,
            "chanceToJoinNetworkWithBothHomes": 0.5,
            "chanceToFindPathToHome": 0.01,
            "chanceToFindPathToOtherAgentHome": 0.01,
            "initialCircle": false,
            // "noWater": true,
            // "noUphill": false,
            // "useStickman": true,
            // "visitHomeBuilding": 0.02,
            // "visitOtherBuilding": 0.002,
            "establishLinks": true,
            "size": 400,
            "terrainOffset": 0,
            // "size": 40,
            // "terrainOffset": 20,
            "useStickman": true,
            "shuffle": true,
            "initialSpeed": 100,
            "initialPerturbBy": 0,
            // "movementRelativeToPatch": 100,
            // "movementInPatch": 100,
            // "movementStrictlyIntercardinal": true,

         },
        // Building options
        "2": {

            "roads": 0.0,
            "water": 0.0,
            "otherBuildings": 0.25,
            "distanceFromOtherBuildingsMin": 5000,
            "distanceFromOtherBuildingsMax": 5500,
            "buildingHeight": 0.0,
            "detectBuildingCollisions": true,

            "create": false,

            // "maxNumber": 250,

            // // Carry over from generation
            // "heightA": 2,
            // "heightB": 10,

            // // Influences

            // // Building form
            // "buildingForm": "rectangle",
            // "spread": 10,
            // "randomForm": false,
            // "rotateRandomly": false,
            // "rotateSetAngle": 0,

            // "destroyOnComplete": false,
            // "loopCreateDestroy": false,

            // // Visualisation
            // "turning": false,
            // "falling": false,
            "riseRate": 1,

            // // Dimensions
            "minHeight": 10,
            "maxHeight": 70,
            // "minWidth": 40,
            // "maxWidth": 200,
            // "minLength": 40,
            // "maxLength": 200,
            // "maxLevels": 0,
            // "maxLevels": 0,
            // "width": 0,
            // "length": 0,
            // "levelHeight": 40,

            // // View parameters
            // "useShader": true,
            // "useLevelOfDetail": true,
            // "highResDistance": 1000,
            // "lowResDistance": 7500,
            // "opacity": 1.0,

            // // Fill parameters
            // "showFill": true,
            // "fillRooves": false,

            // // Stroke parameters
            // "showLines": true,
            // "linewidth": 1.0,

            // // Window parameters
            // "showWindows": true,
            // "windowsRandomise": false,
            // "windowWidth": 15,
            // "windowPercent": 60,
            // "windowsStartY": 40,
            // "windowsEndY": 80,
            // "windowsLine": true,
            // "windowsFill": false,

            // // Stagger
            // "stagger": true,
            // "staggerAmount": 40,

            // // Taper
            // "taper": true,
            // "taperExponent": 2,
            // "taperDistribution": 1,

            // // Collision detection
            // "detectBuildingCollisions": true,
            // "detectRoadCollisions": true

        },
        // Road options
        "3": {

            "create": false

            // "maxNumber": 200,  // Maximum number of roads - for performance reasons
            // "roadWidth": 20,
            // "roadDeviation": 20,
            // "roadRadiusSegments": 10,
            // "roadSegments": 10,
            // "initialRadius": 100,
            // "probability": 1,
            // "lenMinimum": 100,
            // "lenMaximum": 2000,
            // "lenDistributionFactor": 3,
            // "overlapThreshold": 3,
            // "flattenAdjustment": 0.025,
            // "flattenLift": 20
        },
        // Terrain options
        "4": {
            // "renderAsSphere": true,
            "loadHeights": false ,
            "gridExtent": 8000,
            "gridPoints": 195,
            "maxTerrainHeight": 2400,
            "shaderUse": true,
            "multiplier": 1,
            // "mapIndex": 0,
            "patchSize": 4 // Should be: N * patchSize = gridPoints - 1

         },
        // Display options
        "5": {
            // "agentsShow": true,
            "buildingsShow": true,
            // "roadsShow": true,
            "waterShow": true,
            "networkShow": false,
            "networkCurve": false,
            // "networkCurvePoints": 20,
            "patchesShow": false,
            "patchesUpdate": true,
            // "trailsShow": false,
            // "trailsShowAsLines": false,
            // "trailLength": 10000,
            // "cursorShow": false,
            // "cursorShowCell": true,
            // "statsShow": true,
            "hudShow": true,
            // "wireframeShow": false,
             "dayShow": false,
//                             "skyboxShow": false,
            // "chartShow": true,
            // "guiShow": true,
            // "guiShowControls": true,
            // "guiShowAgentFolder": true,
            // "guiShowBuildingsFolder": true,
            // "guiShowRoadsFolder": true,
            // "guiShowTerrainFolder": true,
            // "guiShowDisplayFolder": true,
            // "guiShowColorFolder": true,
            // "pathsShow": true,
            "terrainShow": true,
            // "coloriseAgentsByHealth": false,
            // "firstPersonView": false,
            "cameraOverride": true,
            "cameraX": 0,
            "cameraY": 10000,
            "cameraZ": 9000,
            // "maximiseView": true,
        },
        // Color options
        "6": {
            // "colorDayBackground": 0x000000,
            // "colorDayRoad": 0x474747,
            // "colorDayAgent": 0x4747b3,
            // "colorDayNetwork": 0x474747,
            // "colorDayTrail": 0x474747,
            // "colorDayPath": 0x474747,
            // "colorDayBuildingFill": 0xb1abab,
            // "colorDayBuildingLine": 0x222222,
            // "colorDayBuildingWindow": 0x222222,

            "colorNightBackground": 0x033303,
            "colorNightRoad": 32 * 256 * 256 + 32 * 256 + 32,
            "colorNightAgent": 0xffffff,
            "colorNightNetwork": 0xC8E857,
            // "colorNightTrail": 0x47b347,
            "colorNightPath": 0xffffff,
            "colorNightBuildingFill": 0xd3d3d3,
            // "colorNightBuildingLine": 0x838383,
            "colorNightBuildingWindow": 0xffffff,

            // "colorGraphPopulation": 0x4747b3,
            // "colorGraphHealth": 0xb34747,
            // "colorGraphPatchValues": 0x47b347,
            "colorLightHemisphereSky": 0xffffff,
            "colorLightHemisphereGround": 0xffffff,
            "colorLightHemisphereIntensity": 0.9,
            "colorLightDirectional": 0x88ff88,
            "colorLightDirectionalIntensity": 0.1,

            "colorDayTerrainGroundLevel": 0x000000,
            "colorDayTerrainLowland1": 0x054801,
            "colorDayTerrainLowland2": 0x548E0D,
            "colorDayTerrainMidland1": 0xC8E857,
            "colorDayTerrainMidland2": 0xCE983A,
            "colorDayTerrainHighland": 0xFDFDFC,

            // "colorNightTerrainGroundLevel": 0x000000, //0x054801,
            // "colorNightTerrainLowland1": 0x054801, //0x548E0D,
            // "colorNightTerrainLowland2": 0x548E0D, //0xC8E857,
            // "colorNightTerrainMidland1": 0xC8E857, //0xF4C54C,
            // "colorNightTerrainMidland2": 0xCE983A,
            // "colorNightTerrainHighland": 0xFDFDFC,

            "colorNightTerrainGroundLevel": 0x000000,
            "colorNightTerrainLowland1": 0x274E1A,
            "colorNightTerrainLowland2": 0x3F7E2A,
            "colorNightTerrainMidland1": 0x69B84F,
            "colorNightTerrainMidland2": 0xA2D392,
            "colorNightTerrainHighland": 0xFDFDFC,

            "colorTerrainStop1": 0.5,
            "colorTerrainStop2": 0.7,
            "colorTerrainStop3": 0.8,
            "colorTerrainStop4": 0.9,
            "colorTerrainStop5": 1.0,

            "colorTerrainOpacity": 1.0,
        },

    }

  }

};
