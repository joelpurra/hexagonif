(function() {
    "use strict";

    var Point = require("./modules/objects/point.js"),
        grapher = require("./modules/logic/grapher.js"),
        renderer = require("./modules/logic/renderer.js"),
        profiling = require("./modules/utils/profiling.js"),
        random = require("./modules/utils/random.js");

    var canvasId = "hexagonif",
        canvasContainerId = "hexagonif-container",
        previousCanvasWidth = 0;

    function getCanvas() {
        var canvas = document.getElementById(canvasId);

        return canvas;
    }

    function createCanvas() {
        var container = document.getElementById(canvasContainerId),
            canvas,
            i;

        for (i = 0; i < container.childElementCount; i++) {
            container.removeChild(container.children[i]);
        };

        canvas = document.createElement("canvas");
        canvas.id = canvasId;
        container.insertBefore(canvas, container.children[0]);

        return canvas;
    }

    function oneAtATimePlease(fn) {
        var running = false,
            wrapper = function() {
                if (running) {
                    return;
                }
                running = true;

                fn.call(null);

                running = false;
            }

        return wrapper;
    }

    function calculateHexagonSideLength() {
        var canvas = getCanvas(),
            shortestCanvasSide = Math.min(canvas.scrollWidth, canvas.scrollHeight),
            min = shortestCanvasSide / 20,
            max = shortestCanvasSide / 10;

        return random.integer(min, max);
    }

    function generateAndRender() {
        var canvas = createCanvas(),
            canvasArea = new Point(canvas.scrollWidth, canvas.scrollHeight),
            hexagonSideLength = calculateHexagonSideLength(),
            profiledGrapher = profiling.wrap("grapher", function() {
                return grapher(canvasArea, hexagonSideLength);
            }),
            lines = profiledGrapher(),
            profiledRenderer = profiling.wrap("renderer", function() {
                return renderer(canvasId, canvasArea, lines);
            });

        profiledRenderer();
    }

    var run = oneAtATimePlease(generateAndRender);

    window.addEventListener("resize", function() {
        var canvas = getCanvas();

        if (!canvas || previousCanvasWidth !== canvas.scrollWidth) {
            previousCanvasWidth = canvas.scrollWidth;

            run();
        }
    });

    run();
}());