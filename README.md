% Fierce Planet


# Fierce Planet

[Fierce Planet](http://www.fierce-planet.com) is an open source toolkit for developing agent-based models, with a particular focus on urban and social simulations.

It runs on [Node.js](http://nodejs.org) on the server, and uses 
[Three.js](http://threejs.org) extensively to generate 3D simulations in the browser. [Click here](https://get.webgl.org/) to check your browser is compatible.

For more information, please visit:

 - [Fierce Planet](http://www.fierce-planet.com)
 - [GitHub](https://github.com/liammagee/fp.git)


## Running *Fierce Planet*

To run Fierce Planet locally:

 - Clone the [repository](https://github.com/liammagee/fp.git)
 - Ensure the following dependencies are installed:
    * [Node](http://nodejs.org)
    * [Gulp](http://gulpjs.com/)
 - Then run:

   cd fp
   npm install
   gulp dist
   node app.js

 - You should then be able to visit <http://localhost:3000> to view the example and built-in project simulations.


In addition, a number of other commands can be run using [gulp](http://gulpjs.com/):


### Building the source

To generate code documentation, run:

    gulp require


### Generating code docs

To generate code documentation, run:

    gulp jsdoc


### Generating the website 

To convert the HTML website content from the [Markdown](http://daringfireball.net/projects/markdown/) docs:

    gulp pandoc-site


### Running Babel to convert ES6 code to ES5

A small amount of code currently uses [ES6](https://github.com/lukehoban/es6features) for convenience. To convert this code to *ES5*, run:

    gulp babel-shader


## Code Layout

The code includes the following

 - *docs*: The text content of the website, in [Markdown](http://daringfireball.net/projects/markdown/) format.
 - *public*: All assets (HTML, JavaScript, stylesheets, images, etc.) needed to run *Fierce Planet*.
 - *public/js/fp*: The source code for running *Fierce Planet* simulations.
 - *public/examples*: Examples of how *Fierce Planet* can be configured.
 - *public/projects*: Project that use and extend *Fierce Planet*.


## Configuration

*Fierce Planet* can be configured to support a range of different scenarios.

Configuration options can be set in two ways:

 - Via the control panel, visible when running *Fierce Planet*.
 - In code, through *config* object passed to the *init* function of the *Simulation* object.

The following are a partial list of these options:

 - **Agent Options**
     + *initialPopulation*: The initial number of agents populating the simulation.
     + *initialX*: The *x* co-ordinate of the point of origin around which agents are initially generated, expressed as a percentage (0 - 100) of distance from the actual grid center.
     + *initialY*: The *y* co-ordinate of the point of origin  around which agents are initially generated, expressed as a percentage (0 - 100) of distance from the actual grid center.
     + *initialExtent*: The *initial* extent, or diameter, around the point of origin, where agents can be generated, expressed as a percentage (0 - 100).
     + *maxExtent*: The *maximum* extent, or diameter, around the point of origin, where agents can be generated, expressed as a percentage (0 - 100).
     + *randomAge*: Whether the agent's age is randomly set, initially.
     + *chanceToJoinNetwork*:
     + *chanceToJoinNetworkWithHome*: 
     + *chanceToJoinNetworkWithBothHomes*: 
     + *chanceToFindPathToHome*: 
     + *chanceToFindPathToOtherAgentHome*: 
     + *initialCircle*: 
     + *noWater*: 
     + *noUphill*: 
     + *useStickman*: 
     + *visitHomeBuilding*: 
     + *visitOtherBuilding*: 
     + *establishLinks*: 
     + *size*: 
     + *terrainOffset*: 
     + *shuffle*: 
     + *initialSpeed*: 
     + *initialPerturbBy*: 
     + *movementRelativeToPatch*: 
     + *movementInPatch*: 
     + *movementStrictlyIntercardinal*: 
     + *changeDirectionEveryTick*: 
     + *perturbDirectionEveryTick*: 
 - **Building Options**
     + *create*:
     + *maxNumber*:
     + *heightA*:
     + *heightB*:
     + *roads*:
     + *water*:
     + *otherBuildings*:
     + *distanceFromOtherBuildingsMin*:
     + *distanceFromOtherBuildingsMax*:
     + *buildingHeight*:
     + *buildingForm*:
     + *spread*:
     + *randomForm*:
     + *rotateRandomly*:
     + *rotateSetAngle*:
     + *destroyOnComplete*:
     + *loopCreateDestroy*:
     + *turning*:
     + *falling*:
     + *riseRate*:
     + *minHeight*:
     + *maxHeight*:
     + *minWidth*:
     + *maxWidth*:
     + *minLength*:
     + *maxLength*:
     + *maxLevels*:
     + *width*:
     + *length*:
     + *levelHeight*:
     + *useShader*:
     + *useLevelOfDetail*:
     + *highResDistance*:
     + *lowResDistance*:
     + *opacity*:
     + *showFill*:
     + *fillRooves*:
     + *showLines*:
     + *linewidth*:
     + *showWindows*:
     + *windowsRandomise*:
     + *windowsFlickerRate*:
     + *windowWidth*:
     + *windowPercent*:
     + *windowsStartY*:
     + *windowsEndY*:
     + *windowsLine*:
     + *windowsFill*:
     + *stagger*:
     + *staggerAmount*:
     + *taper*:
     + *taperExponent*:
     + *taperDistribution*:
     + *detectBuildingCollisions*:
     + *detectRoadCollisions*:
 - **Road Options**
     + *create*:
     + *maxNumber*:
     + *roadWidth*:
     + *roadDeviation*:
     + *roadRadiusSegments*:
     + *roadSegments*:
     + *initialRadius*:
     + *probability*:
     + *lenMinimum*:
     + *lenMaximum*:
     + *lenDistributionFactor*:
     + *overlapThreshold*:
     + *flattenAdjustment*:
     + *flattenLift*:
 - **Terrain Options**
     + *renderAsSphere*:
     + *loadHeights*:
     + *gridExtent*:
     + *gridPoints*:
     + *maxTerrainHeight*:
     + *shaderUse*:
     + *shaderShadowMix*:
     + *multiplier*:
     + *mapIndex*:
     + *mapFile*:
     + *patchSize*:
     + *defaultHeight*:
 - **Display Options**
     + *agentsShow*:
     + *buildingsShow*:
     + *roadsShow*:
     + *waterShow*:
     + *networkShow*:
     + *networkCurve*:
     + *networkCurvePoints*:
     + *patchesShow*:
     + *patchesUpdate*:
     + *trailsShow*:
     + *trailsShowAsLines*:
     + *trailsUpdate*:
     + *trailLength*:
     + *cursorShow*:
     + *cursorShowCell*:
     + *statsShow*:
     + *hudShow*:
     + *guiControlsShow*:
     + *wireframeShow*:
     + *dayShow*:
     + *skyboxShow*:
     + *chartShow*:
     + *guiShow*:
     + *guiShowControls*:
     + *guiShowAgentFolder*:
     + *guiShowBuildingsFolder*:
     + *guiShowRoadsFolder*:
     + *guiShowTerrainFolder*:
     + *guiShowDisplayFolder*:
     + *guiShowColorFolder*:
     + *pathsShow*:
     + *terrainShow*:
     + *lightHemisphereShow*:
     + *lightDirectionalShow*:
     + *coloriseAgentsByHealth*:
     + *firstPersonView*:
     + *cameraOverride*:
     + *cameraX*:
     + *cameraY*:
     + *cameraZ*:
     + *maximiseView*:
 - **Colour Options**
     + *colorDayBackground*:
     + *colorDayRoad*:
     + *colorDayAgent*:
     + *colorDayNetwork*:
     + *colorDayTrail*:
     + *colorDayPath*:
     + *colorDayBuildingFill*:
     + *colorDayBuildingLine*:
     + *colorDayBuildingWindow*:
     + *colorNightBackground*:
     + *colorNightRoad*:
     + *colorNightAgent*:
     + *colorNightNetwork*:
     + *colorNightTrail*:
     + *colorNightNetworPath*:
     + *colorNightPath*:
     + *colorNightBuildingFill*:
     + *colorNightBuildingLine*:
     + *colorNightBuildingWindow*:
     + *colorGraphPopulation*:
     + *colorGraphHealth*:
     + *colorGraphPatchValues*:
     + *colorLightHemisphereSky*:
     + *colorLightHemisphereGround*:
     + *colorLightHemisphereIntensity*:
     + *colorLightDirectional*:
     + *colorLightDirectionalIntensity*:
     + *colorDayTerrainGroundLevel*:
     + *colorDayTerrainHighland*:
     + *colorDayTerrainLowland1*:
     + *colorDayTerrainLowland2*:
     + *colorDayTerrainMidland1*:
     + *colorDayTerrainHighland*:
     + *colorNightTerrainGroundLevel*:
     + *colorNightTerrainLowland1*:
     + *colorNightTerrainLowland2*:
     + *colorNightTerrainMidland1*:
     + *colorNightTerrainMidland2*:
     + *colorNightTerrainHighland*:
     + *colorTerrainStop1*:
     + *colorTerrainStop2*:
     + *colorTerrainStop3*:
     + *colorTerrainStop4*:
     + *colorTerrainStop5*:
     + *colorTerrainOpacity*:


Some simulations also include additional options that adjust the behaviour of their particular model.


