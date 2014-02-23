(function() {
    "use strict";

    var Point = require("./modules/objects/point.js"),
        grapher = require("./modules/logic/grapher.js"),
        renderer = require("./modules/logic/renderer.js"),
        profiling = require("./modules/utils/profiling.js");

    function run() {
        var canvasArea = new Point(800, 1200),
            hexagonSideLength = 50,
            profiledGrapher = profiling.wrap("grapher", function() {
                return grapher(canvasArea, hexagonSideLength);
            }),
            lines = profiledGrapher(),
            profiledRenderer = profiling.wrap("renderer", function() {
                return renderer("hexagonif", canvasArea, lines);
            });

        profiledRenderer();
    }

    run();
}());