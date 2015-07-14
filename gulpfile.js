var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var clean = require('gulp-clean');
var rename = require('gulp-rename');

// Key files
var paths = {
    fp: 'public/js/fp.js',
    fpOutput: 'public/js',
    fpCompiled: 'fp-compiled.js'
}

gulp.task( 'default', [ 'watch' ] );


gulp.task( 'babel', [ 'clean-compiled' ], function() {
    return gulp.src( paths.fp )
        .pipe( sourcemaps.init() )
        .pipe( babel() )
        .pipe( rename( paths.fpCompiled ) )
        .pipe( sourcemaps.write( '.' ) )
        .pipe( gulp.dest( paths.fpOutput ) );
} );

gulp.task( 'watch', [ 'clean-compiled' ], function() {
    return gulp.watch( paths.fp, [ 'babel' ] );
} );


gulp.task( 'clean-compiled', function() {
    return gulp.src( paths.fpCompiled, {read: false} )
        .pipe( clean() );
});
