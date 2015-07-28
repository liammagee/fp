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


// Key files
var paths = {
    fp: 'public/js/fp.js',
    fpOutput: 'public/js',
    fpCompiled: 'fp-compiled.js',
    fpCompiledFull:  'public/js/fp-compiled.js'
}

gulp.task( 'default', [ 'watch' ] );


/**
 * Converts ES6 to ES5
 */
gulp.task( 'babel', [ 'clean' ], function() {
    return gulp.src( paths.fp )
        .pipe( sourcemaps.init() )
        .pipe( babel( ) )
        .pipe( concat( paths.fpCompiled ) )
        .pipe( sourcemaps.write( '.' ) )
        .pipe( gulp.dest( paths.fpOutput ) );
} );

/**
 * Watch for babel
 */
gulp.task( 'watch', [ 'clean' ], function() {
    return gulp.watch( paths.fp, [ 'babel' ] );
} );


/**
 * Cleans compiled file.
 */
gulp.task( 'clean', function() {
    return gulp.src( paths.fpCompiledFull + '*', {read: false} )
        .pipe( clean() );
});

/**
 * NOTE: source maps not working with both babel and uglify
 */
gulp.task('uglify', [ 'babel' ], function() {
  gulp.src( paths.fpCompiledFull )
    .pipe( uglify( { outSourceMap: true }) )
    .pipe( gulp.dest( paths.fpOutput ) )
});

/**
 * Configure the eshint task.
 * Rules available here: http://eslint.org/docs/rules/
 */
gulp.task('lint', function() {
  return gulp.src( paths.fp )
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


/**
 * Cleans compiled files.
 */
gulp.task( 'jsdoc', shell.task( [
  'jsdoc  -d public/api --package package.json --readme README.md --configure jsdoc-conf.json public/js/fp.js'
] ) );


/**
 * Generates a complete HTML file with citations, MathJax and a bootstrap template.
 */
gulp.task('pandoc-html', function() {
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
        // '--mathjax=js/docs/MathJax.js',
        '--mathjax',
        '--bibliography=docs/fp.bib',
        '--template=docs/templates/bootstrap.html',
        '--css=css/docs.css'
        ]
    }))
    .pipe(gulp.dest('public/'));
});

/**
 * Generates, first, a latex file from the Markdown; and second, a PDF from the latex.
 * (Direct to PDF doesn't seem to work due to the interim Latex file going missing.)
 */
gulp.task('pandoc-pdf', function() {
  gulp.src('docs/*.md')
    .pipe(pandoc({
      from: 'markdown',
      to: 'latex',
      ext: '.tex',
      args: [
        '--smart',
        '--standalone',
        '--toc',
        '--toc-depth=2 ',
        '--bibliography=docs/fp.bib',
        ]
    }))
    .pipe(gulp.dest('public/'));
    shell.task( [
        'pdflatex public/*.tex public/'
    ] )
});
