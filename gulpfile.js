
var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var clean = require('gulp-clean');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var eslint = require('gulp-eslint')
var shell = require( 'gulp-shell' );
var pandoc = require('gulp-pandoc');
var requirejsOptimize = require('gulp-requirejs-optimize');

// Key files
var jsSrc = 'public/js/';
var fpSrc = jsSrc + 'fp/';
var fpDist = jsSrc + 'dist/';
var fpBaseFile = 'fp.js';
var fpBaseSrc = jsSrc + fpBaseFile;
var fpDistSrc = fpDist + fpBaseFile;
var fpDistCompiled = 'fp-compiled.js';

var fpShaderSrc = fpSrc + 'shader-utils.js';
var fpShaderCompiled = 'shader-utils-compiled.js';

var docFiles = 'docs/*.md';
var docTemplate = 'docs/templates/fp.html';


var pathsToWatch = [
    fpSrc,
    docFiles,
    docTemplate
]


gulp.task( 'default', [ 'watch' ] );



/**
 * Builds the Fierce Planet distribution
 */
gulp.task( 'dist', [ 'babel-shader', 'require' ] );


/**
 * Watch for babel
 */
gulp.task( 'watch', [ 'clean' ], function() {
    return gulp.watch( pathsToWatch, [ 'pandoc-site', 'babel-shader' ] );
} );




/**
 * Cleans Babel compiled file.
 */
gulp.task( 'clean', function() {

    // return gulp.src( fpSrc + fpShaderCompiled + '*', {read: false} )
    //     .pipe( clean() );

});


// BABEL FOR ES6


/**
 * Converts ES6 to ES5
 */
gulp.task( 'babel-shader', [ 'clean' ], function() {

    return gulp.src( fpShaderSrc )
        // .pipe( sourcemaps.init() )
        .pipe( babel( ) )
        .pipe( concat( fpShaderCompiled ) )
        // .pipe( sourcemaps.write( '.' ) )
        .pipe( gulp.dest( fpSrc ) );

    // WITH SOURCEMAPS - NOT WORKING CURRENTLY
    /*
    return gulp.src( fpShaderSrc )
        .pipe( sourcemaps.init() )
        .pipe( babel( ) )
        .pipe( concat( fpShaderCompiled ) )
        .pipe( sourcemaps.write( '.' ) )
        .pipe( gulp.dest( fpSrc ) );
    */

} );




/**
 * Cleans compiled files.
 */
gulp.task('require', function () {

    return gulp.src( fpBaseSrc )
        .pipe(requirejsOptimize({
            baseUrl: jsSrc,
            paths: {
                jquery: "utils/jquery",
                astar: "utils/astar",
                underscore: "utils/underscore",
                three: "three",
                jstat: "utils/jstat.min",
                smoothie: "ux/smoothie",
                stats: "ux/stats.min",
                javascriptUtil: "utils/javascript.util",
                jsts: "utils/jsts",
                datGui: "ux/dat.gui",
                mirror: "objects/Mirror",
                water: "objects/WaterShader",
                KeyboardState: "controls/THREEx.KeyboardState",
                TerrainLoader: "loaders/TerrainLoader",
                TrackballControls: "controls/TrackballControls",
                OrbitControls: "controls/OrbitControls",
                PointerLockControls: "controls/PointerLockControls",

                fpShaderUtils: "fp/shader-utils-compiled",
                fpInstance: "fp/instance"
            },
            optimize: 'none',
            name: 'fp'
        }))
        .pipe(gulp.dest( fpDist ));
});


/**
 * NOTE: source maps not working with both babel and uglify
 */
gulp.task('uglify', [ ], function() {
  gulp.src( fpDistSrc )
    // .pipe( uglify( { outSourceMap: true }) )
    .pipe( uglify() )
    .pipe( gulp.dest( fpDistCompiled ) )
});



/**
 * Generates a complete HTML file with citations, MathJax and a bootstrap template.
 */
gulp.task('pandoc-site', function() {
  gulp.src('docs/*.md')
    .pipe(pandoc({
      from: 'markdown',
      to: 'html5',
      ext: '.html',
      args: [
        '--smart',
        '--standalone',
        '--toc',
        '--toc-depth=2 ',
        // Local
        '--mathjax=/js/docs/MathJax/MathJax.js?config=TeX-AMS-MML_HTMLorMML',
        // Get CloudFlare version
        // '--mathjax',
        '--bibliography=docs/fp.bib',
        '--template=docs/templates/fp.html',
        // '--css=css/docs.css'
        ]
    }))
    .pipe(gulp.dest('public/'));
});


/**
 * Cleans compiled files.
 */
gulp.task( 'jsdoc', shell.task( [
  'jsdoc  -d public/api --package package.json --readme README.md --configure jsdoc-conf.json public/js/fp/'
] ) );



/**
 * Configure the eshint task.
 * Rules available here: http://eslint.org/docs/rules/
 */
gulp.task('lint', function() {
  return gulp.src( fpBaseSrc )
    // eslint() attaches the lint output to the eslint property
    // of the file object so it can be used by other modules.
    .pipe( eslint(
        {
            ecmaFeatures: {
                templateStrings: true
            },
            rules: {
                "semi": 2,
                "dot-notation": 1,
                "camelcase": 1
            },

            globals: {
                "window": true,
                "require": true,
                "define": true,
                "THREEx": true
            },

            envs: [ 'es6', 'browser' ]
        }
    ))
    // eslint.format() outputs the lint results to the console.
    // Alternatively use eslint.formatEach() (see Docs).
    .pipe(eslint.format())
});
