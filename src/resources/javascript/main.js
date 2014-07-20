(function main() {
    "use strict";

    var Point = require("./modules/objects/point.js"),
        Line = require("./modules/objects/line.js"),
        grapher = require("./modules/logic/grapher.js"),
        renderer = require("./modules/logic/renderer.js"),
        profiling = require("./modules/utils/profiling.js"),
        random = require("./modules/utils/random.js");

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
            absoluteMin = 50,
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
            profiledRenderer = profiling.wrap("renderer", function profiledRendererWrapper() {
                return renderer(canvasId, canvasArea, graphObjects.lines);
            }),
            getRandomObject = function(objects) {
                var keys = Object.keys(objects),
                    count = keys.length,
                    rnd = random.integer(0, count),
                    key = keys[rnd],
                    object = objects[key];

                return object;
            },
            getRandomHexagon = function() {
                var hexagon = getRandomObject(graphObjects.hexagons);

                return hexagon;
            },
            getRandomLine = function() {
                var line = getRandomObject(graphObjects.lines);

                return line;
            },
            getRandomNode = function() {
                var node = getRandomObject(graphObjects.nodes);

                return node;
            },
            highlightOnInterval = function() {
                var MAX_AUTO_HIGHLIGHT_DELAY = 10,
                    highlightCounter = 0,
                    highlightCounterInterval,
                    isAutomatedHighlight = false,
                    highlightInterval;

                function highlightCounterDecreaser() {
                    highlightCounter = Math.max(0, highlightCounter - 1);
                }

                document.addEventListener("hexagonif.line.highlight", function hexagonifLineHighlightEventListener() {
                    if (!isAutomatedHighlight) {
                        highlightCounter = Math.min(Number.MAX_VALUE - 1, highlightCounter + 1, MAX_AUTO_HIGHLIGHT_DELAY);
                    }
                });

                document.addEventListener("hexagonif.line.unhighlight", function hexagonifLineUnhighlightEventListener() {
                    // Something
                });

                function resetRandomLine() {
                    var line = getRandomLine();

                    scene.resetLine(line);
                }

                function highlightRandomLine() {
                    var line = getRandomLine();

                    isAutomatedHighlight = true;
                    scene.highlightLine(line);
                    isAutomatedHighlight = false;

                    setTimeout(function unhighlightSameRandomLine() {
                        scene.unhighlightLine(line);
                    }, 500);
                }

                function highlightRandomHexagon() {
                    var hexagon;

                    do {
                        hexagon = getRandomHexagon();
                    } while (!hexagon.isComplete())

                    isAutomatedHighlight = true;
                    scene.highlightHexagon(hexagon);
                    isAutomatedHighlight = false;

                    setTimeout(function unhighlightSameRandomHexagon() {
                        scene.unhighlightHexagon(hexagon);
                    }, 500);
                }

                function highlightSomethingThatIfNothingHasHappened() {
                    var rnd = random.integer(10);

                    if (highlightCounter === 0) {
                        if (rnd < 2) {
                            resetRandomLine();
                        } else if (rnd < 9) {
                            highlightRandomLine();
                        } else {
                            highlightRandomHexagon();
                        }
                    }
                }

                highlightCounterInterval = setInterval(highlightCounterDecreaser, 1000);
                highlightInterval = setInterval(highlightSomethingThatIfNothingHasHappened, 1000);
            },
            scene = profiledRenderer();

        highlightOnInterval();
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