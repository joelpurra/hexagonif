(function main() {
    "use strict";

    var Point = require("./modules/objects/point.js"),
        Line = require("./modules/objects/line.js"),
        grapher = require("./modules/logic/grapher.js"),
        renderer = require("./modules/logic/renderer.js"),
        profiling = require("./modules/utils/profiling.js"),
        random = require("./modules/utils/random.js"),
        resizeDetector = require("./modules/utils/resize-detector.js"),
        mouseDetector = require("./modules/utils/mouse-detector.js"),
        once = require("./modules/utils/once.js"),
        oneAtATimePlease = require("./modules/utils/one-at-a-time-please.js"),
        delay = require("./modules/utils/delay.js"),
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

    function calculateHexagonSideLength() {
        // TODO DEBUG REMOVE
        return 100;

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
                return renderer(canvasId, canvasArea, graphObjects);
            }),
            hexEvent = new HexEvent(canvas),
            activityMonitor = new ActivityMonitor(hexEvent),
            addGonifNeighborDebugLines = function() {
                Object.keys(graphObjects.gonifs).forEach(function(gonifKey) {
                    var gonif = graphObjects.gonifs[gonifKey],
                        fromCenter = gonif.hexagon.getCenter();

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
                function startActivities() {
                    highlightOnInterval.isStarted() || highlightOnInterval.start();
                }

                function stopActivities() {
                    highlightOnInterval.isStarted() && highlightOnInterval.stop();
                }

                hexEvent.listen("user.activity", function() {
                    // TODO DEBUG REMOVE
                    console.log("User activity!");
                    startActivities();
                });
                hexEvent.listen("user.inactivity", function() {
                    // TODO DEBUG REMOVE
                    console.log("User inactivity!");
                    stopActivities();
                });

                activityMonitor.start();
                startActivities();
            },
            scene,
            highlightOnInterval;

        // addGonifNeighborDebugLines();

        scene = profiledRenderer();
        highlightOnInterval = new HighlightOnInterval(scene, graphObjectsTool, hexEvent);
        setupActivityMonitor();
    }

    var run = oneAtATimePlease(generateAndRender);

    mouseDetector(once(run));
    resizeDetector(getCanvas(), window.Cowboy.debounce(1000, delay(run, 100)));
}());