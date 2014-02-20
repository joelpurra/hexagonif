'use strict';

/*global require: true, console: true, __dirname: true */

var start = new Date().valueOf(),

    gulp = require('gulp'),
    path = require('path'),
    size = require('gulp-size'),

    paths = {
        input: {
            html: 'src/*.html',
            javascript: 'src/resources/javascript/*.js',
            json: 'src/resources/json/*.json',
            css: 'src/resources/css/*.css'
        },
        output: {
            clean: 'dist/**',
            html: 'dist/public/',
            javascript: 'dist/public/resources/javascript/',
            json: 'dist/public/resources/json/',
            css: 'dist/public/resources/css/'
        }
    },

    refresh,

    options = {
        express: {
            root: path.resolve(__dirname, paths.output.html),
            port: 47333
        },
        size: {
            showFiles: true
        }
    },

    stop = new Date().valueOf();

console.log('Loading took ' + (stop - start) + ' ms.');

gulp.task('clean', function() {
    var clean = require('gulp-clean');

    gulp.src(paths.output.clean, {
        read: false
    })
        .pipe(clean());
});

gulp.task('html', function() {
    gulp.src(paths.input.html)
        .pipe(size(options.size))
        .pipe(gulp.dest(paths.output.html))
        .pipe(refresh());
});

gulp.task('javascript', function() {
    var stripDebug = require('gulp-strip-debug'),
        uglify = require('gulp-uglify'),
        browserify = require('gulp-browserify'),
        concat = require('gulp-concat');

    gulp.src(paths.input.javascript)
        .pipe(stripDebug())
        .pipe(size(options.size))
        .pipe(browserify())
        .pipe(concat('main.js'))
        .pipe(uglify())
        .pipe(size(options.size))
        .pipe(gulp.dest(paths.output.javascript))
        .pipe(refresh());
});

gulp.task('css', function() {
    var styl = require('gulp-styl');

    gulp.src(paths.input.css)
        .pipe(size(options.size))
        .pipe(styl())
        .pipe(size(options.size))
        .pipe(gulp.dest(paths.output.css))
        .pipe(refresh());
});

gulp.task('json', function() {
    var stripJsonComments = require('gulp-strip-json-comments');

    gulp.src(paths.input.json)
        .pipe(size(options.size))
        .pipe(stripJsonComments())
        .pipe(size(options.size))
        .pipe(gulp.dest(paths.output.json))
        .pipe(refresh());
});

gulp.task('server', function() {
    var livereloadServer = require('tiny-lr')(),
        express = require('express'),
        livereloadClient = require('connect-livereload')(),
        app = express(),
        livereload = require('gulp-livereload');

    refresh = function() {
        return livereload(livereloadServer);
    };

    livereloadServer.listen(35729, function(err) {
        if (err) {
            return console.log(err);
        }
    });

    app.use(livereloadClient);
    app.use(express.static(options.express.root));
    app.listen(options.express.port);
});

gulp.task('open', function() {
    var open = require('gulp-open'),
        url = 'http://localhost:' + options.express.port + '/';

    // Any file that exists will do
    gulp.src('gulpfile.js')
        .pipe(open('', {
            url: url
        }));
});

gulp.task('default', ['clean', 'server', 'html', 'javascript', 'json', 'css'], function() {
    var tasks = ['html', 'javascript', 'json', 'css'],
        changeLogger = function(event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running task...');
        };

    tasks.forEach(function(task) {
        gulp.watch(paths.input[task], [task])
            .on('change', changeLogger);
    });
});