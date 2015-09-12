
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
            detectRoadCollisions: true,


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
             * The maximum number of roads the simulation can hold.
             *
             * @type {Number}
             */
            maxNumber: 200,  // Maximum number of roads - for performance reasons

            /**
             * The standard width of roads.
             *
             * @type {Number}
             */
            roadWidth: 20,

            /**
             * The deviation of a road from the standard width.
             *
             * @type {Number}
             */
            roadDeviation: 20,

            /**
             * The number of radial segments, giving greater defintion.
             *
             * @type {Number}
             */
            roadRadiusSegments: 10,

            /**
             * The number of length segments, also giving greater defintion.
             *
             * @type {Number}
             */
            roadSegments: 10,

            /**
             * The initial radius of roads.
             *
             * @type {Number}
             */
            initialRadius: 100,

            /**
             * The likelihood a road will be constructed.
             *
             * @type {Number}
             */
            probability: 1,

            /**
             * The minimum length of a road.
             *
             * @type {Number}
             */
            lenMinimum: 100,

            /**
             * The maximum length of a road.
             *
             * @type {Number}
             */
            lenMaximum: 2000,

            /**
             * The distribution of road lengths.
             *
             * @type {Number}
             */
            lenDistributionFactor: 3,

            /**
             * A threshold determining the likelihood of roads overlapping.
             *
             * @type {Number}
             */
            overlapThreshold: 3,


            /**
             * The amount to flatten the road 'tube'.
             *
             * @type {Number}
             */
            flattenAdjustment: 0.025,

            /**
             * The amount to lift the road from the terrain.
             *
             * @type {Number}
             */
            flattenLift: 20

        };


        this.terrainOptions = {

            /**
             * Whether to render the terrain as a sphere, instead of as a plane.
             *
             * @type {Boolean}
             */
            renderAsSphere: true,

            /**
             * Whether to load heights; otherwise the terrain will be purely flat.
             *
             * @type {Boolean}
             */
            loadHeights: true,

            /**
             * The extent, in width and length, of the grid.
             *
             * @type {Number}
             */
            gridExtent: 8000,

            /**
             * The number of points to plot on the grid. Each point represents a specific height that could vary,
             *
             * @type {Number}
             */
            gridPoints: 400,

            /**
             * The maximum terrain height, against which all heights are normalised.
             *
             * @type {Number}
             */
            maxTerrainHeight: 400,

            /**
             * Whether to use the in-built terrain shader, which allows for different heights to use a blend of colour options.
             *
             * @type {Boolean}
             */
            shaderUse: true,

            /**
             * The amount to mix in shadows to the shader view.
             *
             * @type {Number}
             */
            shaderShadowMix: 0.5,

            /**
             * Multiplies the *gridExtent*, to stretch the terrain.
             *
             * @type {Number}
             */
            multiplier: 1,

            /**
             * An index to the in-built list of maps (currently either 0 or 1).
             *
             * @type {Number}
             */
            mapIndex: 0,

            /**
             * A URL to a specific map file, to use in place of the built-in maps.
             *
             * @type {String}
             */
            mapFile: "",

            /**
             * The size of the patch - in number of *gridPoints*.
             *
             * @type {Number}
             */
            patchSize: 4,

            /**
             * The default height of the terrain (can be offset from water, if shown).
             *
             * @type {Number}
             */
            defaultHeight: 0

        };


        this.displayOptions = {

            /**
             * Whether to render agents.
             *
             * @type {Boolean}
             */
            agentsShow: true,

            /**
             * Whether to render buildings.
             *
             * @type {Boolean}
             */
            buildingsShow: true,

            /**
             * Whether to render roads.
             *
             * @type {Boolean}
             */
            roadsShow: true,

            /**
             * Whether to render water, around the terrain.
             *
             * @type {Boolean}
             */
            waterShow: true,

            /**
             * Whether to render agent networks, if they are created - the *establishLink* option must be set for this option to have an effect.
             *
             * @type {Boolean}
             */
            networkShow: false,

            /**
             * Whether to use bezier curves for network connections between agents.
             *
             * @type {Boolean}
             */
            networkCurve: true,

            /**
             * The number of points to plot curves for connections between agents.
             *
             * @type {Number}
             */
            networkCurvePoints: 20,

            /**
             * Whether to render patches.
             *
             * @type {Boolean}
             */
            patchesShow: false,

            /**
             * Whether to update patches.
             *
             * @type {Boolean}
             */
            patchesUpdate: true,

            /**
             * Whether to render trails, created by agents.
             *
             * @type {Boolean}
             */
            trailsShow: false,

            /**
             * Whether to render trails as lines.
             *
             * @type {Boolean}
             */
            trailsShowAsLines: false,

            /**
             * Whether to update trails.
             *
             * @type {Boolean}
             */
            trailsUpdate: false,

            /**
             * The length of trails - conditions the number of previous positions remembered by agents.
             *
             * @type {Number}
             */
            trailLength: 10000,

            /**
             * Whether to render a mouse cursor on the terrain.
             *
             * @type {Boolean}
             */
            cursorShow: false,

            /**
             * Whether to render the mouse cursor as a 'cell' on the terrain.
             *
             * @type {Boolean}
             */
            cursorShowCell: true,

            /**
             * Whether to render the stats monitor.
             *
             * @type {Boolean}
             */
            statsShow: true,

            /**
             * Whether to render the 'heads-up display'.
             *
             * @type {Boolean}
             */
            hudShow: true,

            /**
             * Whether to render the GUI control panel.
             *
             * @type {Boolean}
             */
            guiControlsShow: true,

            /**
             * Whether to render the building, roads and terrain using a wireframe connecting mesh points.
             *
             * @type {Boolean}
             */
            wireframeShow: false,

            /**
             * Whether to render the simulation as a day rather than night.
             *
             * @type {Boolean}
             */
            dayShow: false,

            /**
             * Whether to render the skybox for the day view.
             *
             * @type {Boolean}
             */
            skyboxShow: true,

            /**
             * Whether to render the chart, displaying the simulation outputs.
             *
             * @type {Boolean}
             */
            chartShow: true,

            /**
             * Whether to render the GUI control panel [duplicates the *guiControlsShow*?].
             *
             * @type {Boolean}
             */
            guiShow: true,

            /**
             * Whether to render the GUI controls (*Setup*, *Run*, etc.).
             *
             * @type {Boolean}
             */
            guiShowControls: true,

            /**
             * Whether to render the GUI agent folder and options.
             *
             * @type {Boolean}
             */
            guiShowAgentFolder: true,

            /**
             * Whether to render the GUI building folder and options.
             *
             * @type {Boolean}
             */
            guiShowBuildingsFolder: true,

            /**
             * Whether to render the GUI roads folder and options.
             *
             * @type {Boolean}
             */
            guiShowRoadsFolder: true,

            /**
             * Whether to render the GUI terrain folder and options.
             *
             * @type {Boolean}
             */
            guiShowTerrainFolder: true,

            /**
             * Whether to render the GUI display folder and options.
             *
             * @type {Boolean}
             */
            guiShowDisplayFolder: true,

            /**
             * Whether to render the GUI colour folder and options.
             *
             * @type {Boolean}
             */
            guiShowColorFolder: true,

            /**
             * Whether to render paths traversed by agents.
             *
             * @type {Boolean}
             */
            pathsShow: true,

            /**
             * Whether to render the terrain.
             *
             * @type {Boolean}
             */
            terrainShow: true,

            /**
             * Whether to render the hemisphere light.
             *
             * @type {Boolean}
             */
            lightHemisphereShow: false,

            /**
             * Whether to render the directonal light.
             *
             * @type {Boolean}
             */
            lightDirectionalShow: true,

            /**
             * Whether to render agent's health by colour (where red indicates low health. The alternative is to use opacity.
             *
             * @type {Boolean}
             */
            coloriseAgentsByHealth: false,

            /**
             * Whether to use the first person view [**NOT WORKING CURRENTLY**].
             *
             * @type {Boolean}
             */
            firstPersonView: false,

            /**
             * Whether to use custom camera settings.
             *
             * @type {Boolean}
             */
            cameraOverride: false,

            /**
             * If *cameraOverride* is true, the X position of the camera.
             *
             * @type {Number}
             */
            cameraX: 0,

            /**
             * If *cameraOverride* is true, the Y position of the camera.
             *
             * @type {Number}
             */
            cameraY: 200,

            /**
             * If *cameraOverride* is true, the Z position of the camera.
             *
             * @type {Number}
             */
            cameraZ: 800,

            /**
             * Whether to maximise the screen.
             *
             * @type {Boolean}
             */
            maximiseView: true

        };


        this.colorOptions = {

            // Terrain Colours

            // Day Colours picked from: http://gis.stackexchange.com/questions/25099/what-is-the-best-colour-ramp-to-use-for-elevation
            /**
             * The colour of the terrain at sea level during the day.
             *
             * @type {Number}
             */
            colorDayTerrainGroundLevel: 0x49752d,

            /**
             * The colour of the terrain at sea level during the night.
             *
             * @type {Number}
             */
            colorNightTerrainGroundLevel: 0x000000,

            /**
             * The colour of the terrain on lowlands (level 1) during the day.
             *
             * @type {Number}
             */
            colorDayTerrainLowland1: 0x628838,

            /**
             * The colour of the terrain on lowlands (level 1) during the night.
             *
             * @type {Number}
             */
            colorNightTerrainLowland1: 0x000000,

            /**
             * The colour of the terrain on lowlands (level 2) during the day.
             *
             * @type {Number}
             */
            colorDayTerrainLowland2: 0x7b9b46,

            /**
             * The colour of the terrain on lowlands (level 2) during the night.
             *
             * @type {Number}
             */
            colorNightTerrainLowland2: 0x181818,

            /**
             * The colour of the terrain on midlands (level 1) during the day.
             *
             * @type {Number}
             */
            colorDayTerrainMidland1: 0x8CC65B,

            /**
             * The colour of the terrain on midlands (level 1) during the night.
             *
             * @type {Number}
             */
            colorNightTerrainMidland1: 0x282828,

            /**
             * The colour of the terrain on midlands (level 2)  during the day.
             *
             * @type {Number}
             */
            colorDayTerrainMidland2: 0xe9e07d,

            /**
             * The colour of the terrain on midlands (level 2) during the night.
             *
             * @type {Number}
             */
            colorNightTerrainMidland2: 0x3a3a3a,

            /**
             * The colour of the terrain on highlands during the day.
             *
             * @type {Number}
             */
            colorDayTerrainHighland: 0x793833,

            /**
             * The colour of the terrain on highlands during the night.
             *
             * @type {Number}
             */
            colorNightTerrainHighland: 0x4c4c4c,

            /**
             * The proportion of *maxTerrainHeight* at which to transition from sea level to lowlands (level 1).
             *
             * @type {Number}
             */
            colorTerrainStop1: 0.2,

            /**
             * The proportion of *maxTerrainHeight* at which to transition from lowlevel (level 1) to lowlands (level 2).
             *
             * @type {Number}
             */
            colorTerrainStop2: 0.4,

            /**
             * The proportion of *maxTerrainHeight* at which to transition from lowlands (level 2) to midlands (level 1).
             *
             * @type {Number}
             */
            colorTerrainStop3: 0.6,

            /**
             * The proportion of *maxTerrainHeight* at which to transition from midlands (level 1) to midlands (level 2).
             *
             * @type {Number}
             */
            colorTerrainStop4: 0.8,

            /**
             * The proportion of *maxTerrainHeight* at which to transition from midlands (level 2) to highlands.
             *
             * @type {Number}
             */
            colorTerrainStop5: 1.0,

            /**
             * The opacity of the terrain colours (low values will make the terrain "see through").
             *
             * @type {Number}
             */
            colorTerrainOpacity: 1.0,


            // Building Colours

            /**
             *The color of building walls during the day.
             *
             * @type {Number}
             */
            colorDayBuildingFill: 0xb1abab,

            /**
             * The color of building walls during the night.
             *
             * @type {Number}
             */
            colorNightBuildingFill: 0x838383,

            /**
             * The color of building lines during the day.
             *
             * @type {Number}
             */
            colorDayBuildingLine: 0x222222,

            /**
             * The color of building lines during the night.
             *
             * @type {Number}
             */
            colorNightBuildingLine: 0x838383,

            /**
             * The color of building windows during the day.
             *
             * @type {Number}
             */
            colorDayBuildingWindow: 0x222222,

            /**
             * The color of building windows during the night.
             *
             * @type {Number}
             */
            colorNightBuildingWindow: 0xffff8f,


            // Graph colours

            /**
             * The colour of the *first* graphed line (defaults to the simulation's *agent population*).
             *
             * @type {Number}
             */
            colorGraphPopulation: 0x4747b3,

            /**
             * The colour of the *second* graphed line (defaults to the simulation's *agent mean health*).
             *
             * @type {Number}
             */
            colorGraphHealth: 0xb34747,

            /**
             * The colour of the *second* graphed line (defaults to the simulation's *patches' mean value*).
             *
             * @type {Number}
             */
            colorGraphPatchValues: 0x47b347,

            // Lighting colours

            /**
             * The sky colour of the hemisphere light.
             *
             * @type {Number}
             */
            colorLightHemisphereSky: 0xbfbfbf,

            /**
             * The ground colour of the hemisphere light.
             *
             * @type {Number}
             */
            colorLightHemisphereGround: 0xbfbfbf,

            /**
             * The intensity of the hemisphere light.
             *
             * @type {Number}
             */
            colorLightHemisphereIntensity: 1.0,

            /**
             * The colour of the directional light.
             *
             * @type {Number}
             */
            colorLightDirectional: 0xffffff,

            /**
             * The intensity of the directional light.
             *
             * @type {Number}
             */
            colorLightDirectionalIntensity: 0.5,


            // Other colours

            /**
             * The color of the world background during the day.
             *
             * @type {Number}
             */
            colorDayBackground: 0x000000,

            /**
             * The color of the world background during the night.
             *
             * @type {Number}
             */
            colorNightBackground: 0x636363,

            /**
             * The color of roads during the day.
             *
             * @type {Number}
             */
            colorDayRoad: 0x474747,

            /**
             * The color of roads during the night.
             *
             * @type {Number}
             */
            colorNightRoad: 0x474747,

            /**
             * The color of agents during the day.
             *
             * @type {Number}
             */
            colorDayAgent: 0x4747b3,

            /**
             * The color of agents during the night.
             *
             * @type {Number}
             */
            colorNightAgent: 0x47b347,

            /**
             * The color of agent networks during the day.
             *
             * @type {Number}
             */
            colorDayNetwork: 0x474747,

            /**
             * The color of agent networks during the night.
             *
             * @type {Number}
             */
            colorNightNetwork: 0x47b347,

            /**
             * The color of agent trails during the day.
             *
             * @type {Number}
             */
            colorDayTrail: 0x474747,

            /**
             * The color of agent trails during the night.
             *
             * @type {Number}
             */
            colorNightTrail: 0x47b347,

            /**
             * The color of agent paths during the day.
             *
             * @type {Number}
             */
            colorDayPath: 0x474747,

            /**
             * The color of agent paths during the night.
             *
             * @type {Number}
             */
            colorNightPath: 0x47b347

        };

        // Assign values based on calculations

        this.buildingOptions.maxHeight = ( this.buildingOptions.minHeight > this.buildingOptions.maxHeight ) ? this.buildingOptions.minHeight : this.buildingOptions.maxHeight;
        this.buildingOptions.maxWidth = ( this.buildingOptions.minWidth > this.buildingOptions.maxWidth ) ? this.buildingOptions.minWidth : this.buildingOptions.maxWidth;
        this.buildingOptions.maxLength = ( this.buildingOptions.minLength > this.buildingOptions.maxLength ) ? this.buildingOptions.minLength : this.buildingOptions.maxLength;
        this.buildingOptions.maxLevels = this.buildingOptions.minHeight + Math.floor( Math.random() * this.buildingOptions.maxHeight - this.buildingOptions.minHeight );
        this.buildingOptions.width = this.buildingOptions.minWidth + Math.floor( Math.random() * this.buildingOptions.maxWidth - this.buildingOptions.minWidth );
        this.buildingOptions.length = this.buildingOptions.minLength + Math.floor( Math.random() * this.buildingOptions.maxLength - this.buildingOptions.minLength );


        /**
         * World options.
         *
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
         * Sun options.
         *
         * @type {Object}
         */
        this.sunOptions = {
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

