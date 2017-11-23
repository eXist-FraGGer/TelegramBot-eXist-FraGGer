'use strict';

import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';

const plugins = gulpLoadPlugins();

gulp.task('babel', () => {
    plugins.watch('src/**/*.js', () => {
        gulp.src('src/**/*.js')
            .pipe(plugins.babel({
                presets: [ 'es2015' ],
                plugins: [ 'add-module-exports', 'transform-object-assign' ]
            }))
            .on('error', function (e) {
                console.log('>>> ERROR', e);
                // emit here
                this.emit('end');
            })
            .pipe(gulp.dest('dist'));
    });
});

gulp.task('default', [ 'babel' ]);