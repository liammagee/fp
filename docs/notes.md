% Fierce Planet Redesign
% Liam Magee
% 20 June, 2014

<!--
v1.0: 4 July, 2014
-->


# Overview


# Components

## World

### Time

 - *Origin time* ($t_0$)
 - *Time increment* ($i$)
 - *End time* ($t_n$)
 - *Current time* ($t_i = t_0 + i$)

*Origin time* defaults to **0**; *Time increment* to **1**; *End time* to **infinity**.


### Space

Uses a grid structure with:

 - *Width*
 - *Height*
 - *Cell* (depends on cell size)
 - *Terrain*


#### Notes:

 - Terrain extracted from SRTM (see addendum below).
 - [SRTM3 Dimensions](http://dds.cr.usgs.gov/srtm/version2_1/Documentation/Quickstart.pdf)
     + Each tile is a 3-arc second
     + 1201x1201 pixels
     + Each pixel is 90m (tile = 108,090m = 108km^2^)
 - DECISION: Needs to re-rendered in world as 4km^2^? Too big, the world is unnavigable (and unrenderable - though check with Unreal)



## Cell

 - Each cell to represent a square (rectangular?) habitable 'block'. Approx 100m^2^. (Consult urban planning literature for more details - 
[insula](http://en.wikipedia.org/wiki/Urban_planning)).
 - World therefore has 1600 patchs (= (4000 / 100)^2^).
 - Cells have a series of heightmaps (corresponding to imported terrain). 
 - If average heightmap is below 1m, it is assumed to be **water**.
 - ASSUMPTION: For now, no other natural features (e.g. trees)

Further notes:

 - See Unreal / Unity docs on terrain for better terminology.



## Agents

 - A **World** has  $\{0,...,m\}$ Agents 
 - Agents are (humanoid?) objects that exhibit (minimally):
     + [Life](#life)
     + [Spatiality](#spatiality)
     + [Motility](#motility)
 
 - Might also have:
     + [Vitality](#vitality)
     + [Relationality](#relationality)
     + [Physicality](#physicality)
     + [Mind](#mind)
         * [Cognition](#cognition)
         * [Affect](#affect)
         * [Conation](#conation)



### Life {#life}
 
 - *Birth*: year (month and day?) or $b = t_x$
 - *Death*: year (month and day?) or $d = t_y$ 
 - *Life elapsed* ($d - b$)
 - *Alive* ($t_i > b \&\& t_i < d$)



### Spatiality {#spatiality}

For rendering purposes, agents have three-dimensional spatial extension.

 - *Position*
 - *Rotation*
 - *Scale*

In common rendering environments, these are represented by:

---------------------------------------
Unreal                Unity 4
Editor
-----------------     -----------------
Position              Position
Rotation              Rotation
Scale                 Scale
-----------------     -----------------

This should further relate to [place](#place).



### Motility {#motility}


**Notes:**

 - Spontaneous movement (with or without a Goal)
 - Movement is in 3 dimensional space (has X, Y, Z co-ordinates)
 - Examine *direct* (XYZ-transforms) vs *indirect* (using game engine physics, forces - preferred but semi-deterministic?)
 
TODO:
 - Examine AI movement algoriths (e.g. A^*^ in **Unity**)


### Relationality {#relationality}

 - *Mother* ($mother$)
 - *Father* ($father$)
 - *Children* ($children_{1..m}$)
 - *Friends* ($friends_{1..n}$)

Consider 1st class *Relation*:
 - Kinds of relations:
     + Bonding
     + Bridging
 - Type (one of: {familial, professional, social}?)
 - Strength
 - Duration
 - Frequency

[NOTE: **Just** modelling relations would be of interest.]


### Mind {#mind}

*An Overview of the Conative Domain* [@huitt2005overview]:

> Psychology has traditionally identified and studied three components of mind: cognition, affect, and conation (Hilgard, 1980; Huitt, 1996; Tallon, 1997). 

> Cognition refers to the process of coming to know and understand; of encoding, perceiving, storing, processing, and retrieving information. It is generally associated with the question of “what” (e.g., what happened, what is going on now, what is the meaning of that information.) 

> Affect refers to the emotional interpretation of perceptions, information, or knowledge. It is generally associated with one’s attachment (positive or negative) to people, objects, ideas, etc. and is associated with the question “How do I feel about this knowledge or information?” 

> Conation refers to the connection of knowledge and affect to behavior and is associated with the issue of “why.” It is the personal, intentional, planful, deliberate, goal-oriented, or striving component of motivation, the proactive (as opposed to reactive or habitual) aspect of behavior (Baumeister, Bratslavsky, Muraven & Tice, 1998; Emmons, 1986). Atman (1987) defined conation as “vectored energy: i.e., personal energy that has both direction and magnitude” (p. 15). It is closely associated with the concepts of intrinsic motivation, volition, agency, self-direction, and self-regulation (Kane, 1985; Mischel, 1996). 

 - Relates to behaviour and action?


#### Cognition / Belief {#cognition}

Refers to the general possesion of *cognition*. 

- *Memory* ($memories_{1..n}$)
- *Reasoning* [cf. [Ontology](#ontology)]

In *BDI* frameworks, this corresponds to *Beliefs*?

TODO: *Reasoning* implies separate logical thread for computation?



##### Memory / Belief

- *Subject*
- *Predicate*
- *Object*. Can be one of: 
    + *Agent*
    + *Place*
- *Date*
- *Strength* of memory or belief



#### Affectivity / Desire {#affectivity}

Refers to the emotional affects experienced. In *BDI* frameworks, this corresponds to *Desires*.

- *Affect* (from range of emotional states?)

In *BDI* frameworks, this corresponds to *Desires*?



#### Conation / Intention {#conation}

Refers to the proactive intention to accomplish a *Goal*, based on a series of planned *Actions*, to satisfy a *Desire* based on current *Beliefs*.

- *Plans* (from range of emotional states?)

In *BDI* frameworks, this corresponds to *Intentions* (or both *Desires* and *Intentions*)?


##### Plan

- *Goal* 
- *Action* ($actions_{1..n}$)


##### Goal

Achieved when:

- Some change in the world is effected
    + Change in state, position... of an *Object*
- Some *Belief* is modified?
- Some *Desire* is satisfied
- Some *Intention* is carried out


##### Action

One of:

- *Movement Act*
- *Speech Act*

- Exercises a *Capability*

###### Movement Act

### Physicality {#physicality}

Includes:
 - *Shape*
 - *Color*

TODO: UNSPECIFIED - relate to  Unreal/ Unity properties


---------------------------------------
Unreal                Unity 4
Editor
-----------------     -----------------
TBD
-----------------     -----------------


## Social Systems {#social_system}


### Institutions {#institutions}

 - Law
     + Legislative
     + Judicial
     + Executive
 - Economy
 - Governance
 - Knowledge
     + Science
     + Culture



#### Legal

Wikipedia links:
 - [Legal doctrine](http://en.wikipedia.org/wiki/Legal_doctrine)
 - [Constitutionalism](http://en.wikipedia.org/wiki/Constitutionalism)


### Technoscience

#### Explaining technoscience as a concept



#### Categories

 - Power
 - Building
 - 

#### History


 - Steam power
 - 


## Place {#place}

- *Name*
- *Location*
- *Extent*
    + *Width*
    + *Height*
- *Designation*, one of {*Home*, *Neighbourhood*, *City* or *District*, *Region*, *Country*}


## Cultures {#culture}

- *Name*
- Set of *Capabilities* ($capabilities_{1..n}$)



## Institutions

- *Name*
- *Location*
- *Type* (one of: )




## Built environment

 - Patches can have $\{0,...,n\}$ Buildings.
 - Patches can have Roads, Alleys, Pavements


### Urban morphology


#### Links

Wikipedia:

 - [Wikipedia:Urban Morphology](http://en.wikipedia.org/wiki/Urban_morphology)
 - [Wikipedia:Urban area](http://en.wikipedia.org/wiki/Urban_area)
 - [Global City](http://en.wikipedia.org/wiki/Global_City)
 - [Index of urban studies articles](http://en.wikipedia.org/wiki/Index_of_urban_studies_articles)

General:

 - [Google Images](https://www.google.com.co/search?q=urban+morphology&espv=2&biw=1018&bih=557&tbm=isch&tbo=u&source=univ&sa=X&ei=aEavU_2GE8Ss0QXk-oDoAg&ved=0CDUQsAQ)
 - [Urban Morphology & Complex Systems Institute](http://www.urbanmorphologyinstitute.org/)
     + [Papers](http://www.urbanmorphologyinstitute.org/research/papers/)
 - [International Seminar on Urban Form / Urban Morphology Journal](http://urbanmorphology.org/)
 - [Emergent Urbanism](http://emergenturbanism.com/)
 - [Historic Cities Rules](http://historiccitiesrules.com/)
 - [Pattern Language](http://www.patternlanguage.com/)
 - [Carfree](http://carfree.com/)
 - [Human Transit](http://www.humantransit.org/)
 - [Katarxis](http://katarxis3.com/)
 - [International Network for Traditional Building, Architecture & Urbanism](http://intbau.org/)
 - [KunstlerCast](http://kunstlercast.com/)
 - [Nikos A. Salingaros](http://zeta.math.utsa.edu/~yxk833/)
 - [Project for Public Spaces](http://www.pps.org/)
 - [Wolfram Science](http://wolframscience.com/)
 - [The Codes Project](http://codesproject.asu.edu/)
 - [ESRI](http://www.esri.com/software/cityengine)
 - [Space Syntax Network](http://www.spacesyntax.net/)
 - [Laboratoire de Recherche del l'Ecole Nationale Superieure d'Architecture de Versailles](http://leav.versailles.archi.fr/#/equipes-de-recherche/axes-de-recherche-2014-2019/%C3%A9nergie-climat-environnement)
 - [Institut der Stadtbaukunst (A Forum for Architecture and Urban Design)](http://www.stadtbaukunst.org/english/institute/index.html)
     + [Publications](http://www.stadtbaukunst.org/english/texts-about-urban-design/index.html)
 - [New Urbanism](http://www.newurbanism.org/)
 - Amazon
     + Serge Salat: [Cities and Forms: On Sustainable Urbanism](http://www.amazon.com/Cities-Forms-On-Sustainable-Urbanism/dp/2705681116)
     + Spiro Kostof: [The City Assembled: The Elements of Urban Form Through History](http://www.amazon.com/The-City-Assembled-Elements-Through/dp/0821219308/ref=pd_sim_b_1?ie=UTF8&refRID=19Z04ZAV2K0Z7784G86A)
     + Lydia Otero: [La Calle: Spatial Conflicts and Urban Renewal in a Southwest City](http://www.amazon.com/La-Calle-Spatial-Conflicts-Southwest/dp/0816528888/ref=pd_sim_b_4?ie=UTF8&refRID=0GDA25RHFDPF2QQDMR0C)
     + [The Battle for the Life and Beauty of the Earth: A Struggle Between Two World-Systems](http://www.amazon.com/Battle-Life-Beauty-Earth-World-Systems/dp/0199898073/ref=la_B000AQ4JVU_1_3?ie=UTF8&qid=1369782219&sr=1-3)
     + [Carfree Design Manual](http://www.amazon.com/Carfree-Design-Manual-J-Crawford/dp/9057270609/ref=pd_sim_b_1?ie=UTF8&refRID=0R5CVQM8RRWQ5SM5QDM1)
     + [Carfree Cities](http://www.amazon.com/exec/obidos/ASIN/9057270420/)
     + [Human Transit: How Clearer Thinking about Public Transit Can Enrich Our Communities and Our Lives](http://www.amazon.com/Human-Transit-Clearer-Thinking-Communities-ebook/dp/B008LVR1KM/ref=tmm_kin_title_0?ie=UTF8&qid=1402344064&sr=1-1)

Authors:

 - Lewis Mumford
 - Peter Hall
 - Michael Batty
 - Saskia Sassen
 - Jan Gehl
 - Serge Salat
 - Nikos A. Salingaros
 - Spiro Kostof
 - Patrick Geddes



#### Links

 - [Houdini Engine for Unity](http://vimeo.com/88794901)
 - [Procedural Building Implementations](http://vterrain.org/Culture/BldCity/Proc/)



#### Procedural Building

 - ASSUMPTION: Buildings should be procedurally generated.


For `Fierce Planet`, procedural building should develop a pseudo-realistic urban environment.

Procedure:

 - Has floor, ceiling, walls, levels (staircases between them)
 - Quality of construction
 - Rendering (textures, materials)


##### v1

We assume:

 - $1..m$ motile *Agents* ($Agents$)
 - $1..n$ *Buildings* ($Buildings$)
 - some *World* with *Terrain* with suitable heightmap characterstics for building
 - A *Centre point* ($Origin = {x, y}$) (based on the origin of the world)
 - a series of rectangular *Cells* (determined by *World* patch size)
 - a $WorldRadius$, the distance from the world to the boundaries

Then we calculate, for any given $cell$, the likelihood of growing a building at time $t$:

 - Whether agents exist in the cell at $t$: $\sum(agents_{cell_t}) > 0$
 - The Euclidean distance ($RelativeEd$) of the cell from the origin, relative to the boundary ($WorldRadius$)
 - The building-to-agent ratio ($baRatio$) of the *World*
 - The chance to build as a product of the Euclidean distance and 1 minus the ratio ($ChanceToBuild = RelativeEd (1 - baRatio)$)


In Ruby pseudo-code:

```ruby

agents_at_cell = cell.agents.length
if (agents_at_cell > 0) 
    ed = (cell.x - origin.x + cell.y - origin.y).abs
    relative_ed = (euclidean_distance / world_radius).abs
    ba_ratio = buildings.length / agents.length
    chance_to_build = relative_ed * (1 - ba_ratio)
end
if (rand() < chance_to_build)
    createBuilding()
end

```



##### v2: An agent-based procedural city engine

 - Focus on modularity - different urban forms & morphologies
 - Types:
    + Chaotic
    + Geometric
 - Principles:
     + Respect geography:
         * Terrain gradient
         * Sea level
         * Ground surface - habitable status indicator?
             - Rock
             - Forest
             - Field
             - Marsh
             - Wetlands
             - Desert
         * Proximity to necessities:
             - Water
             - Food
     + Construction technologies
         * Materials
             - Timber (and quality)
             - Metals
         * Tools
         * Know-how (design)
         * Cultural preferences
 - Agent activity
     + Repeated traversal: creates pathways, trails, roads
     + Evolutionary movement - improved strategies
 - Vehicles - technology







###### References

 - [Procedural City, Part 1: Introduction](http://www.shamusyoung.com/twentysidedtale/?p=2940)
 - [How to Do a Procedural City in 100 Lines](http://learningthreejs.com/blog/2013/08/02/how-to-do-a-procedural-city-in-100lines/)
 - [Procedural Modeling of Cities](http://graphics.ethz.ch/Downloads/Publications/Papers/2001/p_Par01.pdf)
 - [](http://www.vision.ee.ethz.ch/~pmueller/documents/procedural_modeling_of_cities__siggraph2001.pdf)


## Statistics

Minimally must consider:

 - Net Migration
     + Immigration
     + Emigration
 - Life expectancy
 - Fertility rates
 - Child morbidity

Also consider DBPedia sources (TODO: what are common spatial fields?).

### Indicators

 - [Global City](http://en.wikipedia.org/wiki/Global_City)
     + GaWC
     + Global Cities Index
     + Global Economic Power Index
     + Global Power City Index
     + The Wealth Report
     + Global City Competitiveness Index





#### Landscape 

 - [Landscape Materials](https://docs.unrealengine.com/latest/INT/Engine/Landscape/Materials/index.html#landscape-specificmaterialnodes)
 - [Landscape and Textures](https://forums.epicgames.com/threads/915737-Landscape-and-Textures)
 - [Sizes and Height Guide](https://wiki.unrealengine.com/Landscape_-_Sizes_and_Height_Guide)
 - [Terrain Alphamaps](http://udn.epicgames.com/Three/TerrainAlphamaps.html)
 - [Heightmap DTM Landscape Formats](https://forums.unrealengine.com/showthread.php?3884-Heightmap-DTM-Landscape-Formats)
 - [Using DEM data to create height maps](http://scrawkblog.com/2013/02/05/using-dem-data-to-create-height-maps/)
 - [Importing DEM into World Machine](http://forum.world-machine.com/index.php?topic=1299.0)
 - [WORLD MACHINE USERS GUIDE ](http://www.world-machine.com/World%20Machine%20Help.pdf)
 - [My Workflow for Creating Terrain](https://forums.unrealengine.com/showthread.php?1265-Tutorial-My-Workflow-for-Creating-Terrain)
 - [Unreal Engine - Getting World Machine Terrains in your game!](https://www.youtube.com/watch?v=K9WTKK9f1b8)
 - [Unreal Engine 4: Terrains with World Machine & Material Function Tutorial](https://www.youtube.com/watch?v=4SQPzgzAsfI)
 - [Using Weightmaps to texture a Landscape](https://wiki.unrealengine.com/Using_Weightmaps_to_texture_a_Landscape)
 - [Landscape Tool](https://wiki.unrealengine.com/Landscape_Tool_-_Video)
 - [World Machine](http://www.world-machine.com/about.php?page=features)



```

gdal_translate -scale 0 2470 0 255 -outsize 200 200 -of PNG syd2.tif syd.png

gdal_translate -scale 0 400 0 65535 -ot UInt16 -outsize 1601 1601 -of ENVI syd2.tif syd2.bin

```



### World Machine



## Artwork

 - [Game Textures](http://gametextures.com)


## Interface Design

### Inputs

#### Setup inputs:

 - Social
     + Population
     + Immigration / emigration / net migration rates
     + Fertility rate
 - Geography
     + Terrain
     + Settlement area (bounds)


#### Simulation Actions:

 - Load world
 - Play / Pause
 - Restart
 - Step


#### Viewing Actions:

 - Zoom
 - Pan
 - View (Agent / Top / Isometric)


#### Visibility toggles:

 - Landscape
 - Agents
 - Agent trails
 - Buildings - built environment
 - Networks
 - Cells
 - Grid


#### Interactions:

 - Rate of Time


#### Built Environment:

Components:

 - Stocks
     + Building types:
         * Housing
         * Transport
         * Environment
         * Health
         * Finance
         * Commerce
         * Governance
         * Sport
         * Education
         * Culture
 - Flows (movement)
     + Human transport
         * Roads
             - Lanes
             - Streets
             - Major roads
             - Freeways
             - Highways
         * Paths
             - Walking
             - Bike
         * Nature strips
         * Gutters
         * Drains
         * Car parks
         * Train lines
         * Tram lines
         * Busways
         * Bridges
         * Tunnels
         * Overpasses
         * Roundabouts
         * Stops, stations
     + Other transport
         * Waterways
         * Drains
         * Sewers
         * Power lines
         * Water pipes
         * Telecommunication cables

Distinctions:

 - Ownership
     + Public
     + Private
 - Conditions of construction
     + Financial capital availability
     + Technological capacity
     + Demand
     + Regulatory framework
     + Legacy environment


### Output

 - Number of Agents (Population)
 - Average life of agents (Longevity)
 - Population density
 - Immigration / emigration / net migration
 - Fertility rate
 - Size of network
 - Number of buildings (housing capacity?)

Hypothetical outputs:

 - Environmental sustainability
 - Diversity
 - Economic output
 - Political stability






# Addenda



## Generating this document

To generate HTML of this guide:

<!-- ../js/MathJax/unpacked/MathJax.js -->

    pandoc -s -S --toc --toc-depth=2 --mathjax --bibliography=fp.bib --template=templates/bootstrap --css=../css/pandoc-bootstrap.css notes.md -o output/notes.html && open output/notes.html

To generate a PDF of this guide:

    pandoc -s -S --toc --bibliography=fp.bib notes.md -o output/notes.pdf && open output/notes.pdf




### Relevant references

 - [WikiBooks:LaTeX/Mathematics](http://en.wikibooks.org/wiki/LaTeX/Mathematics)
 - [Pandoc](http://johnmacfarlane.net/pandoc/README.html)
 - [Bootstrap](http://getbootstrap.com/)
     + [Components](http://getbootstrap.com/components/)
 - [MathJax](http://www.mathjax.org/)

General document editing links:
 - [Blogging with math](http://drz.ac/2013/01/03/blogging-with-math/)
 - [markdown target=“_blank”](http://stackoverflow.com/questions/4425198/markdown-target-blank)


## Importing tile maps into 3D Engines

Reference:

 * [Importing DEM into Unity](http://alastaira.wordpress.com/2013/11/12/importing-dem-terrain-heightmaps-for-unity-using-gdal/)
 * [Unity Notes](http://forum.unity3d.com/threads/23851-importing-real-maps-(DEMs)-into-unity) 

Download `GDAL` utilities:

 * [General](http://trac.osgeo.org/gdal/wiki/DownloadingGdalBinaries)
 * [Mac](http://www.kyngchaos.com/software:frameworks)
 * [GDAL Docs](http://www.gdal.org/gdal_translate.html)
 * [GDAL Cheat Sheet](https://github.com/dwtkns/gdal-cheat-sheet) 



Download tile maps from:

 * [Global Data Explorer](http://gdex.cr.usgs.gov/gdex/)
 * [SRTM Tile Mapper](http://dwtkns.com/srtm/)
 * [USGS](http://dds.cr.usgs.gov/srtm/version2_1/SRTM3/Australia/)
 * [DEM Explorer](http://ws.csiss.gmu.edu/DEMExplorer/)


Merge multiple tiles (for Melbourne):

    gdal_merge.py -o Melbourne.hgt S38E144.hgt S38E145.hgt S39E144.hgt S39E145.hgt


Translate to a TIF (DEM format):

    gdal_translate Melbourne.hgt Melbourne.tif

Prepare for `Unity`:

    gdal_translate -ot UInt16 -scale -of ENVI -outsize 1025 1025 Melbourne.hgt Melbourne.raw

Miscellaneous, from the [GDAL Cheat Sheet](https://github.com/dwtkns/gdal-cheat-sheet)

    gdal_merge.py -co "PHOTOMETRIC=RGB" -separate LC81690372014137LGN00_B{4,3,2}.tif -o LC81690372014137LGN00_rgb.tif

    gdaldem hillshade -of PNG S34E151.tif hillshade.png

    gdaldem color-relief S34E151.tif ramp.txt color-relief.tif
    gdaldem color-relief -of PNG S34E151.tif ramp.txt color-relief.png


    gdaldem slope S34E151.tif slope.tif 

    gdaldem color-relief slope.tif ramp2.txt slopeshade.tif

    gdaldem hillshade -of PNG slopeshade.tif hillshade.png



### Prepare for `Unreal`  {#terrain_unreal}

Swapping little-endian to big-endian in Ruby [from stackoverflow](http://stackoverflow.com/questions/16077885/how-to-convert-to-big-endian-in-ruby
). Alse see [Ruby String#unpack reference](http://www.ruby-doc.org/core-2.1.2/String.html#method-i-unpack).


```ruby

f = File.new("/Users/liam/Downloads/Melbourne.raw")
bs = f.read()
bsr = bs.unpack("s<*").pack("s>*")
f2 = File.new("/Users/liam/Downloads/Melbourne2.raw", "w+")
f2.write(bsr)

```





### General Terrain mapping references {#terrain_references}

 - [USGS Site: SRTM](https://lta.cr.usgs.gov/SRTM2)
     + [Quickstart](http://dds.cr.usgs.gov/srtm/version2_1/Documentation/Quickstart.pdf)
     + [Wikipedia](http://en.wikipedia.org/wiki/Shuttle_Radar_Topography_Mission)
 - [Example data](http://www.ga.gov.au/metadata-gateway/metadata/record/gcat_66006)
 - [WebGIS](http://www.webgis.com/srtm3.html)
 - [Quickstart Guide](http://dds.cr.usgs.gov/srtm/version2_1/Documentation/Quickstart.pdf)
 - Miscellaneous
     + <http://stackoverflow.com/questions/357415/how-to-read-nasa-hgt-binary-files>
     + <http://www.soi.city.ac.uk/~jwo/landserf/landserf230/doc/howto/srtm.html>
     + <http://lists.osgeo.org/pipermail/gdal-dev/2011-November/030817.html>
     + <http://vterrain.org/Elevation/global.html>
 - [World Machine](http://www.world-machine.com/)



## Bibliography


