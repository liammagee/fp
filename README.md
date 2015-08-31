

# fp

[Fierce Planet](http://www.fierce-planet.com) is an open source toolkit for developing agent-based models, with a particular focus on urban and social simulations.

For more information, visit:

 - [Fierce Planet](http://www.fierce-planet.com)
 - [Technical docs](http://www.fierce-planet.com/demo)
 - [GitHub](https://github.com/liammagee/fp.git)



## Generating JavaDocs

    jsdoc -d public/api --package package.json --readme README.md public/js/fp.js


## Running Babel to convert ES6 code to ES5

	babel -w public/js/fp.js --out-file public/js/fp-compiled.js
