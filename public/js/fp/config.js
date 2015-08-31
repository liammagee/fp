
define( [
        'fp/fp-base'
    ],

    function( FiercePlanet ) {

    /**
     * Represents configuration data about the application.
     * @constructor
     * @namespace AppConfig
     * @memberof fp
     * @inner
     */
    FiercePlanet.AppConfig = function() {
        /**
         * World options.
         * @namespace fp~AppConfig~worldOptions
         */
        this.worldOptions = {
            /**
             * Maximum depth to search for land.
             * @memberOf fp~AppConfig~worldOptions
             * @inner
             */
            maxLandSearchDepth: 2,

            /**
             * Number of index points to use in search ( depends on building size )
             * @memberOf fp~AppConfig~worldOptions
             * @inner
             */
            searchIncrement: 2
        };
        /**
         * Agent options.
         * @namespace fp~AppConfig~agentOptions
         */
        this.agentOptions = {
            /**
             * Initial population of agents.
             * @type {Number}
             * @memberOf fp~AppConfig~agentOptions
             * @inner
             */
            initialPopulation: 100,
            /**
             * The <em>initial</em> extent, or diameter, around the point of origin, where agents can be
            spawned, expressed as a percentage ( 0-100 ).
             * @type {Number}
             * @memberOf fp~AppConfig~agentOptions
             * @inner
             */
            initialExtent: 10,
            /**
             * The <em>maximum</em> extent, or diameter, around the point of origin, where agents can be
            spawed, expressed as a percentage ( 0-100 ).
             * @type {Number}
             * @memberOf fp~AppConfig~agentOptions
             * @inner
             */
            maxExtent: 100,
            // initialX: -500, initialY: -1500, // Melbourne
            /**
             * The <em>x</em> co-ordinate of the point of origin, expressed as a percentage ( 0-100 ) of distance from the actual grid center.
             * @type {Number}
             * @memberOf fp~AppConfig~agentOptions
             * @inner
             */
            initialX: 50,
            /**
             * The <em>y</em> co-ordinate of the point of origin, expressed as a percentage ( 0-100 ) of distance from the actual grid center.
             * @type {Number}
             * @memberOf fp~AppConfig~agentOptions
             * @inner
             */
            initialY: 50,
            randomAge: true,
            chanceToJoinNetwork: 0.05,
            chanceToJoinNetworkWithHome: 0.05,
            chanceToJoinNetworkWithBothHomes: 0.05,
            chanceToFindPathToHome: 0.00,
            chanceToFindPathToOtherAgentHome: 0.00,
            initialCircle: true,
            noWater: true,
            noUphill: false, // Eventually remove for more fine-grained weight control
            useStickman: true,
            visitHomeBuilding: 0.02,
            visitOtherBuilding: 0.002,
            establishLinks: false,
            size: 40,
            terrainOffset: 20,
            shuffle: false,
            initialSpeed: 20,
            initialPerturbBy: 0.05,
            movementRelativeToPatch: false,
            movementInPatch: 1,
            movementStrictlyIntercardinal: false

        };

        this.buildingOptions = {
            create: true,

            maxNumber: 250, // Maximum number of buildings - for performance reasons

            // Carry over from generation
            heightA: 2,
            heightB: 10,

            // Influences
            roads: 0.0,
            water: 0.4,
            otherBuildings: 0.9,
            distanceFromOtherBuildingsMin: 800,
            distanceFromOtherBuildingsMax: 1000,
            buildingHeight: 0.1,

            // Building form
            buildingForm: "rectangle",
            spread: 10,
            randomForm: false,
            rotateRandomly: false,
            rotateSetAngle: 0,

            destroyOnComplete: false,
            loopCreateDestroy: false,

            // Visualisation
            turning: false,
            falling: false,
            riseRate: 10,

            // Dimensions
            minHeight: 10,
            maxHeight: 70,
            minWidth: 40,
            maxWidth: 200,
            minLength: 40,
            maxLength: 200,
            maxLevels: 0,
            width: 0,
            length: 0,
            levelHeight: 40,

            // View parameters
            useShader: true,
            useLevelOfDetail: true,
            highResDistance: 1000,
            lowResDistance: 7500,
            opacity: 1.0,

            // Fill parameters
            showFill: true,
            fillRooves: false,

            // Stroke parameters
            showLines: true,
            linewidth: 1.0,

            // Window parameters
            showWindows: true,
            windowsRandomise: false,
            windowsFlickerRate: 0.05,
            windowWidth: 15,
            windowPercent: 60,
            windowsStartY: 40,
            windowsEndY: 80,
            windowsLine: true,
            windowsFill: false,

            // Stagger
            stagger: true,
            staggerAmount: 40,

            // Taper
            taper: true,
            taperExponent: 2,
            taperDistribution: 1,

            // Collision detection
            detectBuildingCollisions: true,
            detectRoadCollisions: true
        };
        this.roadOptions = {
            create: true,
            maxNumber: 200,  // Maximum number of roads - for performance reasons
            roadWidth: 20,
            roadDeviation: 20,
            roadRadiusSegments: 10,
            roadSegments: 10,
            initialRadius: 100,
            probability: 1,
            lenMinimum: 100,
            lenMaximum: 2000,
            lenDistributionFactor: 3,
            overlapThreshold: 3,
            flattenAdjustment: 0.025,
            flattenLift: 20
        };
        this.displayOptions = {
            agentsShow: true,
            buildingsShow: true,
            roadsShow: true,
            waterShow: true,
            networkShow: false,
            networkCurve: true,
            networkCurvePoints: 20,
            patchesShow: false,
            patchesUpdate: true,
            trailsShow: false,
            trailsShowAsLines: false,
            trailsUpdate: false,
            trailLength: 10000,
            cursorShow: false,
            cursorShowCell: true,
            statsShow: true,
            hudShow: true,
            wireframeShow: false,
            dayShow: false,
            skyboxShow: true,
            chartShow: true,
            guiShow: true,
            guiShowControls: true,
            guiShowAgentFolder: true,
            guiShowBuildingsFolder: true,
            guiShowRoadsFolder: true,
            guiShowTerrainFolder: true,
            guiShowDisplayFolder: true,
            guiShowColorFolder: true,
            pathsShow: true,
            terrainShow: true,
            lightHemisphereShow: false,
            lightDirectionalShow: true,
            coloriseAgentsByHealth: false,
            firstPersonView: false,
            cameraOverride: false,
            cameraX: 0,
            cameraY: 200,
            cameraZ: 800,
            maximiseView: true,
        };
        this.terrainOptions = {
            renderAsSphere: true,
            loadHeights: true,
            gridExtent: 8000,
            gridPoints: 400,
            maxTerrainHeight: 400,
            shaderUse: true,
            shaderShadowMix: 0.5,
            multiplier: 1,
            mapIndex: 0,
            mapFile: "",
            patchSize: 4,
            defaultHeight: 10
        };
        this.colorOptions = {
            colorDayBackground: 0x000000,
            colorDayRoad: 0x474747,
            colorDayAgent: 0x4747b3,
            colorDayNetwork: 0x474747,
            colorDayTrail: 0x474747,
            colorDayPath: 0x474747,
            colorDayBuildingFill: 0xb1abab,
            colorDayBuildingLine: 0x222222,
            colorDayBuildingWindow: 0x222222,

            colorNightBackground: 0x636363,
            colorNightRoad: 0x474747,
            colorNightAgent: 0x47b347,
            colorNightNetwork: 0x47b347,
            colorNightTrail: 0x47b347,
            colorNightNetworPath: 0x47b347,
            colorNightPath: 0x47b347,
            colorNightBuildingFill: 0x838383,
            colorNightBuildingLine: 0x838383,
            colorNightBuildingWindow: 0xffff8f,

            colorGraphPopulation: 0x4747b3,
            colorGraphHealth: 0xb34747,
            colorGraphPatchValues: 0x47b347,

            colorLightHemisphereSky: 0xbfbfbf,
            colorLightHemisphereGround: 0xbfbfbf,
            colorLightHemisphereIntensity: 1.0,
            colorLightDirectional: 0xffffff,
            colorLightDirectionalIntensity: 0.5,

            colorDayTerrainGroundLevel: 0x969696,
            colorDayTerrainLowland1: 0x2d5828,
            colorDayTerrainLowland2: 0x6d915b,
            colorDayTerrainMidland1: 0x89450e,
            colorDayTerrainMidland2: 0x89450e,
            colorDayTerrainHighland: 0x8c8c8c,
            // colorDayTerrainLowland1: 0x4d7848,
            // colorDayTerrainLowland2: 0x8db17b,
            // colorDayTerrainMidland1: 0xa9752e,
            // colorDayTerrainHighland: 0xacacac,
            colorNightTerrainGroundLevel: 0x000000,
            colorNightTerrainLowland1: 0x000000,
            colorNightTerrainLowland2: 0x181818,
            colorNightTerrainMidland1: 0x282828,
            colorNightTerrainMidland2: 0x3a3a3a,
            colorNightTerrainHighland: 0x4c4c4c,

            colorTerrainStop1: 0.2,
            colorTerrainStop2: 0.4,
            colorTerrainStop3: 0.6,
            colorTerrainStop4: 0.8,
            colorTerrainStop5: 1.0,

            colorTerrainOpacity: 1.0,
        };
        this.buildingOptions.maxHeight = ( this.buildingOptions.minHeight > this.buildingOptions.maxHeight ) ? this.buildingOptions.minHeight : this.buildingOptions.maxHeight;
        this.buildingOptions.maxWidth = ( this.buildingOptions.minWidth > this.buildingOptions.maxWidth ) ? this.buildingOptions.minWidth : this.buildingOptions.maxWidth;
        this.buildingOptions.maxLength = ( this.buildingOptions.minLength > this.buildingOptions.maxLength ) ? this.buildingOptions.minLength : this.buildingOptions.maxLength;
        this.buildingOptions.maxLevels = this.buildingOptions.minHeight + Math.floor( Math.random() * this.buildingOptions.maxHeight - this.buildingOptions.minHeight );
        this.buildingOptions.width = this.buildingOptions.minWidth + Math.floor( Math.random() * this.buildingOptions.maxWidth - this.buildingOptions.minWidth );
        this.buildingOptions.length = this.buildingOptions.minLength + Math.floor( Math.random() * this.buildingOptions.maxLength - this.buildingOptions.minLength );
        this.sunOptions  = {
            turbidity: 10,
            reileigh: 2,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.8,
            luminance: 1,
            inclination: 0.49, // elevation / inclination
            azimuth: 0.25, // Facing front,
            sun: !true
        };
    };

    FiercePlanet.appConfig = new FiercePlanet.AppConfig();

    return FiercePlanet;

})

