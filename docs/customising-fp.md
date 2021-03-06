% Fierce Planet

# Customising *Fierce Planet*

*Fierce Planet* is designed to be highly configurable. The examples show some of the "out-of-the-box" options. It is also possible to add functional hooks to "setup" and "run" actions, to customise agent, terrain, building and road behaviour.



 - [Configuring Fierce Planet](#configuring-fp)
	 + [Agent Options](#configuring-agents)
	 + [Building Options](#configuring-buildings)
	 + [Road Options](#configuring-roads)
	 + [Terrain Options](#configuring-terrain)
	 + [Display Options](#configuring-display)
	 + [Colour Options](#configuring-colour)
 - [Customing the Code](#customising-code)
	 + [Basic usage](#basic-usage)
	 + [Creating maps](#creating-maps)


## Configuring Fierce Planet {#configuring-fp}

*Fierce Planet* can be configured to support a range of different scenarios.

Configuration options can be set in two ways:

 - Via the control panel, visible when running *Fierce Planet*.
 - In code, through *config* object passed to the *init* function of the *Simulation* object.

The following are a partial list of these options:


### Agent Options {#configuring-agents}

 * Initial Distribution
	+ *initialPopulation*: The initial number of agents populating the simulation.
	+ *initialX*: The *x* co-ordinate of the point of origin around which agents are initially generated, expressed as a percentage (0 - 100) of distance from the actual grid center.
	+ *initialY*: The *y* co-ordinate of the point of origin  around which agents are initially generated, expressed as a percentage (0 - 100) of distance from the actual grid center.
	+ *initialExtent*: The *initial* extent, or diameter, around the point of origin, where agents can be generated, expressed as a percentage (0 - 100).
	+ *maxExtent*: The *maximum* extent, or diameter, around the point of origin, where agents can be generated, expressed as a percentage (0 - 100).
	+ *initialCircle*: Whether the initial distribution of agents is in a circle. If false, the distribution is a square.
	+ *initialSpeed*: The initial speed of the agent.
	+ *initialPerturbBy*: The amount to perturb, or modify, the agent's direction each tick.
	+ *randomAge*: Whether the agent's age is randomly set, initially.
	+ *shuffle*: Whether to shuffle agents before each tick. Shuffling can be expensive for large number of agents, but can ensure properly randomised simulations.
 * Network options:
	+ *establishLinks*: Whether agents can establish links with each other.
	+ *chanceToJoinNetwork*: The likelihood of establishing a link when meeting another agent (values are between 0.0 and 1.0).
	+ *chanceToJoinNetworkWithHome*: The likelihood of establishing a link when meeting another agent, when the other agent has a home.
	+ *chanceToJoinNetworkWithBothHomes*: The likelihood of establishing a link when meeting another agent, when the other agent has a home.
	+ *chanceToFindPathToHome*: The likelihood of disrupting a random walk to find a path home.
	+ *chanceToFindPathToOtherAgentHome*: The likelihood of disrupting a random walk to find a path to another, linked agent's home.
 * Movement options:
	+ *noWater*: Agents cannot move across water.
	+ *noUphill*: Agents cannot go up hill.
	+ *visitHomeBuilding*: The likelihood of an agent travelling up, when visting their own home.
	+ *visitOtherBuilding*: The likelihood of an agent travelling up, when visting another agent's home. 
	+ *movementRelativeToPatch*: Whether the agent's movement should be calculated, relative to the current patch the agent is on.
	+ *movementInPatch*: The amount to multiply the agent's speed, relative to the size of the patch.
	+ *movementStrictlyIntercardinal*: Whether the agent's movement should be strictly cardinal (N/NE/E/SE/S/SW/W/NW). 
	+ *changeDirectionEveryTick*: Whether to recaculate the agent's movement, every tick.
	+ *perturbDirectionEveryTick*: Whether to perturb, or slightly adjust, the agent's movement, every tick.
 * Visualisation options:
	+ *useStickman*: Whether to use a 'stickman' image. Otherwise, use a circle.
	+ *size*: The size to draw the agent.
	+ *terrainOffset*: The amount to offset the agent from the underlying terrain.

### Building Options  {#configuring-buildings}

 * *create*: Whether agents can create buildings.
 * *maxNumber*: The maximum number of buildings the simulation can hold - for performance reasons.
 * *detectBuildingCollisions*: Whether new buildings should avoid existing buildings.
 * *detectRoadCollisions*: Whether new buildings should avoid existing roads.
 * Form
	+ *buildingForm*: The form building should take. Can be one of the following values: "rectangle", "octagon", "fivesided", "triangle", "concave".
	+ *randomForm*: Whether the building's form should be randomly assigned from one of the five values above.
	+ *spread*: How far apart buildings must be from eachother.
	+ *rotateRandomly*: Whether buildings should be rotated randomly.
	+ *rotateSetAngle*: Whether buildings should be positioned at a set angle.
	+ *destroyOnComplete*: Whether buildings should be destroyed, once created.
	+ *loopCreateDestroy*: Whether buildings should go in a loop of being created and destroyed.
 * Influences. Buildings will be created based on a calculation of likelihoods. The following parameters indicate the specific likelihood parameters.
	+ *roads*: The influence of a road on the construction of a new building.
	+ *water*: The influence of water on the construction of a new building.
	+ *otherBuildings*: The influence of other buildings on the construction of a new building.
	+ *distanceFromOtherBuildingsMin*: The minimum distance of other buildings must be to a new building.
	+ *distanceFromOtherBuildingsMax*: The maximum distance of other buildings must be to a new building.
	+ *buildingHeight*: The influence of other buildings of a certain height on the construction of a new building.
 * Dimensions
	+ *minHeight*: The minimum height of a building.
	+ *maxHeight*: The maximum height of a building.
	+ *heightA*: A building will have a maximum height it can aspire to, based on a given probability. *heightA* refers to the exponential factor in this calculation.
	+ *heightB*: A building will have a maximum height it can aspire to, based on a given probability. *heightB* refers to the additive factor in this calculation, which also constitutes the *minimum height*.
	+ *minWidth*: The minimum width of a building.
	+ *maxWidth*: The maximum width of a building.
	+ *minLength*: The minimum length of a building.
	+ *maxLength*: The maximum length of a building.
	+ *maxLevels*: The maximum number of levels of a building.
	+ *width*: A set width for buildings.
	+ *length*: A set length for buildings.
	+ *levelHeight*: The height of a level.
 * Viewing Parameters
	+ *useShader*: Whether to use shaders to render buildings.
	+ *useLevelOfDetail*: Whether to use level of detail for buildings, simplifying their representation at a distance.
	+ *highResDistance*: The distance at which to show the building in high resolution.
	+ *lowResDistance*: The distance at which to show the building in low resolution.
	+ *opacity*: The amount of opacity to show the building.
	+ Fill Parameters
		* *showFill*: Whether to show the walls of the building.
		* *fillRooves*: Whether to show the rooves of the building.
	+ Line Parameters
		* *showLines*: Whether to show the lines of the building.
		* *linewidth*: The width of the building line.
	+ Fill Parameters
		* *showWindows*: Whether to show the windows of the building.
		* *windowsRandomise*: Whether to randomise the appearance of windows.
		* *windowsFlickerRate*: The rate at which to change the appearance of windows.
		* *windowWidth*: The width of window segments.
		* *windowPercent*: The percentage of the overall window segment to fill with the window.
		* *windowsStartY*: The bottom of the window, relative to the wall.
		* *windowsEndY*: The top of the window, relative to the wall.
		* *windowsLine*: Whether to draw the line of the window.
		* *windowsFill*: Whether to fill in the window.
 * Stagger Parameters
	+ *stagger*: Whether to stagger the height of the building.
	+ *staggerAmount*: The amount to 'step' the stagger.
 * Taper Parameters
	+ *taper*: Whether to taper the stagger of the building. This results in a curved rather than regular stagger, according to random distribution drawn from an exponential sample.
	+ *taperExponent*: The exponential amount of the taper.
	+ *taperDistribution*: The distribution of the taper.
 * Animation
	+ *turning*: Whether buildings should be shown in a turning motion.
	+ *falling*: Whether buildings should be shown falling.
	+ *riseRate*: The rate at which buildings should fall.

### Road Options  {#configuring-roads}

 * *create*: Whether agents can build roads.
 * *maxNumber*: The maximum number of roads the simulation can hold  - for performance reasons.
 * *roadWidth*: The standard width of roads.
 * *roadDeviation*: The deviation of a road from the standard width.
 * *roadRadiusSegments*: The number of radial segments, giving greater defintion.
 * *roadSegments*: The number of length segments, also giving greater defintion.
 * *initialRadius*: The initial radius of roads.
 * *probability*: The likelihood a road will be constructed.
 * *lenMinimum*: The minimum length of a road.
 * *lenMaximum*: The maximum length of a road.
 * *lenDistributionFactor*: The distribution of road lengths.
 * *overlapThreshold*: A threshold determining the likelihood of roads overlapping.
 * *flattenAdjustment*: The amount to flatten the road 'tube'.
 * *flattenLift*: The amount to lift the road from the terrain.

### Terrain Options  {#configuring-terrain}

 * *renderAsSphere*: Whether to render the terrain as a sphere, instead of as a plane.
 * *loadHeights*: Whether to load heights; otherwise the terrain will be purely flat.
 * *gridExtent*: The extent, in width and length, of the grid.
 * *gridPoints*: The number of points to plot on the grid. Each point represents a specific height that could vary,
 * *maxTerrainHeight*: The maximum terrain height, against which all heights are normalised.
 * *shaderUse*: Whether to use the in-built terrain shader, which allows for different heights to use a blend of colour options.
 * *shaderShadowMix*: The amount to mix in shadows to the shader view.
 * *multiplier*: Multiplies the *gridExtent*, to stretch the terrain.
 * *mapIndex*: An index to the in-built list of maps (currently either 0 or 1).
 * *mapFile*: A URL to a specific map file, to use in place of the built-in maps.
 * *patchSize*: The size of the patch - in number of *gridPoints*.
 * *defaultHeight*: The default height of the terrain (can be offset from water, if shown).

### Display Options {#configuring-display}

 * *agentsShow*: Whether to render agents.
 * *buildingsShow*: Whether to render buildings.
 * *roadsShow*: Whether to render roads.
 * *waterShow*: Whether to render water, around the terrain.
 * *networkShow*:  Whether to render agent networks, if they are created - the *establishLink* option must be set for this option to have an effect.
 * *networkCurve*: Whether to use bezier curves for network connections between agents.
 * *networkCurvePoints*: The number of points to plot curves for connections between agents.
 * *patchesShow*: Whether to render patches.
 * *patchesUpdate*: Whether to update patches.
 * *trailsShow*: Whether to render trails, created by agents.
 * *trailsShowAsLines*: Whether to render trails as lines.
 * *trailsUpdate*: Whether to update trails.
 * *trailLength*: The length of trails - conditions the number of previous positions remembered by agents.
 * *cursorShow*: Whether to render a mouse cursor on the terrain.
 * *cursorShowCell*: Whether to render the mouse cursor as a 'cell' on the terrain.
 * *statsShow*: Whether to render the stats monitor.
 * *hudShow*: Whether to render the 'heads-up display'.
 * *guiControlsShow*: Whether to render the GUI control panel.
 * *wireframeShow*: Whether to render the building, roads and terrain using a wireframe connecting mesh points.
 * *dayShow*: Whether to render the simulation as a day rather than night.
 * *skyboxShow*: Whether to render the skybox for the day view.
 * *chartShow*: Whether to render the chart, displaying the simulation outputs.
 * *guiShow*: Whether to render the GUI control panel [duplicates the *guiControlsShow*?].
 * *pathsShow*: Whether to render paths traversed by agents.
 * *terrainShow*: Whether to render the terrain.
 * *lightHemisphereShow*: Whether to render the hemisphere light.
 * *lightDirectionalShow*: Whether to render the directonal light.
 * *coloriseAgentsByHealth*: Whether to render agent's health by colour (where red indicates low health. The alternative is to use opacity.
 * *firstPersonView*: Whether to use the first person view [**NOT WORKING CURRENTLY**].
 * *cameraOverride*: Whether to use custom camera settings.
 * *cameraX*: If *cameraOverride* is true, the X position of the camera. 
 * *cameraY*: If *cameraOverride* is true, the Y position of the camera.
 * *cameraZ*: If *cameraOverride* is true, the Z position of the camera.
 * *maximiseView*: Whether to maximise the screen.
 * Folder Options:
	+ *guiShowControls*: Whether to render the GUI controls (*Setup*, *Run*, etc.).
	+ *guiShowAgentFolder*: Whether to render the GUI agent folder and options.
	+ *guiShowBuildingsFolder*: Whether to render the GUI building folder and options.
	+ *guiShowRoadsFolder*: Whether to render the GUI roads folder and options.
	+ *guiShowTerrainFolder*: Whether to render the GUI terrain folder and options.
	+ *guiShowDisplayFolder*: Whether to render the GUI display folder and options.
	+ *guiShowColorFolder*: Whether to render the GUI colour folder and options.

### Colour Options  {#configuring-colour}

 * Terrain Colors
	+ *colorDayTerrainGroundLevel*: The colour of the terrain at sea level during the day. 
	+ *colorNightTerrainGroundLevel*: The colour of the terrain at sea level during the night.
	+ *colorDayTerrainLowland1*: The colour of the terrain on lowlands (level 1) during the day.
	+ *colorNightTerrainLowland1*: The colour of the terrain on lowlands (level 1) during the night.
	+ *colorDayTerrainLowland2*: The colour of the terrain on lowlands (level 2) during the day.
	+ *colorNightTerrainLowland2*: The colour of the terrain on lowlands (level 2) during the night.
	+ *colorDayTerrainMidland1*: The colour of the terrain on midlands (level 1) during the day.
	+ *colorNightTerrainMidland1*: The colour of the terrain on midlands (level 1) during the night.
	+ *colorDayTerrainMidland2: The colour of the terrain on midlands (level 2)  during the day.
	+ *colorNightTerrainMidland2*: The colour of the terrain on midlands (level 2) during the night.
	+ *colorDayTerrainHighland*: The colour of the terrain on highlands during the day.
	+ *colorNightTerrainHighland*: The colour of the terrain on highlands during the night.
	+ *colorTerrainStop1*: The proportion of *maxTerrainHeight* at which to transition from sea level to lowlands (level 1).
	+ *colorTerrainStop2*: The proportion of *maxTerrainHeight* at which to transition from lowlevel (level 1) to lowlands (level 2).
	+ *colorTerrainStop3*: The proportion of *maxTerrainHeight* at which to transition from lowlands (level 2) to midlands (level 1).
	+ *colorTerrainStop4*: The proportion of *maxTerrainHeight* at which to transition from midlands (level 1) to midlands (level 2).
	+ *colorTerrainStop5*: The proportion of *maxTerrainHeight* at which to transition from midlands (level 2) to highlands.
	+ *colorTerrainOpacity*: The opacity of the terrain colours (low values will make the terrain "see through").
 * Building Colours
	+ *colorDayBuildingFill*: The color of building walls during the day.
	+ *colorNightBuildingFill*: The color of building walls during the night.
	+ *colorDayBuildingLine*: The color of building lines during the day.
	+ *colorNightBuildingLine*: The color of building lines during the night.
	+ *colorDayBuildingWindow*: The color of building windows during the day.
	+ *colorNightBuildingWindow*: The color of building windows during the night.
 * Graph Colours
	+ *colorGraphPopulation*: The colour of the *first* graphed line (defaults to the simulation's *agent population*).
	+ *colorGraphHealth*: The colour of the *second* graphed line (defaults to the simulation's *agent mean health*).
	+ *colorGraphPatchValues*: The colour of the *second* graphed line (defaults to the simulation's *patches' mean value*).
 * Lighting Colours
	+ *colorLightHemisphereSky*: The sky colour of the hemisphere light.
	+ *colorLightHemisphereGround*: The ground colour of the hemisphere light.
	+ *colorLightHemisphereIntensity*: The intensity of the hemisphere light.
	+ *colorLightDirectional*: The colour of the directional light.
	+ *colorLightDirectionalIntensity*: The intensity of the directional light.
 * Other Colours
	+ *colorDayBackground*:  The color of the world background during the day.
	+ *colorNightBackground*: The color of the world background during the night.
	+ *colorDayRoad*: The color of roads during the day.
	+ *colorNightRoad*: The color of roads during the night.
	+ *colorDayAgent*: The color of agents during the day.
	+ *colorNightAgent*: The color of agents during the night.
	+ *colorDayNetwork*: The color of agent networks during the day.
	+ *colorNightNetwork*: The color of agent networks during the night.
	+ *colorDayTrail*: The color of agent trails during the day.
	+ *colorNightTrail*: The color of agent trails during the night.
	+ *colorDayPath*: The color of agent paths during the day.
	+ *colorNightPath*: The color of agent paths during the night.


Some simulations also include additional options that adjust the behaviour of their particular model.




## Customising the Code {#customising-code}

### Basic usage {#basic-usage}

To include the default configuration of *Fierce Planet*, a page needs to add:

 - The *fp.css* style sheet
 - A reference to Require that loads the Fierce Planet *app* script
 - A *div* element with a *container* id.

```

<html>
	<head>
		<title>Fierce Planet</title>
		<link rel="stylesheet" type="text/css" href="/css/fp.css">
		<script data-main="/js/app" src="/js/require.js"></script>
	</head>
	<body>
		<div id="container"></div>
	</body>
</html>

```


[Open in a new window](examples/usage/basic.html)



### Creating maps {#creating-maps}

New maps can be added to the simulations by downloading Digital Elevation 
Maps (DEMs).

To add 1 Arc-Second (30m) resolution terrains, first create a headless heightmap to load into the simulation:

1. Visit http://earthexplorer.usgs.gov/ (register if necessary)
	- Enter search criteria (e.g. "Sydney")
	- Customise coordinates to fit desired region
	- Click the "Data Sets" button 
	- Expand "Digital Elevation"
	- Expand "SRTM"
	- Select "SRTM 1 Arc-Second Global"
	- Click "Results"
	- Download *all* of the resulting tiles in GeoTIFF format
2. To merge the downloaded files (if e.g. 4 tiles are downloaded):

~~~~ {.zsh}
	gdal_merge.py -o Sydney.tif s34_e150_1arc_v3.tif s34_e151_1arc_v3.tif s35_e150_1arc_v3.tif s35_e151_1arc_v3.tif
~~~~


3. Check the resulting merged tif file.
4. Obtain the dimensions of the merged tif file:


~~~~ {.zsh}
	gdalinfo Sydney.tif
~~~~


5. Select a sample of the resulting tif. 
	If the file is 7201 x 7201 pixels, and the desired region is a square offset by 25% on the x axis and 12.5% on the y axis


~~~~ {.zsh}
	gdal_translate -srcwin 1800 900 3601 3601 Sydney.tif Sydney-local.tif
~~~~


6.  Then to translate to a header-less heightmap file of appropriate scale, where '1000' is in metres, and '65535' represents the maximum value of 2 bytes.


~~~~ {.zsh}
	gdal_translate -scale 0 1000 0 65535 -ot UInt16 -outsize 900 900 -of ENVI Sydney-local.tif Sydney-local.bin
~~~~



<!--
Here's some math:

$f(x)=\sum_{n=0}^\infty\frac{f^{(n)}(a)}{n!}(x-a)^n$   

-->

