% Fierce Planet


# Navigating a Fierce Planet

The models below illustrate different interpretations of sustainability and sustainable development. 

They are designed to support an undergraduate sustainability course, and move from very basic models (such as the [Petri Dish](#petri-dish)) through to more complex models of conceptual arguments about sustainability. These include [Malthusian Population Growth](#malthus), [Limits to Growth](#limits-to-growth), the [Green Revolution](#green-revolution) and the [Triple Bottom Line](#triple-bottom-line).

A *work in progress* version of an accompanying text on sustainability can be found [here](https://docs.google.com/document/u/1/d/1irry-14-HSvWnc_2WEZT8LOEiFfqOli_1bzcJLtrTho/pub#h.8c4ooz8q2g4s). 



## Preparatory Models {#preparatory-models}

The first three models are preparatory -- they introduce particular features that are later used in the sustainability models.



### Petri Dish {#petri-dish}


This model shows the interaction of agents and resources (embedded
within the spatial plane that these agents randomly traverse). The
parameters of this simulation include a direct causal relationship
between resource consumption by agents and the health of these
individual agents. At the same time these environmental resources
degrade and can only regenerate when there are no agents interacting
with (consuming) them.




Demonstrates a scene where individual "patches" of the terrain have a
randomly distributed health property.


As agents move over the terrain, patches lose health.




Patches regain health once the agent has moved.


The graph in the lower left corner shows three "output" variables:

 - The *total* agent population (in blue)
 - The *average health* of the agent population (in green)
 - The *average health* of the patches (in red)


[Open in a new window](projects/sustainability/1-petri-dish.html)






### Terrain {#terrain}



As above, but including the vagaries of terrain (water and
topographical variation).




[Open in a new window](projects/sustainability/2-terrain.html)






### Settlements {#settlements}



This model again including all the assumptions of the previous two
scenarios but introducing settlement patterns and the path dependency
(in terms of agent behaviour) that this implies.




[Open in a new window](projects/sustainability/3-settlements.html)




## Modelling Sustainability

### Malthusian Populations {#malthus}



This scenario again builds on the previous one by
introducing the dynamic of population growth as directly connected to
resource consumption and availability.

It contains addition parameters that condition the behaviour of the simulation:

 - *reproductionChance*: The likelihood that when agents of different genders meet, they will reproduce (defaults to **5%**).
 - *maxChildren*: The maximum number of children a female agent can produce (defaults to **10**).
 - *energyLoss*: The energy loss each agent experiences each 'tick', or move (defaults to **0.15**).
 - *energyGain*: The energy gain each agent experiences each 'tick', or move, *where the patch has sufficient resources* (defaults to **0.15**).
 - *rateOfConsumption*: The rate at which patches lose resources due agent consumption (defaults to **0.2**).
 - *rateOfRecovery*: The rate at which patches recover resources each 'tick', or move (defaults to **0.005**).


[Open in a new window](projects/sustainability/4-malthus.html)




### Limits to Growth {#limits-to-growth}



This model introduces a simplified set of
assumptions from the 1972 (rereleased in 2004) report of the Club of
Rome to again demonstrate the concept of limits to growth.

Unlike the *Malthusian* model, the *Limits to Growth* model treats the sustainability of resources as a global property. While agents continue to consume resources on the patch they belong to, once that patch is completely depleted, agents will draw resources from other random patches in the world. 
This better approximates to the *Limits to Growth* modelling.

This model contains the same additional parameters as the *Malthusian* model above. It also contains:

 - *foodEfficiency*: this parameter conditions the extent to which patch resources are converted into food agents consume (defaults to **0.3**).


[Open in a new window](projects/sustainability/5-limits-to-growth.html)





### The Green Revolution {#green-revolution}


This model builds upon (and critiques) the classic Malthusian
scenario by acknowledging the role of technological advances in
increasing both the effectiveness and efficiency of resource utilisation
and the availability of new resource sources.

This model contains the same additional parameters as the *Limits to Growth* model above. It also contains:

 - *growthInFoodEfficiency*: conditions the improvement in the efficiency of providing food to agents each year, to model more efficient agricultural production due to technology and other factors (defaults to **0.025**).



[Open in a new window](projects/sustainability/6-green-revolution.html)











### Triple Bottom Line {#triple-bottom-line}



This model further applies the assumptions of the concept of *Triple Bottom Line*
accounting.

It uses the same set of additional parameters as the *The Green Revolution* model. However its outputs, visible in the graph, are different. The following values 

 * *Blue* - shows the overall *Economic* value of the model.
 * *Red* - shows the overall *Social* value of the model.
 * *Green* - shows the overall *Environmental* value of the model.


[Open in a new window](projects/sustainability/7-triple-bottom-line.html)






<!-- ## The 4 pillars of sustainability and the social ecology model -->



<!-- *Description:* as above it includes the assumptions of these two related
approaches to sustainability. -->









<!-- ## Uneven Development -->



<!-- *Description:* finally introduces the dynamic of geographic/spatial
inequality in terms of growth (reflecting the insights of Harvey and
development studies more generally). -->

