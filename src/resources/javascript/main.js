(function main() {
    "use strict";

    var Point = require("./modules/objects/point.js"),
        Line = require("./modules/objects/line.js"),
        grapher = require("./modules/logic/grapher.js"),
        renderer = require("./modules/logic/renderer.js"),
        profiling = require("./modules/utils/profiling.js"),
        random = require("./modules/utils/random.js"),
        HexEvent = require("./modules/logic/events.js"),
        ActivityMonitor = require("./modules/logic/activity-monitor.js"),
        GraphObjectsTool = require("./modules/logic/graph-objects-tool.js"),
        HighlightOnInterval = require("./modules/logic/highlight-on-interval.js");

    var canvasId = "hexagonif",
        canvasContainerId = "hexagonif-container";

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
            wrapper = function oneAtATimePleaseWrapper() {
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
            absoluteMin = 75,
            absoluteMax = 150,
            shortestCanvasSide = Math.min(canvas.scrollWidth, canvas.scrollHeight),
            min = Math.max(absoluteMin, shortestCanvasSide / 20),
            max = Math.min(absoluteMax, shortestCanvasSide / 10);

        return random.integer(min, max);
    }

    function generateAndRender() {
        var canvas = createCanvas(),
            canvasArea = new Point(canvas.scrollWidth, canvas.scrollHeight),
            hexagonSideLength = calculateHexagonSideLength(),
            profiledGrapher = profiling.wrap("grapher", function profiledGrapherWrapper() {
                return grapher(canvasArea, hexagonSideLength);
            }),
            graphObjects = profiledGrapher(),
            graphObjectsTool = new GraphObjectsTool(graphObjects),
            profiledRenderer = profiling.wrap("renderer", function profiledRendererWrapper() {
                return renderer(canvasId, canvasArea, graphObjects.lines);
            }),
            hexEvent = new HexEvent(canvas),
            activityMonitor = new ActivityMonitor(hexEvent),
            addGonifNeighborDebugLines = function() {
                Object.keys(graphObjects.gonifs).forEach(function(gonifKey) {
                    var gonif = graphObjects.gonifs[gonifKey],
                        fromLine = gonif.hexagon.getLineThroughMiddle(),
                        fromCenter = fromLine && fromLine.center();

                    if (!fromCenter) {
                        return;
                    }

                    gonif.getNeighbors().forEach(function(neighbor) {
                        if (neighbor) {
                            var toLine = neighbor.hexagon.getLineThroughMiddle(),
                                toCenter = toLine && toLine.center();

                            if (!toCenter) {
                                return;
                            }

                            var line = new Line(fromCenter, toCenter);

                            graphObjects.lines[line.cacheKey] = line;
                        }
                    });
                });
            },
            setupActivityMonitor = function() {
                hexEvent.listen("user.activity", function() {
                    // TODO DEBUG REMOVE
                    console.log("User activity!");
                    highlightOnInterval.isStarted() || highlightOnInterval.start();
                });
                hexEvent.listen("user.inactivity", function() {
                    // TODO DEBUG REMOVE
                    console.log("User inactivity!");
                    highlightOnInterval.isStarted() && highlightOnInterval.stop();
                });

                activityMonitor.start();
            },
            scene,
            highlightOnInterval;

        // addGonifNeighborDebugLines();

        scene = profiledRenderer();
        highlightOnInterval = new HighlightOnInterval(scene, graphObjectsTool, hexEvent);
        setupActivityMonitor();
    }

    function once(fn) {
        var hasRun = false,
            runOnceCheck = function() {
                if (!hasRun) {
                    hasRun = true;
                    fn.call(null);
                }
            };

        return runOnceCheck;
    }

    function onMouseDetector(fn) {
        // Experimental code to detect if a mouse pointing device is used.
        // If a mouse is detected, call the supplied function once.
        var onTouchMoveEventArgs = {
                target: null,
            },
            onTouchMove = function(e) {
                onTouchMoveEventArgs.target = e.target;
            },
            onMouseMove = function(e) {
                // If the target isn't the same, the assumption is that the touchmove event wasn't fired first - hence it's not a touch event.
                // TODO: would be better to use the mouse event .x and .y, if matching ones exist in touchmove etcetera.
                if (onTouchMoveEventArgs.target !== e.target) {
                    onDetect();
                }

                // Release pointer
                onTouchMoveEventArgs.target = null;
            },
            onDetect = once(function() {
                document.removeEventListener("touchmove", onTouchMove);
                document.removeEventListener("mousemove", onMouseMove);
                fn.call(null);
            });

        document.addEventListener("touchmove", onTouchMove);
        document.addEventListener("mousemove", onMouseMove);
    }

    function onResizeDetector(fn) {
        // Currently not checking for height changes because that would
        // reset the canvas every time the developer console was toggled.

        // Chrome on Android also triggers a resize when scrolling enough to
        // hide the address bar and menu.

        // TODO: read this value once after canvas has been drawn, otherwise the first
        // resize, even if in height, will trigger the drawing.
        var previousCanvasWidth = 0;

        window.addEventListener("resize", function onResizeEventListener() {
            var canvas = getCanvas();

            if (!canvas) {
                fn.call(null);
                return;
            }

            if (previousCanvasWidth !== canvas.scrollWidth) {
                previousCanvasWidth = canvas.scrollWidth;

                fn.call(null);
                return;
            }
        });
    }

    var run = oneAtATimePlease(generateAndRender);

    onMouseDetector(once(run));
    onResizeDetector(run);
}());