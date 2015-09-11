
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
         * Agent options.
         * @namespace fp~AppConfig~agentOptions
         */
        this.agentOptions = {

            // Initial generation options

            /**
             * The initial number of agents populating the simulation.
             *
             * @type {Number}
             * @memberOf fp~AppConfig~agentOptions
             * @inner
             */
            initialPopulation: 100,

            // NOTE: Settings for Melbourne: initialX: -500, initialY: -1500,

            /**
             * The <em>x</em> co-ordinate of the point of origin around which agents are initially generated,
             * expressed as a percentage (0 - 100) of distance from the actual grid center.
             *
             * @type {Number}
             * @memberOf fp~AppConfig~agentOptions
             * @inner
             */
            initialX: 50,

            /**
             * The <em>y</em> co-ordinate of the point of origin around which agents are initially generated,
             * expressed as a percentage (0 - 100) of distance from the actual grid center.
             *
             * @type {Number}
             * @memberOf fp~AppConfig~agentOptions
             * @inner
             */
            initialY: 50,

            /**
             * The <em>initial</em> extent, or diameter, around the point of
             * origin, where agents can be generated, expressed as a percentage (0 - 100).
             *
             * @type {Number}
             * @memberOf fp~AppConfig~agentOptions
             * @inner
             */
            initialExtent: 10,

            /**
             * The <em>maximum</em> extent, or diameter, around the point of
             *  origin, where agents can be generated, expressed as a percentage (0 - 100).
             *
             * @type {Number}
             * @memberOf fp~AppConfig~agentOptions
             * @inner
             */
            maxExtent: 100,

            /**
             * Whether the initial distribution of agents is in a circle.
             * If false, the distribution is a square.
             *
             * @type {Boolean}
             */
            initialCircle: true,

            /**
             * The initial speed of the agent.
             *
             * @type {Number}
             */
            initialSpeed: 20,

            /**
             * The amount to perturb, or modify, the agent's direction each tick.
             *
             * @type {Number}
             */
            initialPerturbBy: 0.05,

            /**
             * Whether the agent's age is randomly set, initially.
             *
             * @type {Boolean}
             */
            randomAge: true,

            /**
             * Whether to shuffle agents before each tick. Shuffling can be expensive for large number of agents, but can ensure properly randomised simulations.
             *
             * @type {Boolean}
             */
            shuffle: false,


            // Network options

            /**
             * Whether agents can establish links with each other
             *
             * @type {Boolean}
             */
            establishLinks: false,

            /**
             * The likelihood of joining networks when meeting another agent (values are between 0.0 and 1.0).
             *
             * @type {Number}
             */
            chanceToJoinNetwork: 0.05,

            /**
             * The likelihood of joining networks when meeting another agent, when the other agent has a home  (values are between 0.0 and 1.0).
             *
             * @type {Number}
             */
            chanceToJoinNetworkWithHome: 0.05,

            /**
             * The likelihood of establishing a link when meeting another agent, when the other agent has a home.
             *
             * @type {Number}
             */
            chanceToJoinNetworkWithBothHomes: 0.05,

            /**
             * The likelihood of disrupting a random walk to find a path home.
             *
             * @type {Number}
             */
            chanceToFindPathToHome: 0.00,

            /**
             * The likelihood of disrupting a random walk to find a path to another, linked agent's home.
             *
             * @type {Number}
             */
            chanceToFindPathToOtherAgentHome: 0.00,


            // Movement options

            /**
             * Agents cannot move across water.
             *
             * @type {Boolean}
             */
            noWater: false,

            /**
             * Agents cannot go up hill.
             *
             * @type {Boolean}
             */
            noUphill: false, // Eventually remove for more fine-grained weight control

            /**
             * The likelihood of an agent travelling up, when visting their own home.
             *
             * @type {Number}
             */
            visitHomeBuilding: 0.02,


            /**
             * The likelihood of an agent travelling up, when visting another agent's home.
             *
             * @type {Number}
             */
            visitOtherBuilding: 0.002,


            // Visualisation options

            /**
             * Whether to use a 'stickman' image. Otherwise, use a circle.
             *
             * @type {Boolean}
             */
            useStickman: true,

            /**
             * The size to draw the agent.
             *
             * @type {Number}
             */
            size: 40,

            /**
             * The amount to offset the agent from the underlying terrain.
             * @type {Number}
             */
            terrainOffset: 0,

            /**
             * Whether the agent's movement should be calculated, relative to the current patch the agent is on.
             *
             * @type {Boolean}
             */
            movementRelativeToPatch: false,

            /**
             * The amount to multiply the agent's speed, relative to the size of the patch.
             *
             * @type {Number}
             */
            movementInPatch: 1,

            /**
             * Whether the agent's movement should be strictly cardinal (N/NE/E/SE/S/SW/W/NW).
             *
             * @type {Boolean}
             */
            movementStrictlyIntercardinal: false,

            /**
             * Whether to recaculate the agent's movement, every tick.
             * @type {Number}
             */
            changeDirectionEveryTick: 100,

            /**
             * Whether to perturb, or slightly adjust, the agent's movement, every tick.
             *
             * @type {Number}
             */
            perturbDirectionEveryTick: 10,

        };


        this.buildingOptions = {


            /**
             * Whether agents can create buildings.
             *
             * @type {Boolean}
             */
            create: true,

            /**
             * The maximum number of buildings the simulation can hold.
             *
             * @type {Number}
             */
            maxNumber: 250,

            // Collision detection
            /**
             * Whether new buildings should avoid existing buildings.
             *
             * @type {Boolean}
             */
            detectBuildingCollisions: true,

            /**
             * Whether new buildings should avoid existing roads.
             *
             * @type {Boolean}
             */
            detectRoadCollisions: true


            // Building form

            /**
             * The form building should take. Can be one of the following values: "rectangle", "octagon", "fivesided", "triangle", "concave".
             *
             * @type {String}
             */
            buildingForm: "rectangle",

            /**
             * Whether the building's form should be randomly assigned from one of the five values above.
             *
             * @type {Boolean}
             */
            randomForm: false,

            /**
             * How far apart buildings must be from eachother.
             *
             * @type {Number}
             */
            spread: 10,

            /**
             * Whether buildings should be rotated randomly.
             *
             * @type {Boolean}
             */
            rotateRandomly: false,

            /**
             * Whether buildings should be positioned at a set angle.
             *
             * @type {Number}
             */
            rotateSetAngle: 0,

            /**
             * Whether buildings should be destroyed, once created.
             *
             * @type {Boolean}
             */
            destroyOnComplete: false,

            /**
             * Whether buildings should go in a loop of being created and destroyed.
             *
             * @type {Boolean}
             */
            loopCreateDestroy: false,

            // Influences
            /**
             * The influence of a road on the construction of a new building.
             *
             * @type {Number}
             */
            roads: 0.0,

            /**
             * The influence of water on the construction of a new building.
             *
             * @type {Number}
             */
            water: 0.4,

            /**
             * The influence of other buildings on the construction of a new building.
             *
             * @type {Number}
             */
            otherBuildings: 0.9,

            /**
             * The minimum distance of other buildings must be to a new building.
             *
             * @type {Number}
             */
            distanceFromOtherBuildingsMin: 800,

            /**
             * The maximum distance of other buildings must be to a new building.
             *
             * @type {Number}
             */
            distanceFromOtherBuildingsMax: 1000,

            /**
             * The influence of other buildings of a certain height on the construction of a new building.
             *
             * @type {Number}
             */
            buildingHeight: 0.1,

            // Dimensions

            /**
             * The minimum height of a building.
             *
             * @type {Number}
             */
            minHeight: 10,

            /**
             * The maximum height of a building.
             *
             * @type {Number}
             */
            maxHeight: 70,

            /**
             * A building will have a maximum height it can aspire to, based on a given probability. *heightA* refers to the exponential factor in this calculation.
             *
             * @type {Number}
             */
            heightA: 2,

            /**
             * A building will have a maximum height it can aspire to, based on a given probability. *heightB* refers to the additive factor in this calculation, which also constitutes the *minimum height*.
             *
             * @type {Number}
             */
            heightB: 10,

            /**
             * The minimum width of a building.
             *
             * @type {Number}
             */
            minWidth: 40,

            /**
             * The maximum width of a building.
             *
             * @type {Number}
             */
            maxWidth: 200,

            /**
             * The minimum length of a building.
             *
             * @type {Number}
             */
            minLength: 40,

            /**
             * The maximum length of a building.
             *
             * @type {Number}
             */
            maxLength: 200,

            /**
             * The maximum number of levels of a building.
             *
             * @type {Number}
             */
            maxLevels: 0,

            /**
             * A set width for buildings.
             *
             * @type {Number}
             */
            width: 0,

            /**
             * A set length for buildings.
             *
             * @type {Number}
             */
            length: 0,

            /**
             * The height of a level.
             *
             * @type {Number}
             */
            levelHeight: 40,

            // View parameters

            /**
             * Whether to use shaders to render buildings.
             *
             * @type {Boolean}
             */
            useShader: true,

            /**
             * Whether to use level of detail for buildings, simplifying their representation at a distance.
             *
             * @type {Boolean}
             */
            useLevelOfDetail: true,

            /**
             * The distance at which to show the building in high resolution.
             *
             * @type {Number}
             */
            highResDistance: 1000,

            /**
             * The distance at which to show the building in low resolution.
             *
             * @type {Number}
             */
            lowResDistance: 7500,

            /**
             * The amount of opacity to show the building.
             *
             * @type {Number}
             */
            opacity: 1.0,

            // Fill parameters
            /**
             * Whether to show the walls of the building.
             *
             * @type {Boolean}
             */
            showFill: true,

            /**
             * Whether to show the rooves of the building.
             *
             * @type {Boolean}
             */
            fillRooves: false,

            // Stroke parameters
            /**
             * Whether to show the lines of the building.
             *
             * @type {Boolean}
             */
            showLines: true,

            /**
             * The width of the building line.
             * @type {Number}
             */
            linewidth: 1.0,

            // Window parameters
            /**
             * Whether to show the windows of the building.
             *
             * @type {Boolean}
             */
            showWindows: true,

            /**
             * Whether to randomise the appearance of windows.
             * @type {Boolean}
             */
            windowsRandomise: false,

            /**
             * The rate at which to change the appearance of windows.
             *
             * @type {Number}
             */
            windowsFlickerRate: 0.05,

            /**
             * The width of window segments.
             *
             * @type {Number}
             */
            windowWidth: 15,

            /**
             * The percentage of the overall window segment to fill with the window.
             *
             * @type {Number}
             */
            windowPercent: 60,

            /**
             * The bottom of the window, relative to the wall.
             *
             * @type {Number}
             */
            windowsStartY: 40,

            /**
             * The top of the window, relative to the wall.
             *
             * @type {Number}
             */
            windowsEndY: 80,

            /**
             * Whether to draw the line of the window.
             *
             * @type {Boolean}
             */
            windowsLine: true,

            /**
             * Whether to fill in the window.
             *
             * @type {Boolean}
             */
            windowsFill: false,

            // Stagger
            /**
             * Whether to stagger the height of the building.
             *
             * @type {Boolean}
             */
            stagger: true,

            /**
             * The amount to 'step' the stagger.
             *
             * @type {Number}
             */
            staggerAmount: 40,

            // Taper
            /**
             * Whether to taper the stagger of the building. This results in a curved rather than regular stagger, according to random distribution drawn from an exponential sample.
             *
             * @type {Boolean}
             */
            taper: true,

            /**
             * The exponential amount of the taper.
             *
             * @type {Number}
             */
            taperExponent: 2,

            /**
             * The distribution of the taper.
             *
             * @type {Number}
             */
            taperDistribution: 1,

            // Animation
            /**
             * Whether buildings should be shown in a turning motion.
             *
             * @type {Boolean}
             */
            turning: false,

            /**
             * Whether buildings should be shown falling.
             *
             * @type {Boolean}
             */
            falling: false,

            /**
             * The rate at which buildings should fall.
             *
             * @type {Number}
             */
            riseRate: 10,

        };


        this.roadOptions = {

            /**
             * Whether agents can build roads.
             *
             * @type {Boolean}
             */
            create: false,

            /**
             * [maxNumber description]
             * @type {Number}
             */
            maxNumber: 200,  // Maximum number of roads - for performance reasons

            /**
             * [roadWidth description]
             * @type {Number}
             */
            roadWidth: 20,

            /**
             * [roadDeviation description]
             * @type {Number}
             */
            roadDeviation: 20,

            /**
             * [roadRadiusSegments description]
             * @type {Number}
             */
            roadRadiusSegments: 10,

            /**
             * [roadSegments description]
             * @type {Number}
             */
            roadSegments: 10,

            /**
             * [initialRadius description]
             * @type {Number}
             */
            initialRadius: 100,

            /**
             * [probability description]
             * @type {Number}
             */
            probability: 1,

            /**
             * [lenMinimum description]
             * @type {Number}
             */
            lenMinimum: 100,

            /**
             * [lenMaximum description]
             * @type {Number}
             */
            lenMaximum: 2000,

            /**
             * [lenDistributionFactor description]
             * @type {Number}
             */
            lenDistributionFactor: 3,

            /**
             * [overlapThreshold description]
             * @type {Number}
             */
            overlapThreshold: 3,


            /**
             * [flattenAdjustment description]
             * @type {Number}
             */
            flattenAdjustment: 0.025,

            /**
             * [flattenLift description]
             * @type {Number}
             */
            flattenLift: 20

        };


        this.terrainOptions = {

            /**
             * [renderAsSphere description]
             * @type {Boolean}
             */
            renderAsSphere: true,

            /**
             * [loadHeights description]
             * @type {Boolean}
             */
            loadHeights: true,

            /**
             * [gridExtent description]
             * @type {Number}
             */
            gridExtent: 8000,

            /**
             * [gridPoints description]
             * @type {Number}
             */
            gridPoints: 400,

            /**
             * [maxTerrainHeight description]
             * @type {Number}
             */
            maxTerrainHeight: 400,

            /**
             * [shaderUse description]
             * @type {Boolean}
             */
            shaderUse: true,

            /**
             * [shaderShadowMix description]
             * @type {Number}
             */
            shaderShadowMix: 0.5,

            /**
             * [multiplier description]
             * @type {Number}
             */
            multiplier: 1,

            /**
             * [mapIndex description]
             * @type {Number}
             */
            mapIndex: 0,

            /**
             * [mapFile description]
             * @type {String}
             */
            mapFile: "",

            /**
             * [patchSize description]
             * @type {Number}
             */
            patchSize: 4,

            /**
             * [defaultHeight description]
             * @type {Number}
             */
            defaultHeight: 0

        };


        this.displayOptions = {

            /**
             * [agentsShow description]
             * @type {Boolean}
             */
            agentsShow: true,

            /**
             * [buildingsShow description]
             * @type {Boolean}
             */
            buildingsShow: true,

            /**
             * [roadsShow description]
             * @type {Boolean}
             */
            roadsShow: true,

            /**
             * [waterShow description]
             * @type {Boolean}
             */
            waterShow: true,

            /**
             * [networkShow description]
             * @type {Boolean}
             */
            networkShow: false,

            /**
             * [networkCurve description]
             * @type {Boolean}
             */
            networkCurve: true,

            /**
             * [networkCurvePoints description]
             * @type {Number}
             */
            networkCurvePoints: 20,

            /**
             * [patchesShow description]
             * @type {Boolean}
             */
            patchesShow: false,

            /**
             * [patchesUpdate description]
             * @type {Boolean}
             */
            patchesUpdate: true,

            /**
             * [trailsShow description]
             * @type {Boolean}
             */
            trailsShow: false,

            /**
             * [trailsShowAsLines description]
             * @type {Boolean}
             */
            trailsShowAsLines: false,

            /**
             * [trailsUpdate description]
             * @type {Boolean}
             */
            trailsUpdate: false,

            /**
             * [trailLength description]
             * @type {Number}
             */
            trailLength: 10000,

            /**
             * [cursorShow description]
             * @type {Boolean}
             */
            cursorShow: false,

            /**
             * [cursorShowCell description]
             * @type {Boolean}
             */
            cursorShowCell: true,

            /**
             * [statsShow description]
             * @type {Boolean}
             */
            statsShow: true,

            /**
             * [hudShow description]
             * @type {Boolean}
             */
            hudShow: true,

            /**
             * [guiControlsShow description]
             * @type {Boolean}
             */
            guiControlsShow: true,

            /**
             * [wireframeShow description]
             * @type {Boolean}
             */
            wireframeShow: false,

            /**
             * [dayShow description]
             * @type {Boolean}
             */
            dayShow: false,

            /**
             * [skyboxShow description]
             * @type {Boolean}
             */
            skyboxShow: true,

            /**
             * [chartShow description]
             * @type {Boolean}
             */
            chartShow: true,

            /**
             * [guiShow description]
             * @type {Boolean}
             */
            guiShow: true,

            /**
             * [guiShowControls description]
             * @type {Boolean}
             */
            guiShowControls: true,

            /**
             * [guiShowAgentFolder description]
             * @type {Boolean}
             */
            guiShowAgentFolder: true,

            /**
             * [guiShowBuildingsFolder description]
             * @type {Boolean}
             */
            guiShowBuildingsFolder: true,

            /**
             * [guiShowRoadsFolder description]
             * @type {Boolean}
             */
            guiShowRoadsFolder: true,

            /**
             * [guiShowTerrainFolder description]
             * @type {Boolean}
             */
            guiShowTerrainFolder: true,

            /**
             * [guiShowDisplayFolder description]
             * @type {Boolean}
             */
            guiShowDisplayFolder: true,

            /**
             * [guiShowColorFolder description]
             * @type {Boolean}
             */
            guiShowColorFolder: true,

            /**
             * [pathsShow description]
             * @type {Boolean}
             */
            pathsShow: true,

            /**
             * [terrainShow description]
             * @type {Boolean}
             */
            terrainShow: true,

            /**
             * [lightHemisphereShow description]
             * @type {Boolean}
             */
            lightHemisphereShow: false,

            /**
             * [lightDirectionalShow description]
             * @type {Boolean}
             */
            lightDirectionalShow: true,

            /**
             * [coloriseAgentsByHealth description]
             * @type {Boolean}
             */
            coloriseAgentsByHealth: false,

            /**
             * [firstPersonView description]
             * @type {Boolean}
             */
            firstPersonView: false,

            /**
             * [cameraOverride description]
             * @type {Boolean}
             */
            cameraOverride: false,

            /**
             * [cameraX description]
             * @type {Number}
             */
            cameraX: 0,

            /**
             * [cameraY description]
             * @type {Number}
             */
            cameraY: 200,

            /**
             * [cameraZ description]
             * @type {Number}
             */
            cameraZ: 800,

            /**
             * [maximiseView description]
             * @type {Boolean}
             */
            maximiseView: true

        };


        this.colorOptions = {

            /**
             * [colorDayBackground description]
             * @type {[type]}
             */
            colorDayBackground: 0x000000,

            /**
             * [colorDayRoad description]
             * @type {[type]}
             */
            colorDayRoad: 0x474747,

            /**
             * [colorDayAgent description]
             * @type {[type]}
             */
            colorDayAgent: 0x4747b3,

            /**
             * [colorDayNetwork description]
             * @type {[type]}
             */
            colorDayNetwork: 0x474747,

            /**
             * [colorDayTrail description]
             * @type {[type]}
             */
            colorDayTrail: 0x474747,

            /**
             * [colorDayPath description]
             * @type {[type]}
             */
            colorDayPath: 0x474747,

            /**
             * [colorDayBuildingFill description]
             * @type {[type]}
             */
            colorDayBuildingFill: 0xb1abab,

            /**
             * [colorDayBuildingLine description]
             * @type {[type]}
             */
            colorDayBuildingLine: 0x222222,

            /**
             * [colorDayBuildingWindow description]
             * @type {[type]}
             */
            colorDayBuildingWindow: 0x222222,

            /**
             * [colorNightBackground description]
             * @type {[type]}
             */
            colorNightBackground: 0x636363,

            /**
             * [colorNightRoad description]
             * @type {[type]}
             */
            colorNightRoad: 0x474747,

            /**
             * [colorNightAgent description]
             * @type {[type]}
             */
            colorNightAgent: 0x47b347,

            /**
             * [colorNightNetwork description]
             * @type {[type]}
             */
            colorNightNetwork: 0x47b347,

            /**
             * [colorNightTrail description]
             * @type {[type]}
             */
            colorNightTrail: 0x47b347,

            /**
             * [colorNightNetworPath description]
             * @type {[type]}
             */
            colorNightNetworPath: 0x47b347,

            /**
             * [colorNightPath description]
             * @type {[type]}
             */
            colorNightPath: 0x47b347,

            /**
             * [colorNightBuildingFill description]
             * @type {[type]}
             */
            colorNightBuildingFill: 0x838383,

            /**
             * [colorNightBuildingLine description]
             * @type {[type]}
             */
            colorNightBuildingLine: 0x838383,

            /**
             * [colorNightBuildingWindow description]
             * @type {[type]}
             */
            colorNightBuildingWindow: 0xffff8f,

            /**
             * [colorGraphPopulation description]
             * @type {[type]}
             */
            colorGraphPopulation: 0x4747b3,

            /**
             * [colorGraphHealth description]
             * @type {[type]}
             */
            colorGraphHealth: 0xb34747,

            /**
             * [colorGraphPatchValues description]
             * @type {[type]}
             */
            colorGraphPatchValues: 0x47b347,

            /**
             * [colorLightHemisphereSky description]
             * @type {[type]}
             */
            colorLightHemisphereSky: 0xbfbfbf,

            /**
             * [colorLightHemisphereGround description]
             * @type {[type]}
             */
            colorLightHemisphereGround: 0xbfbfbf,

            /**
             * [colorLightHemisphereIntensity description]
             * @type {Number}
             */
            colorLightHemisphereIntensity: 1.0,

            /**
             * [colorLightDirectional description]
             * @type {[type]}
             */
            colorLightDirectional: 0xffffff,

            /**
             * [colorLightDirectionalIntensity description]
             * @type {Number}
             */
            colorLightDirectionalIntensity: 0.5,

            /**
             * [colorDayTerrainGroundLevel description]
             * @type {[type]}
             */
            colorDayTerrainGroundLevel: 0x969696,

            /**
             * [colorDayTerrainLowland1 description]
             * @type {[type]}
             */
            colorDayTerrainLowland1: 0x2d5828,

            /**
             * [colorDayTerrainLowland2 description]
             * @type {[type]}
             */
            colorDayTerrainLowland2: 0x6d915b,

            /**
             * [colorDayTerrainMidland1 description]
             * @type {[type]}
             */
            colorDayTerrainMidland1: 0x89450e,

            /**
             * [colorDayTerrainMidland2 description]
             * @type {[type]}
             */
            colorDayTerrainMidland2: 0x89450e,

            /**
             * [colorDayTerrainHighland description]
             * @type {[type]}
             */
            colorDayTerrainHighland: 0x8c8c8c,

            /**
             * [colorNightTerrainGroundLevel description]
             * @type {[type]}
             */
            colorNightTerrainGroundLevel: 0x000000,

            /**
             * [colorNightTerrainLowland1 description]
             * @type {[type]}
             */
            colorNightTerrainLowland1: 0x000000,

            /**
             * [colorNightTerrainLowland2 description]
             * @type {[type]}
             */
            colorNightTerrainLowland2: 0x181818,

            /**
             * [colorNightTerrainMidland1 description]
             * @type {[type]}
             */
            colorNightTerrainMidland1: 0x282828,

            /**
             * [colorNightTerrainMidland2 description]
             * @type {[type]}
             */
            colorNightTerrainMidland2: 0x3a3a3a,

            /**
             * [colorNightTerrainHighland description]
             * @type {[type]}
             */
            colorNightTerrainHighland: 0x4c4c4c,

            /**
             * [colorTerrainStop1 description]
             * @type {Number}
             */
            colorTerrainStop1: 0.2,

            /**
             * [colorTerrainStop2 description]
             * @type {Number}
             */
            colorTerrainStop2: 0.4,

            /**
             * [colorTerrainStop3 description]
             * @type {Number}
             */
            colorTerrainStop3: 0.6,

            /**
             * [colorTerrainStop4 description]
             * @type {Number}
             */
            colorTerrainStop4: 0.8,

            /**
             * [colorTerrainStop5 description]
             * @type {Number}
             */
            colorTerrainStop5: 1.0,

            /**
             * [colorTerrainOpacity description]
             * @type {Number}
             */
            colorTerrainOpacity: 1.0

        };

        this.buildingOptions.maxHeight = ( this.buildingOptions.minHeight > this.buildingOptions.maxHeight ) ? this.buildingOptions.minHeight : this.buildingOptions.maxHeight;
        this.buildingOptions.maxWidth = ( this.buildingOptions.minWidth > this.buildingOptions.maxWidth ) ? this.buildingOptions.minWidth : this.buildingOptions.maxWidth;
        this.buildingOptions.maxLength = ( this.buildingOptions.minLength > this.buildingOptions.maxLength ) ? this.buildingOptions.minLength : this.buildingOptions.maxLength;
        this.buildingOptions.maxLevels = this.buildingOptions.minHeight + Math.floor( Math.random() * this.buildingOptions.maxHeight - this.buildingOptions.minHeight );
        this.buildingOptions.width = this.buildingOptions.minWidth + Math.floor( Math.random() * this.buildingOptions.maxWidth - this.buildingOptions.minWidth );
        this.buildingOptions.length = this.buildingOptions.minLength + Math.floor( Math.random() * this.buildingOptions.maxLength - this.buildingOptions.minLength );


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

