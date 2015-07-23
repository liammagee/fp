var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var clean = require('gulp-clean');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var eslint = require('gulp-eslint')
var shell = require( 'gulp-shell' );

// Key files
var paths = {
    fp: 'public/js/fp.js',
    fpOutput: 'public/js',
    fpCompiled: 'fp-compiled.js',
    fpCompiledFull:  'public/js/fp-compiled.js'
}

gulp.task( 'default', [ 'watch' ] );


// Converts ES6 to ES5
gulp.task( 'babel', [ 'clean' ], function() {
    return gulp.src( paths.fp )
        .pipe( sourcemaps.init() )
        .pipe( babel( ) )
        .pipe( concat( paths.fpCompiled ) )
        .pipe( sourcemaps.write( '.' ) )
        .pipe( gulp.dest( paths.fpOutput ) );
} );

// Watch for babel
gulp.task( 'watch', [ 'clean' ], function() {
    return gulp.watch( paths.fp, [ 'babel' ] );
} );


// Cleans compiled file
gulp.task( 'clean', function() {
    return gulp.src( paths.fpCompiledFull + '*', {read: false} )
        .pipe( clean() );
});

// NOTE: source maps not working with both babel and uglify
gulp.task('uglify', [ 'babel' ], function() {
  gulp.src( paths.fpCompiledFull )
    .pipe( uglify( { outSourceMap: true }) )
    .pipe( gulp.dest( paths.fpOutput ) )
});

// configure the jshint task
gulp.task('lint', function() {
  return gulp.src( paths.fp )
    // eslint() attaches the lint output to the eslint property
    // of the file object so it can be used by other modules.
    .pipe(eslint(
        {
            ecmaFeatures: {
                templateStrings: true
            },
            rules: {
                "semi": 2
            },
            envs: [ 'es6' ]
        }
    ))
    // eslint.format() outputs the lint results to the console.
    // Alternatively use eslint.formatEach() (see Docs).
    .pipe(eslint.format())
    //         .pipe(jshint())
    // .pipe(jshint.reporter('jshint-stylish'));
});


// Cleans compiled fils
gulp.task( 'jsdoc', shell.task( [
  'jsdoc  -d public/api --package package.json --readme README.md public/js/fp.js'
] ) );
