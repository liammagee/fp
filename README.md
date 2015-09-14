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

