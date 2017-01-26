"use strict";

/*global require: true, console: true, __dirname: true */
/* eslint-disable no-console */

var start = new Date().valueOf(),

    gulp = require("gulp"),
    path = require("path"),
    size = require("gulp-size"),
    browserify = require("gulp-browserify"),

    rimraf = require("rimraf"),

    paths = {
        input: {
            main: "src/resources/javascript/main.js",
            html: "src/*.html",
            javascript: "src/resources/javascript/**/*.js",
            libraries: "src/resources/javascript/libraries/**/*.js",
            json: "src/resources/json/*.json",
            css: "src/resources/css/*.css",
        },
        output: {
            clean: "dist/",
            html: "dist/public/",
            javascript: "dist/public/resources/javascript/",
            libraries: "dist/public/resources/javascript/libraries/",
            json: "dist/public/resources/json/",
            css: "dist/public/resources/css/",
        },
    },

    refresh,

    options = {
        express: {
            root: path.resolve(__dirname, paths.output.html),
            port: 47333,
        },
        size: {
            showFiles: true,
        },
    },

    getServerUrl = function() {
        return "http://localhost:" + options.express.port + "/";
    },

    stop = new Date().valueOf();

console.log("Loading took " + (stop - start) + " ms.");

gulp.task("clean", function(done) {
    var rimrafOptions = {
        maxBusyTries: 10,
    };

    function rmrf(next) {
        rimraf(paths.output.clean, rimrafOptions, next);
    }

    // Try to delete twice due to bugs.
    rmrf(rmrf.bind(null, done));
});

gulp.task("html", function() {
    return gulp.src(paths.input.html)
        .pipe(size(options.size))
        .pipe(gulp.dest(paths.output.html));
});

gulp.task("javascript-debug", function() {
    return gulp.src(paths.input.main)
        .pipe(size(options.size))
        .pipe(browserify({
            debug: true,
        }))
        .pipe(size(options.size))
        .pipe(gulp.dest(paths.output.javascript));
});

gulp.task("javascript-production", function() {
    var stripDebug = require("gulp-strip-debug"),
        uglify = require("gulp-uglify"),
        rename = require("gulp-rename");

    return gulp.src(paths.input.main)
        .pipe(size(options.size))
        .pipe(stripDebug())
        .pipe(size(options.size))
        .pipe(browserify())
        .pipe(size(options.size))
        .pipe(uglify())
        .pipe(rename("main.min.js"))
        .pipe(size(options.size))
        .pipe(gulp.dest(paths.output.javascript));
});

gulp.task("javascript-libraries", function() {
    return gulp.src(paths.input.libraries)
        .pipe(size(options.size))
        .pipe(gulp.dest(paths.output.libraries));
});

gulp.task("javascript", ["javascript-debug", "javascript-production", "javascript-libraries"]);

gulp.task("css", function() {
    var styl = require("gulp-styl");

    return gulp.src(paths.input.css)
        .pipe(size(options.size))
        .pipe(styl())
        .pipe(size(options.size))
        .pipe(gulp.dest(paths.output.css));
});

gulp.task("json", function() {
    var stripJsonComments = require("gulp-strip-json-comments");

    return gulp.src(paths.input.json)
        .pipe(size(options.size))
        .pipe(stripJsonComments())
        .pipe(size(options.size))
        .pipe(gulp.dest(paths.output.json));
});

gulp.task("build", ["html", "javascript", "json", "css"]);

gulp.task("livereload-server", function() {
    var Q = require("q"),
        deferred = Q.defer(),
        livereloadServer = require("tiny-lr")(),
        livereload = require("gulp-livereload");

    refresh = function() {
        console.error("Refresh perfomed before livereload-server was finished.");
    };

    livereloadServer.listen(35729, function(error) {
        if (error) {
            deferred.reject(error);
        } else {
            refresh = function() {
                return livereload(livereloadServer);
            };

            deferred.resolve();
        }
    });

    return deferred.promise;
});

gulp.task("server", ["livereload-server"], function() {
    var Q = require("q"),
        deferred = Q.defer(),
        express = require("express"),
        livereloadClient = require("connect-livereload")(),
        app = express(),
        url = getServerUrl();

    app.use(livereloadClient);
    app.use(express.static(options.express.root));

    app.listen(options.express.port, function(error) {
        if (error) {
            deferred.reject(error);
        } else {
            console.log("Server started: " + url);

            deferred.resolve();
        }
    });

    return deferred.promise;
});

gulp.task("open", ["server"], function() {
    var open = require("gulp-open"),
        url = getServerUrl();

    // Any file that exists will do
    return gulp.src("gulpfile.js")
        .pipe(open("", {
            url: url,
        }));
});

gulp.task("watch", ["build", "livereload-server"], function() {
    var tasks = ["html", "javascript", "json", "css"],
        changeLogger = function(event) {
            console.log("File " + event.path + " was " + event.type + ", running task...");
        },
        livereloader = function(event) {
            gulp.src(event.path)
                .pipe(refresh());
        };

    return tasks.map(function(task) {
        return gulp.watch(paths.input[task], [task])
            .on("change", changeLogger)
            .on("change", livereloader);
    });
});

gulp.task("default", ["clean", "server", "build", "watch"]);
