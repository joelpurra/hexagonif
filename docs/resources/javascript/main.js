(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function main() {
    "use strict";

    var Point = require("./modules/objects/point.js"),
        // NOTE: debug.
        // Line = require("./modules/objects/line.js"),
        grapher = require("./modules/logic/grapher.js"),
        renderer = require("./modules/logic/renderer.js"),
        profiling = require("./modules/utils/profiling.js"),
        // NOTE: debug.
        // random = require("./modules/utils/random.js"),
        resizeDetector = require("./modules/utils/resize-detector.js"),
        mouseDetector = require("./modules/utils/mouse-detector.js"),
        once = require("./modules/utils/once.js"),
        oneAtATimePlease = require("./modules/utils/one-at-a-time-please.js"),
        delay = require("./modules/utils/delay.js"),
        HexEvent = require("./modules/logic/events.js"),
        ActivityMonitor = require("./modules/logic/activity-monitor.js"),
        GraphObjectsTool = require("./modules/logic/graph-objects-tool.js"),
        HighlightOnInterval = require("./modules/logic/highlight-on-interval.js"),
        debounce = (window.Cowboy || window.jQuery).debounce,

        canvasId = "hexagonif",
        canvasContainerId = "hexagonif-container",

        run = oneAtATimePlease(generateAndRender);

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

        // var canvas = getCanvas(),
        //     absoluteMin = 75,
        //     absoluteMax = 150,
        //     shortestCanvasSide = Math.min(canvas.scrollWidth, canvas.scrollHeight),
        //     min = Math.max(absoluteMin, shortestCanvasSide / 20),
        //     max = Math.min(absoluteMax, shortestCanvasSide / 10);
        //
        // return random.integer(min, max);
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
            // NOTE: debug.
            // addGonifNeighborDebugLines = function() {
            //     Object.keys(graphObjects.gonifs).forEach(function(gonifKey) {
            //         var gonif = graphObjects.gonifs[gonifKey],
            //             fromCenter = gonif.hexagon.getCenter();
            //
            //         if (!fromCenter) {
            //             return;
            //         }
            //
            //         gonif.getNeighbors().forEach(function(neighbor) {
            //             if (neighbor) {
            //                 var toLine = neighbor.hexagon.getLineThroughMiddle(),
            //                     toCenter = toLine && toLine.center();
            //
            //                 if (!toCenter) {
            //                     return;
            //                 }
            //
            //                 var line = new Line(fromCenter, toCenter);
            //
            //                 graphObjects.lines[line.cacheKey] = line;
            //             }
            //         });
            //     });
            // },
            setupActivityMonitor = function() {
                function startActivities() {
                    if (!highlightOnInterval.isStarted())
                    {
                        highlightOnInterval.start();
                    }
                }

                function stopActivities() {
                    if (highlightOnInterval.isStarted())
                    {
                        highlightOnInterval.stop();
                    }
                }

                hexEvent.listen("user.activity", function() {
                    startActivities();
                });
                hexEvent.listen("user.inactivity", function() {
                    stopActivities();
                });

                activityMonitor.start();
                startActivities();
            },
            scene,
            highlightOnInterval;

        // NOTE: debug.
        // addGonifNeighborDebugLines();

        scene = profiledRenderer();
        highlightOnInterval = new HighlightOnInterval(scene, graphObjectsTool, hexEvent);
        setupActivityMonitor();
    }

    mouseDetector(once(run));
    resizeDetector(getCanvas(), debounce(1000, delay(run, 100)));
}());

},{"./modules/logic/activity-monitor.js":2,"./modules/logic/events.js":3,"./modules/logic/graph-objects-tool.js":4,"./modules/logic/grapher.js":5,"./modules/logic/highlight-on-interval.js":6,"./modules/logic/renderer.js":7,"./modules/objects/point.js":14,"./modules/utils/delay.js":17,"./modules/utils/mouse-detector.js":19,"./modules/utils/once.js":20,"./modules/utils/one-at-a-time-please.js":21,"./modules/utils/profiling.js":22,"./modules/utils/resize-detector.js":24}],2:[function(require,module,exports){
// TODO: use HexEvent?
// var HexEvent = require("./events.js");
var activityEventName = "user.activity",
    inactivityEventName = "user.inactivity";

function ActivityMonitor(hexEvent, limit) {
    this.hexEvent = hexEvent;
    this.limitMilliseconds = limit || 60 * 1000;

    this.checkingIntervalMilliseconds = Math.floor(this.limitMilliseconds / 2);
    this.latestActivityTimestamp = null;
    this.activityInterval = null;
    this.isMonitorStarted = false;
    this.isUserIsActive = false;
}

ActivityMonitor.prototype.getTimestamp = function() {
    return new Date().valueOf();
};

ActivityMonitor.prototype.resetActivityInterval = function() {
    this.latestActivityTimestamp = this.getTimestamp();
};

ActivityMonitor.prototype.startActivityInterval = function() {
    this.activityInterval = setInterval(this.checkActivityInterval.bind(this), this.checkingIntervalMilliseconds);
};

ActivityMonitor.prototype.stopActivityInterval = function() {
    clearInterval(this.activityInterval);

    this.activityInterval = null;
};

ActivityMonitor.prototype.checkActivityInterval = function() {
    if (Math.abs(this.getTimestamp() - this.latestActivityTimestamp) > this.limitMilliseconds) {
        this.inactivityDetected();
    }
};

ActivityMonitor.prototype.activityDetected = function() {
    this.isUserIsActive = true;
    this.resetActivityInterval();

    if (this.activityInterval === null) {
        this.startActivityInterval();
    }

    this.hexEvent.fire(activityEventName);
};

ActivityMonitor.prototype.inactivityDetected = function() {
    this.stopActivityInterval();
    this.isUserIsActive = false;

    this.hexEvent.fire(inactivityEventName);
};

ActivityMonitor.prototype.isStarted = function() {
    return this.isMonitorStarted === true;
};

ActivityMonitor.prototype.isUserIsActive = function() {
    return this.isUserIsActive === true;
};

ActivityMonitor.prototype.start = function() {
    if (this.isStarted()) {
        throw new Error("Was already started.");
    }

    this.resetActivityInterval();
    this.startActivityInterval();

    // TODO: use hexagonif triggered events?
    document.addEventListener("mousemove", this.activityDetected.bind(this));
};

ActivityMonitor.prototype.stop = function() {
    if (this.isStarted()) {
        throw new Error("Was not started.");
    }

    document.removeEventListener("mousemove", this.activityDetected.bind(this));

    this.stopActivityInterval();
};

module.exports = ActivityMonitor;

},{}],3:[function(require,module,exports){
function HexEvents(canvasElement, namespacePrefix) {
    this.canvasElement = canvasElement;
    this.namespacePrefix = namespacePrefix || "hexagonif.";
}

HexEvents.prototype.getEventName = function(name) {
    return this.namespacePrefix + name;
};

HexEvents.prototype.fire = function(name, graphic, object) {
    var event = document.createEvent("HTMLEvents"),
        namespacedName = this.getEventName(name);

    event.initEvent(namespacedName, true, true);
    event.graphic = graphic;
    event.object = object;
    return this.canvasElement.dispatchEvent(event);
};

HexEvents.prototype.listen = function(name, fn) {
    var namespacedName = this.getEventName(name);

    this.canvasElement.addEventListener(namespacedName, fn);
};

HexEvents.prototype.cancel = function(name, fn) {
    var namespacedName = this.getEventName(name);

    this.canvasElement.removeEventListener(namespacedName, fn);
};

module.exports = HexEvents;

},{}],4:[function(require,module,exports){
var random = require("../utils/random.js");

function GraphObjectsTool(graphObjects) {
    this.graphObjects = graphObjects;
}

GraphObjectsTool.prototype.getRandomObject = function(objects) {
    var keys = Object.keys(objects),
        count = keys.length,
        rnd = random.integer(0, count),
        key = keys[rnd],
        object = objects[key];

    return object;
};

GraphObjectsTool.prototype.getRandomHexagon = function() {
    var hexagon = this.getRandomObject(this.graphObjects.hexagons);

    return hexagon;
};

GraphObjectsTool.prototype.getRandomLine = function() {
    var line = this.getRandomObject(this.graphObjects.lines);

    return line;
};

GraphObjectsTool.prototype.getRandomNode = function() {
    var node = this.getRandomObject(this.graphObjects.nodes);

    return node;
};

module.exports = GraphObjectsTool;

},{"../utils/random.js":23}],5:[function(require,module,exports){
var Point = require("../objects/point.js"),
    Line = require("../objects/line.js"),
    Hexagon = require("../objects/hexagon.js"),
    Gonif = require("../objects/gonif.js"),
    Area = require("../objects/area.js"),
    limitPrecision = require("../utils/limit-precision.js");

function getOrGenerateHexagon(cache, hexagonSideLength, startPoint, startCorner) {
    var hexagon = new Hexagon();

    var point = startPoint,
        corner = startCorner;

    do {
        // Points and corners
        var pointCacheKey = point.cacheKey,
            cachedPoint = cache.nodes[pointCacheKey];

        if (cachedPoint === undefined) {
            cache.nodes[pointCacheKey] = point;
        } else {
            point = cachedPoint;
        }

        hexagon.setCornerPoint(corner, point);

        var nextCorner = Hexagon.Corners.next(corner);
        var x = limitPrecision(point.x - (hexagonSideLength * Math.cos(corner.rad)), 5),
            y = limitPrecision(point.y + (hexagonSideLength * Math.sin(corner.rad)), 5);
        var nextPoint = new Point(x, y);

        // Lines and sides
        var line = new Line(point, nextPoint);

        var lineCacheKey = line.cacheKey,
            cachedLine = cache.lines[lineCacheKey];

        if (cachedLine === undefined) {
            cache.lines[lineCacheKey] = line;
        } else {
                //throw new Error("Line already exists " + line.cacheKey)
            line = cachedLine;
        }

        var side = Hexagon.Sides.fromCorner(corner);

        hexagon.setSideLine(side, line);

        // Pass to next iteration.
        point = nextPoint;
        corner = nextCorner;

        // TODO: fix equality check
    } while (corner.rotation !== startCorner.rotation);

    // Hexagon
    {
        // TODO: base cache key on location index, so this check can be done much earlier.
        // TODO: generate hexagons with neightbors instead of points, so the check is easier.
        var hexagonCacheKey = hexagon.getCacheKey(),
            cachedHexagon = cache.hexagons[hexagonCacheKey];

        if (cachedHexagon !== undefined) {
            if (cachedHexagon.isComplete()) {
                return cachedHexagon;
            }

            hexagon = cachedHexagon;
        } else {
            cache.hexagons[hexagonCacheKey] = hexagon;
        }
    }

    return hexagon;
}

function gonifExists(cache, gonif) {
    return !!cache.gonifs[gonif.cacheKey];
}

function getOrGenerateGonif(cache, hexagonSideLength, startPoint, startSide) {
    var startCorner = startSide.start,
        hexagon = getOrGenerateHexagon(cache, hexagonSideLength, startPoint, startCorner),
        gonif = new Gonif(hexagon);

    if (gonifExists(cache, gonif)) {
        throw new Error("Gonif generation collision.");
    }

    cache.gonifs[gonif.cacheKey] = gonif;

    return gonif;
}

function eachSharedNeighborDirection(gonif, neighbor, sidesToCheck, sharedNeighborDirection) {
    var sharedNeighbor = neighbor.getNeighbor(sharedNeighborDirection.fromNeighbor);

    if ((!!sharedNeighbor) && gonif.getNeighbor(sharedNeighborDirection.fromHere) !== sharedNeighbor) {
        gonif.setNeighbor(sharedNeighborDirection.fromHere, sharedNeighbor);
        sharedNeighbor.setNeighbor(Hexagon.Sides.opposite(sharedNeighborDirection.fromHere), gonif);

        // In case this one has neighbors still unknown, but already checked in the inital pass.
        sidesToCheck.push(sharedNeighborDirection.fromHere);
    }
}

function addNeighbors(gonif) {
    var sidesToCheck = Hexagon.Sides.all(),
        side = sidesToCheck.shift();

    while (side) {
        var neighbor = gonif.getNeighbor(side);

        if (neighbor) {
            var boundEachSharedNeighborDirection = eachSharedNeighborDirection.bind(null, gonif, neighbor, sidesToCheck),
                sharedNeighborDirections = Gonif.Neighbors.getSharedNeighborDirections(side);

            sharedNeighborDirections.forEach(boundEachSharedNeighborDirection);
        }

        side = sidesToCheck.shift();
    }
}

function generateGonifInDirection(area, cache, hexagonSideLength, gonif, goingTowardsDirections) {
    // Ensure array
    goingTowardsDirections = [].concat(goingTowardsDirections);

    var comingFromDirection,
        goingTowardsDirectionIndex = 0,
        goingTowardsDirection = goingTowardsDirections[goingTowardsDirectionIndex],
        startPoint = gonif.hexagon.getCornerPoint(goingTowardsDirection.end).point,
        neighbor;

    do {
        comingFromDirection = Hexagon.Sides.opposite(goingTowardsDirection);
        startPoint = gonif.hexagon.getCornerPoint(goingTowardsDirection.end).point;
        neighbor = getOrGenerateGonif(cache, hexagonSideLength, startPoint, comingFromDirection);

        gonif.setNeighbor(goingTowardsDirection, neighbor);
        neighbor.setNeighbor(comingFromDirection, gonif);
        addNeighbors(neighbor);

        goingTowardsDirectionIndex = (goingTowardsDirectionIndex + 1) % goingTowardsDirections.length;
        goingTowardsDirection = goingTowardsDirections[goingTowardsDirectionIndex];
        gonif = neighbor;
    } while (area.isInside(startPoint));
}

function generateGraph(area, cache, hexagonSideLength) {
    var areaWithPadding = new Area(new Point(0 - hexagonSideLength, 0 - hexagonSideLength), new Point(area.x + hexagonSideLength, area.y + hexagonSideLength)),
        startPoint = new Point(area.x / 2, area.y / 2),
        point = startPoint,
        startGonif = getOrGenerateGonif(cache, hexagonSideLength, point, Hexagon.Sides.Bottom),
        gonif = startGonif;

    // Generate horizontally first /\/\/\/\/\/.
    // To the east.
    generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, [Hexagon.Sides.BottomRight, Hexagon.Sides.TopRight]);
    // To the west.
    generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, [Hexagon.Sides.BottomLeft, Hexagon.Sides.TopLeft]);

    // Generate vertically, based on neighbors from the first gonif.
    // Generate based on neighbors to the east.
    do {
        generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.Top);
        generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.Bottom);
        gonif = gonif.getNeighbor(Hexagon.Sides.BottomRight) || gonif.getNeighbor(Hexagon.Sides.TopRight);
    } while (gonif);

    // Start from left neighbor of the first gonif.
    gonif = startGonif.getNeighbor(Hexagon.Sides.BottomLeft) || startGonif.getNeighbor(Hexagon.Sides.TopLeft);

    // Generate based on neighbors to the west.
    if (gonif) {
        do {
            generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.Top);
            generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.Bottom);
            gonif = gonif.getNeighbor(Hexagon.Sides.BottomLeft) || gonif.getNeighbor(Hexagon.Sides.TopLeft);
        } while (gonif);
    }

    return startGonif;
}

function grapher(canvasArea, hexagonSideLength) {
    var cache = {
            hexagons: {},
            nodes: {},
            lines: {},
            gonifs: {},
        },
        start = generateGraph(canvasArea, cache, hexagonSideLength),
        graph = {
            hexagons: cache.hexagons,
            nodes: cache.nodes,
            lines: cache.lines,
            gonifs: cache.gonifs,
            start: start,
        };

    return graph;
}

module.exports = grapher;

},{"../objects/area.js":8,"../objects/gonif.js":11,"../objects/hexagon.js":12,"../objects/line.js":13,"../objects/point.js":14,"../utils/limit-precision.js":18}],6:[function(require,module,exports){
var MAX_AUTO_HIGHLIGHT_DELAY = 10,
    random = require("../utils/random.js");

function HighlightOnInterval(scene, graphObjectsTool, hexEvent) {
    this.scene = scene;
    this.graphObjectsTool = graphObjectsTool;
    this.hexEvent = hexEvent;

    this.isHighlighterStarted = false;
    this.highlightCounter = 0;
    this.highlightCounterInterval = null;
    this.isAutomatedHighlight = false;
    this.highlightInterval = null;

    this.highlightMilliseconds = 1000;
    this.unhighlightAfterMilliseconds = 500;

    this.boundListeners = {
        hexagonifLineHighlightEventListener: this.hexagonifLineHighlightEventListener.bind(this),
        hexagonifLineUnhighlightEventListener: this.hexagonifLineUnhighlightEventListener.bind(this),
        highlightCounterDecreaser: this.highlightCounterDecreaser.bind(this),
        highlightSomethingThatIfNothingHasHappened: this.highlightSomethingThatIfNothingHasHappened.bind(this),

    };
}

HighlightOnInterval.prototype.highlightCounterDecreaser = function() {
    this.highlightCounter = Math.max(0, this.highlightCounter - 1);
};

HighlightOnInterval.prototype.resetRandomLine = function() {
    var line = this.graphObjectsTool.getRandomLine();

    this.scene.resetLine(line);
};

HighlightOnInterval.prototype.highlightRandomLine = function() {
    var line = this.graphObjectsTool.getRandomLine();

    this.isAutomatedHighlight = true;
    this.scene.highlightLine(line);
    this.isAutomatedHighlight = false;

    setTimeout(function unhighlightSameRandomLine() {
        this.scene.unhighlightLine(line);
    }.bind(this), this.unhighlightAfterMilliseconds);
};

HighlightOnInterval.prototype.highlightRandomHexagon = function() {
    var hexagon;

    do {
        hexagon = this.graphObjectsTool.getRandomHexagon();
    } while (!hexagon.isComplete());

    this.isAutomatedHighlight = true;
    this.scene.highlightHexagon(hexagon);
    this.isAutomatedHighlight = false;

    setTimeout(function unhighlightSameRandomHexagon() {
        this.scene.unhighlightHexagon(hexagon);
    }.bind(this), this.unhighlightAfterMilliseconds);
};

HighlightOnInterval.prototype.highlightSomethingThatIfNothingHasHappened = function() {
    var rnd = random.integer(10);

    if (this.highlightCounter === 0) {
        if (rnd < 2) {
            this.resetRandomLine();
        } else if (rnd < 9) {
            this.highlightRandomLine();
        } else {
            this.highlightRandomHexagon();
        }
    }
};

HighlightOnInterval.prototype.hexagonifLineHighlightEventListener = function() {
    if (!this.isAutomatedHighlight) {
        this.highlightCounter = Math.min(Number.MAX_VALUE - 1, this.highlightCounter + 1, MAX_AUTO_HIGHLIGHT_DELAY);
    }
};

HighlightOnInterval.prototype.hexagonifLineUnhighlightEventListener = function() {
    // Something
};

HighlightOnInterval.prototype.isStarted = function() {
    return this.isHighlighterStarted === true;
};

HighlightOnInterval.prototype.start = function() {
    if (this.isStarted()) {
        throw new Error("Was started.");
    }

    this.isHighlighterStarted = true;

    this.hexEvent.listen("line.highlight", this.boundListeners.hexagonifLineHighlightEventListener);
    this.hexEvent.listen("line.unhighlight", this.boundListeners.hexagonifLineUnhighlightEventListener);

    this.highlightCounterInterval = setInterval(this.boundListeners.highlightCounterDecreaser, this.highlightMilliseconds);
    this.highlightInterval = setInterval(this.boundListeners.highlightSomethingThatIfNothingHasHappened, this.highlightMilliseconds);
};

HighlightOnInterval.prototype.stop = function() {
    if (!this.isStarted()) {
        throw new Error("Was not started.");
    }

    this.hexEvent.cancel("line.highlight", this.boundListeners.hexagonifLineHighlightEventListener);
    this.hexEvent.cancel("line.unhighlight", this.boundListeners.hexagonifLineUnhighlightEventListener);

    clearInterval(this.highlightCounterInterval);
    clearInterval(this.highlightInterval);

    this.isHighlighterStarted = false;
};

module.exports = HighlightOnInterval;

},{"../utils/random.js":23}],7:[function(require,module,exports){
function renderer(canvasId, canvasArea, graphObjects) {
    /* global oCanvas:false */

    var random = require("../utils/random.js"),
        Hexagon = require("../objects/hexagon.js"),
        HexEvent = require("./events.js");

    // TODO: use hidpi-canvas-polyfill
    // https://github.com/jondavidjohn/hidpi-canvas-polyfill
    var canvasElement = document.getElementById(canvasId);
    canvasElement.width = canvasArea.x;
    canvasElement.height = canvasArea.y;

    var hexEvent = new HexEvent(canvasElement),
        canvas = oCanvas.create({
            canvas: "#" + canvasId,
        }),
        graphicsLookupCache = {};

    function getDefaultStrokeWidth() {
        // TODO: move to options object
        // return 10;
        return random.integer(3, 10);
    }

    function getDefaultStrokeColor() {
        // TODO: move to options object
        // return "rgba(0, 0, 0, 0.01)";
        // return "rgba(0, 0, 0, 0.1)";
        return "transparent";
    }

    function getDefaultFillColor() {
        // TODO: move to options object
        // return "rgba(0, 0, 0, 0.01)";
        // return "rgba(127, 0, 0, 0.1)";
        return "transparent";
    }

    function getColorByLocation(x, y, highlight) {
        // NOTE: x and y are not guaranteed to be inside the canvas area
        var byX = Math.floor((x / canvasArea.x) * 20),
            byY = Math.floor((y / canvasArea.y) * 360),
            // TODO: move to options object
            opacity = highlight ? 0.7 : 0.3;

        return "hsla(" + byY + ", " + (100 - (byX / 2)) + "%, " + (60 - byX) + "%, " + opacity.toFixed(3) + ")";
        // return "hsla(60, 100%, 50%, 0.3)";
    }

    var linePrototype = canvas.display.line({
            cap: "round",
            strokeWidth: getDefaultStrokeWidth(),
            strokeColor: getDefaultStrokeColor(),
        }),
        gonifPrototype = canvas.display.polygon({
            sides: 6,
            fill: getDefaultFillColor(),
            strokeWidth: getDefaultStrokeWidth(),
            strokeColor: getDefaultStrokeColor(),
        });

    function onLineMouseEnter(event) {
        lineHighlight.call(this);
    }

    function onLineMouseLeave(event) {
        lineUnhighlight.call(this);
    }

    function onGonifClick(event) {
        highlightHexagon(this.tag.hexagon);
    }

    function lineReset() {
        var lineEvent = hexEvent.fire("line.reset", this, this.tag);

        if (lineEvent.defaultPrevented) {
            return;
        }

        this.strokeColor = getDefaultStrokeColor();
        this.zIndex = "back";
        this.redraw();
    }

    function lineHighlight() {
        var lineEvent = hexEvent.fire("line.highlight", this, this.tag);

        if (lineEvent.defaultPrevented) {
            return;
        }

        this.strokeColor = getColorByLocation(this.x, this.y, true);
        this.zIndex = "front";
        this.redraw();
    }

    function lineUnhighlight(event) {
        var lineEvent = hexEvent.fire("line.unhighlight", this, this.tag);

        if (lineEvent.defaultPrevented) {
            return;
        }

        this.strokeColor = getColorByLocation(this.x, this.y, false);
        this.redraw();
    }

    function drawLineInScene(scene, start, end, tag) {
        var line = linePrototype.clone({
            start: {
                x: start.x,
                y: start.y,
            },
            end: {
                x: end.x,
                y: end.y,
            },
            tag: tag,
        });

        scene.add(line);

        line
            .bind("mouseenter touchenter", onLineMouseEnter)
            .bind("mouseleave touchleave", onLineMouseLeave);

        return line;
    }

    function drawGonifInScene(scene, center, radius, tag) {
        var gonif = gonifPrototype.clone({
            origin: {
                x: center.x,
                y: center.y,
            },
            radius: radius,
            tag: tag,
        });

        scene.add(gonif);

        gonif
            .bind("click tap", onGonifClick);

        return gonif;
    }

    var sceneGrid = "grid";

    canvas.scenes.create(sceneGrid, function canvasScenesCreate() {
        var self = this;

        // Object.keys(nodes).sort().reduce(function(start, end) {
        //     drawLineInScene(self, nodes[start], nodes[end], node);

        //     return end;
        // });

        // TODO: Async/queued object adding, so main user thread won't freeze/become unresponsive?
        Object.keys(graphObjects.gonifs).forEach(function gonifsForEachCreateGraphic(cacheKey) {
            var gonif = graphObjects.gonifs[cacheKey],
                center = gonif.hexagon.getCenter(),
                origin = {
                    x: 0 - center.x,
                    y: 0 - center.y,
                },
                // TODO DEBUG FIX
                radius = (100 - 2),
                graphic = drawGonifInScene(self, origin, radius, gonif);

            graphicsLookupCache[cacheKey] = graphic;
        });

        // TODO: Async/queued object adding, so main user thread won't freeze/become unresponsive?
        Object.keys(graphObjects.lines).forEach(function linesForEachCreateGraphic(cacheKey) {
            var line = graphObjects.lines[cacheKey],
                graphic = drawLineInScene(self, line.start, line.end, line);

            graphicsLookupCache[cacheKey] = graphic;
        });
    });

    canvas.scenes.load(sceneGrid);

    function highlightLine(line) {
        var cacheKey = line.cacheKey,
            selected = graphicsLookupCache[cacheKey];

        lineHighlight.call(selected);
    }

    function resetLine(line) {
        var cacheKey = line.cacheKey,
            selected = graphicsLookupCache[cacheKey];

        lineReset.call(selected);
    }

    function eachLineInHexagon(hexagon, fn) {
        var startSide = Hexagon.Sides.Top,
            side = startSide,
            sideLine;

        do {
            sideLine = hexagon.getSideLine(side);
            fn(sideLine.line);
            side = Hexagon.Sides.next(side);
        } while (side !== startSide);
    }

    function highlightHexagon(hexagon) {
        eachLineInHexagon(hexagon, highlightLine);
    }

    function unhighlightHexagon(hexagon) {
        eachLineInHexagon(hexagon, unhighlightLine);
    }

    function unhighlightLine(line) {
        var cacheKey = line.cacheKey,
            selected = graphicsLookupCache[cacheKey];

        lineUnhighlight.call(selected);
    }

    var api = {
        resetLine: resetLine,
        highlightLine: highlightLine,
        unhighlightLine: unhighlightLine,
        highlightHexagon: highlightHexagon,
        unhighlightHexagon: unhighlightHexagon,
    };

    return api;
}

module.exports = renderer;

},{"../objects/hexagon.js":12,"../utils/random.js":23,"./events.js":3}],8:[function(require,module,exports){
function Area(start, end) {
    this.start = start;
    this.end = end;

    if (this.start.x <= this.end.x) {
        this.aX = this.start.x;
        this.bX = this.end.x;
    } else {
        this.aX = this.end.x;
        this.bX = this.start.x;
    }

    if (this.start.y <= this.end.y) {
        this.aY = this.start.y;
        this.bY = this.end.y;
    } else {
        this.aY = this.end.y;
        this.bY = this.start.y;
    }

    return this;
}

Area.prototype.isInside = function(point) {
    return !this.isOutside(point);
};

Area.prototype.isOutside = function(point) {
    var isOutside = (point.x < this.aX) || (point.x > this.bX) || (point.y < this.aY) || (point.y > this.bY);

    return isOutside;
};

module.exports = Area;

},{}],9:[function(require,module,exports){
function Corner(name, rotation) {
    this.name = name;
    this.rotation = rotation;

    return this;
}

module.exports = Corner;

},{}],10:[function(require,module,exports){
function CornerPoint(corner, point) {
    this.corner = corner;
    this.point = point;

    return this;
}

module.exports = CornerPoint;

},{}],11:[function(require,module,exports){
var Hexagon = require("./hexagon.js"),
    random = require("../utils/random.js");

function Gonif(hexagon) {
    this.cacheKey = random.integer(Number.MAX_VALUE);

    this.hexagon = hexagon;

    this.neighbors = {
        top: null,
        topRight: null,
        bottomRight: null,
        bottom: null,
        bottomLeft: null,
        topLeft: null,
    };

    return this;
}

Gonif.Neighbors = {};

Gonif.Neighbors.getSharedNeighborDirections = function(direction) {
    var result;

    switch (direction) {
    case Hexagon.Sides.Top:
        result = [{
            fromNeighbor: Hexagon.Sides.BottomLeft,
            fromHere: Hexagon.Sides.TopLeft,
        }, {
            fromNeighbor: Hexagon.Sides.BottomRight,
            fromHere: Hexagon.Sides.TopRight,
        }];
        break;
    case Hexagon.Sides.TopRight:
        result = [{
            fromNeighbor: Hexagon.Sides.TopLeft,
            fromHere: Hexagon.Sides.Top,
        }, {
            fromNeighbor: Hexagon.Sides.Bottom,
            fromHere: Hexagon.Sides.BottomRight,
        }];
        break;
    case Hexagon.Sides.BottomRight:
        result = [{
            fromNeighbor: Hexagon.Sides.Top,
            fromHere: Hexagon.Sides.TopRight,
        }, {
            fromNeighbor: Hexagon.Sides.BottomLeft,
            fromHere: Hexagon.Sides.Bottom,
        }];
        break;
    case Hexagon.Sides.Bottom:
        result = [{
            fromNeighbor: Hexagon.Sides.TopRight,
            fromHere: Hexagon.Sides.BottomRight,
        }, {
            fromNeighbor: Hexagon.Sides.TopLeft,
            fromHere: Hexagon.Sides.BottomLeft,
        }];
        break;
    case Hexagon.Sides.BottomLeft:
        result = [{
            fromNeighbor: Hexagon.Sides.BottomRight,
            fromHere: Hexagon.Sides.Bottom,
        }, {
            fromNeighbor: Hexagon.Sides.Top,
            fromHere: Hexagon.Sides.TopLeft,
        }];
        break;
    case Hexagon.Sides.TopLeft:
        result = [{
            fromNeighbor: Hexagon.Sides.Bottom,
            fromHere: Hexagon.Sides.BottomLeft,
        }, {
            fromNeighbor: Hexagon.Sides.TopRight,
            fromHere: Hexagon.Sides.Top,
        }];
        break;
    default:
        throw new Error("Unknown neighbor side " + direction);
    }

    return result;
};

Gonif.prototype.getNeighbors = function() {
    var neighbors = [
        this.neighbors.top,
        this.neighbors.topRight,
        this.neighbors.bottomRight,
        this.neighbors.bottom,
        this.neighbors.bottomLeft,
        this.neighbors.topLeft,
    ];

    return neighbors;
};

Gonif.prototype.getNeighbor = function(direction) {
    var result;

    switch (direction) {
    case Hexagon.Sides.Top:
        result = this.neighbors.top;
        break;
    case Hexagon.Sides.TopRight:
        result = this.neighbors.topRight;
        break;
    case Hexagon.Sides.BottomRight:
        result = this.neighbors.bottomRight;
        break;
    case Hexagon.Sides.Bottom:
        result = this.neighbors.bottom;
        break;
    case Hexagon.Sides.BottomLeft:
        result = this.neighbors.bottomLeft;
        break;
    case Hexagon.Sides.TopLeft:
        result = this.neighbors.topLeft;
        break;
    default:
        throw new Error("Unknown neighbor side " + direction);
    }

    return result;
};

Gonif.prototype.setNeighbor = function(direction, neighbor) {
    switch (direction) {
    case Hexagon.Sides.Top:
        this.neighbors.top = neighbor;
        break;
    case Hexagon.Sides.TopRight:
        this.neighbors.topRight = neighbor;
        break;
    case Hexagon.Sides.BottomRight:
        this.neighbors.bottomRight = neighbor;
        break;
    case Hexagon.Sides.Bottom:
        this.neighbors.bottom = neighbor;
        break;
    case Hexagon.Sides.BottomLeft:
        this.neighbors.bottomLeft = neighbor;
        break;
    case Hexagon.Sides.TopLeft:
        this.neighbors.topLeft = neighbor;
        break;
    default:
        throw new Error("Unknown direction " + direction);
    }
};

module.exports = Gonif;

},{"../utils/random.js":23,"./hexagon.js":12}],12:[function(require,module,exports){
var Corner = require("./corner.js"),
    CornerPoint = require("./cornerpoint.js"),
    Side = require("./side.js"),
    Line = require("./line.js"),
    SideLine = require("./sideline.js"),

    NUMBER_OF_SIDES = 6;

function Hexagon() {
    this.points = {
        topLeft: null,
        topRight: null,
        right: null,
        bottomRight: null,
        bottomLeft: null,
        left: null,
    };

    this.lines = {
        top: null,
        topRight: null,
        bottomRight: null,
        bottom: null,
        bottomLeft: null,
        topLeft: null,
    };
}

Hexagon.Corners = {
    TopLeft: new Corner("top left", 120),
    TopRight: new Corner("top right", 60),
    Right: new Corner("right", 0),
    BottomRight: new Corner("bottom right", 300),
    BottomLeft: new Corner("bottom left", 240),
    Left: new Corner("left", 180),
};

Object.keys(Hexagon.Corners).forEach(function(cornerKey) {
    var corner = Hexagon.Corners[cornerKey];

    corner.rad = (((corner.rotation + 60) / 180) % 360) * Math.PI;
});

Hexagon.Corners.next = function(start) {
    var result;

    switch (start) {
    case Hexagon.Corners.TopLeft:
        result = Hexagon.Corners.TopRight;
        break;
    case Hexagon.Corners.TopRight:
        result = Hexagon.Corners.Right;
        break;
    case Hexagon.Corners.Right:
        result = Hexagon.Corners.BottomRight;
        break;
    case Hexagon.Corners.BottomRight:
        result = Hexagon.Corners.BottomLeft;
        break;
    case Hexagon.Corners.BottomLeft:
        result = Hexagon.Corners.Left;
        break;
    case Hexagon.Corners.Left:
        result = Hexagon.Corners.TopLeft;
        break;
    default:
        throw new Error("Unknown start corner " + start);
    }

    return result;
};

Hexagon.Corners.opposite = function(start) {
    var result;

    switch (start) {
    case Hexagon.Corners.TopLeft:
        result = Hexagon.Corners.BottomRight;
        break;
    case Hexagon.Corners.TopRight:
        result = Hexagon.Corners.BottomLeft;
        break;
    case Hexagon.Corners.Right:
        result = Hexagon.Corners.Left;
        break;
    case Hexagon.Corners.BottomRight:
        result = Hexagon.Corners.TopLeft;
        break;
    case Hexagon.Corners.BottomLeft:
        result = Hexagon.Corners.TopRight;
        break;
    case Hexagon.Corners.Left:
        result = Hexagon.Corners.Right;
        break;
    default:
        throw new Error("Unknown start corner " + start);
    }

    return result;
};

Hexagon.Corners.connecting = function(start) {
    var result;

    switch (start) {
    case Hexagon.Corners.TopLeft:
        result = [
            Hexagon.Corners.Right,
            Hexagon.Corners.BottomLeft,
        ];
        break;
    case Hexagon.Corners.TopRight:
        result = [
            Hexagon.Corners.BottomRight,
            Hexagon.Corners.Left,
        ];
        break;
    case Hexagon.Corners.Right:
        result = [
            Hexagon.Corners.BottomLeft,
            Hexagon.Corners.TopLeft,
        ];
        break;
    case Hexagon.Corners.BottomRight:
        result = [
            Hexagon.Corners.Left,
            Hexagon.Corners.TopRight,
        ];
        break;
    case Hexagon.Corners.BottomLeft:
        result = [
            Hexagon.Corners.Right,
            Hexagon.Corners.TopLeft,
        ];
        break;
    case Hexagon.Corners.Left:
        result = [
            Hexagon.Corners.BottomRight,
            Hexagon.Corners.TopRight,
        ];
        break;
    default:
        throw new Error("Unknown start corner " + start);
    }

    return result;
};

Hexagon.Sides = {
    Top: new Side("top", Hexagon.Corners.TopLeft, Hexagon.Corners.TopRight),
    TopRight: new Side("top right", Hexagon.Corners.TopRight, Hexagon.Corners.Right),
    BottomRight: new Side("bottom right", Hexagon.Corners.Right, Hexagon.Corners.BottomRight),
    Bottom: new Side("bottom", Hexagon.Corners.BottomRight, Hexagon.Corners.BottomLeft),
    BottomLeft: new Side("bottom left", Hexagon.Corners.BottomLeft, Hexagon.Corners.Left),
    TopLeft: new Side("top left", Hexagon.Corners.Left, Hexagon.Corners.TopLeft),
};

Hexagon.Sides.all = function() {
    return [
        Hexagon.Sides.Top,
        Hexagon.Sides.TopRight,
        Hexagon.Sides.BottomRight,
        Hexagon.Sides.Bottom,
        Hexagon.Sides.BottomLeft,
        Hexagon.Sides.TopLeft,
    ];
};

Hexagon.Sides.next = function(start) {
    var result;

    switch (start) {
    case Hexagon.Sides.Top:
        result = Hexagon.Sides.TopRight;
        break;
    case Hexagon.Sides.TopRight:
        result = Hexagon.Sides.BottomRight;
        break;
    case Hexagon.Sides.BottomRight:
        result = Hexagon.Sides.Bottom;
        break;
    case Hexagon.Sides.Bottom:
        result = Hexagon.Sides.BottomLeft;
        break;
    case Hexagon.Sides.BottomLeft:
        result = Hexagon.Sides.TopLeft;
        break;
    case Hexagon.Sides.TopLeft:
        result = Hexagon.Sides.Top;
        break;
    default:
        throw new Error("Unknown start side " + start);
    }

    return result;
};

Hexagon.Sides.opposite = function(start) {
    var result;

    switch (start) {
    case Hexagon.Sides.Top:
        result = Hexagon.Sides.Bottom;
        break;
    case Hexagon.Sides.TopRight:
        result = Hexagon.Sides.BottomLeft;
        break;
    case Hexagon.Sides.BottomRight:
        result = Hexagon.Sides.TopLeft;
        break;
    case Hexagon.Sides.Bottom:
        result = Hexagon.Sides.Top;
        break;
    case Hexagon.Sides.BottomLeft:
        result = Hexagon.Sides.TopRight;
        break;
    case Hexagon.Sides.TopLeft:
        result = Hexagon.Sides.BottomRight;
        break;
    default:
        throw new Error("Unknown start side " + start);
    }

    return result;
};

Hexagon.Sides.fromCorner = function(start) {
    var result;

    switch (start) {
    case Hexagon.Corners.TopLeft:
        result = Hexagon.Sides.Top;
        break;
    case Hexagon.Corners.TopRight:
        result = Hexagon.Sides.TopRight;
        break;
    case Hexagon.Corners.Right:
        result = Hexagon.Sides.BottomRight;
        break;
    case Hexagon.Corners.BottomRight:
        result = Hexagon.Sides.Bottom;
        break;
    case Hexagon.Corners.BottomLeft:
        result = Hexagon.Sides.BottomLeft;
        break;
    case Hexagon.Corners.Left:
        result = Hexagon.Sides.TopLeft;
        break;
    default:
        throw new Error("Unknown start side " + start);
    }

    return result;
};

Hexagon.prototype.getLineThroughMiddle = function() {
    var line,
        self = this;

    this.cornerPoints()
        .slice(0, 2)
        .some(function findTwoOpposingCorners(cornerPoint) {
            var oppositeCorner = (!!cornerPoint) && Hexagon.Corners.opposite(cornerPoint.corner),
                oppositeCornerPoint = (!!oppositeCorner) && self.getCornerPoint(oppositeCorner);

            line = oppositeCornerPoint && new Line(cornerPoint.point, oppositeCornerPoint.point);

            if (line) {
                return true;
            }

            return false;
        });

    return line || null;
};

Hexagon.prototype.getCenter = function() {
    var lineThroughMiddle = this.getLineThroughMiddle(),
        center = lineThroughMiddle && lineThroughMiddle.center();

    return center || null;
};

Hexagon.prototype.getCacheKey = function() {
    var center = this.getCenter(),
        centerCacheKey = center && center.cacheKey;

    return centerCacheKey || null;
};

Hexagon.prototype.cornerCount = function() {
    // TODO: get a library that has .count()
    var count = this.cornerPoints().reduce(function(prev, cornerPoint) {
        return prev + ((cornerPoint) ? 1 : 0);
    }, 0);

    return count;
};

Hexagon.prototype.isComplete = function() {
    return this.cornerCount() === NUMBER_OF_SIDES;
};

Hexagon.prototype.cornerPoints = function() {
    return [this.points.topLeft, this.points.topRight, this.points.right, this.points.bottomRight, this.points.bottomLeft, this.points.left];
};

Hexagon.prototype.getCornerPoint = function(corner) {
    var result = null;

    this.cornerPoints().some(function(cornerPoint) {
        // TODO: fix equality check
        if (cornerPoint.corner.rotation === corner.rotation) {
            result = cornerPoint;
            return true;
        }

        return false;
    });

    return result;
};

Hexagon.prototype.setCornerPoint = function(corner, point) {
    var cornerPoint = new CornerPoint(corner, point);

    switch (corner) {
    case Hexagon.Corners.TopLeft:
        this.points.topLeft = cornerPoint;
        break;
    case Hexagon.Corners.TopRight:
        this.points.topRight = cornerPoint;
        break;
    case Hexagon.Corners.Right:
        this.points.right = cornerPoint;
        break;
    case Hexagon.Corners.BottomRight:
        this.points.bottomRight = cornerPoint;
        break;
    case Hexagon.Corners.BottomLeft:
        this.points.bottomLeft = cornerPoint;
        break;
    case Hexagon.Corners.Left:
        this.points.left = cornerPoint;
        break;
    default:
        throw new Error("Unknown corner " + corner);
    }
};

Hexagon.prototype.sideCount = function() {
    // TODO: get a library that has .count()
    var count = this.sideLines().reduce(function(prev, sideLine) {
        return prev + (sideLine === undefined ? 0 : 1);
    }, 0);

    return count;
};

Hexagon.prototype.sideLines = function() {
    return [this.lines.top, this.lines.topRight, this.lines.bottomRight, this.lines.bottom, this.lines.bottomLeft, this.lines.topLeft];
};

Hexagon.prototype.getSideLine = function(side) {
    var result = null;

    this.sideLines().some(function(sideLine) {
        // TODO: fix equality check
        if (sideLine.side.getRotation() === side.getRotation()) {
            result = sideLine;
            return true;
        }

        return false;
    });

    return result;
};

Hexagon.prototype.setSideLine = function(side, line) {
    var sideLine = new SideLine(side, line);

    switch (side) {
    case Hexagon.Sides.Top:
        this.lines.top = sideLine;
        break;
    case Hexagon.Sides.TopRight:
        this.lines.topRight = sideLine;
        break;
    case Hexagon.Sides.BottomRight:
        this.lines.bottomRight = sideLine;
        break;
    case Hexagon.Sides.Bottom:
        this.lines.bottom = sideLine;
        break;
    case Hexagon.Sides.BottomLeft:
        this.lines.bottomLeft = sideLine;
        break;
    case Hexagon.Sides.TopLeft:
        this.lines.topLeft = sideLine;
        break;
    default:
        throw new Error("Unknown side " + side);
    }
};

module.exports = Hexagon;

},{"./corner.js":9,"./cornerpoint.js":10,"./line.js":13,"./side.js":15,"./sideline.js":16}],13:[function(require,module,exports){
var Point = require("./point.js");

function Line(start, end) {
    this.start = start;
    this.end = end;
    this.cacheKey = this._getCacheKey();
    this.__center = null;

    return this;
}

Line.prototype._getCacheKey = function() {
    var start = this.start.cacheKey,
        end = this.end.cacheKey,
        result;

    if (start < end) {
        result = start + "-" + end;
    } else {
        result = end + "-" + start;
    }

    return result;
};

Line.prototype._center = function() {
    var x = (this.start.x + this.end.x) / 2,
        y = (this.start.y + this.end.y) / 2,
        result = new Point(x, y);

    return result;
};

Line.prototype.center = function() {
    return (this.__center || (this.__center = this._center()));
};

module.exports = Line;

},{"./point.js":14}],14:[function(require,module,exports){
function Point(x, y) {
    this.x = x;
    this.y = y;
    this.cacheKey = this._getCacheKey();

    return this;
}

Point.prototype._getCacheKey = function() {
    var x = this.x.toFixed(3),
        y = this.y.toFixed(3),
        result = x + ", " + y;

    return result;
};

module.exports = Point;

},{}],15:[function(require,module,exports){
function Side(name, start, end) {
    this.name = name;
    this.start = start;
    this.end = end;

    return this;
}

Side.prototype.getRotation = function() {
    var start = this.start.rotation,
        end = this.end.rotation,
        temp,
        rotation;

    if (start > end) {
        temp = start;
        start = end;
        end = temp;
    }

    rotation = (start + ((end - start) / 2)) % 360;

    if ((end - start) > 180) {
        rotation += 180;
    }

    return rotation;
};

module.exports = Side;

},{}],16:[function(require,module,exports){
function SideLine(side, line) {
    this.side = side;
    this.line = line;

    return this;
}

module.exports = SideLine;

},{}],17:[function(require,module,exports){
function delay(fn, milliseconds) {
    var delayer = function() {
        var timeout = setTimeout(fn.bind(null), milliseconds);
    };

    return delayer;
}

module.exports = delay;

},{}],18:[function(require,module,exports){
var BASE = 10;

function limitPrecision(n, decimals) {
    var pow = Math.pow(BASE, decimals),
        result = Math.round(n * pow) / pow;

    return result;
}

module.exports = limitPrecision;

},{}],19:[function(require,module,exports){
var once = require("./once.js");

function mouseDetector(fn) {
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

module.exports = mouseDetector;

},{"./once.js":20}],20:[function(require,module,exports){
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

module.exports = once;

},{}],21:[function(require,module,exports){
function oneAtATimePlease(fn) {
    var running = false,
        wrapper = function oneAtATimePleaseWrapper() {
            if (running) {
                return;
            }
            running = true;

            fn.call(null);

            running = false;
        };

    return wrapper;
}

module.exports = oneAtATimePlease;

},{}],22:[function(require,module,exports){
function wrap(name, fn) {
    var wrapped = function() {
        var result;

        /* eslint-disable no-console */
        if (console && console.timeline)
        {
            console.timeline(name);
        }

        if (console && console.profile)
        {
            console.profile(name);
        }

        result = fn.call(null);

        if (console && console.timelineEnd)
        {
            console.timelineEnd();
        }

        if (console && console.profileEnd)
        {
            console.profileEnd();
        }
        /* eslint-enable no-console */

        return result;
    };

    return wrapped;
}

var api = {
    wrap: wrap,
};

module.exports = api;

},{}],23:[function(require,module,exports){
function floatingPoint(from, to) {
    if (to === undefined) {
        to = from;
        from = 0;
    }

    var rnd = Math.random(),
        result = from + (rnd * to);

    return result;
}

function integer(from, to) {
    var fp = floatingPoint(from, to),
        result = Math.floor(fp);

    return result;
}

var api = {
    floatingPoint: floatingPoint,
    integer: integer,
};

module.exports = api;

},{}],24:[function(require,module,exports){
function resizeDetector(element, fn) {
    // Currently not checking for height changes because that would
    // reset the element every time the developer console was toggled.

    // Chrome on Android also triggers a resize when scrolling enough to
    // hide the address bar and menu.

    // TODO: read this value once after element has been drawn, otherwise the first
    // resize, even if in height, will trigger the drawing.
    var previousElementWidth = 0;

    // TODO: remove listener?
    window.addEventListener("resize", function onResizeEventListener() {
        if (!element) {
            fn.call(null);
            return;
        }

        if (previousElementWidth !== element.scrollWidth) {
            previousElementWidth = element.scrollWidth;

            fn.call(null);
            return;
        }
    });
}

module.exports = resizeDetector;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L2Zha2VfNDhhNDkyOWUuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL2xvZ2ljL2FjdGl2aXR5LW1vbml0b3IuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL2xvZ2ljL2V2ZW50cy5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvbG9naWMvZ3JhcGgtb2JqZWN0cy10b29sLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9sb2dpYy9ncmFwaGVyLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9sb2dpYy9oaWdobGlnaHQtb24taW50ZXJ2YWwuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL2xvZ2ljL3JlbmRlcmVyLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9vYmplY3RzL2FyZWEuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL29iamVjdHMvY29ybmVyLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9vYmplY3RzL2Nvcm5lcnBvaW50LmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9vYmplY3RzL2dvbmlmLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9vYmplY3RzL2hleGFnb24uanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL29iamVjdHMvbGluZS5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvb2JqZWN0cy9wb2ludC5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvb2JqZWN0cy9zaWRlLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9vYmplY3RzL3NpZGVsaW5lLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy91dGlscy9kZWxheS5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvdXRpbHMvbGltaXQtcHJlY2lzaW9uLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy91dGlscy9tb3VzZS1kZXRlY3Rvci5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvdXRpbHMvb25jZS5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvdXRpbHMvb25lLWF0LWEtdGltZS1wbGVhc2UuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL3V0aWxzL3Byb2ZpbGluZy5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvdXRpbHMvcmFuZG9tLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy91dGlscy9yZXNpemUtZGV0ZWN0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL09BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gbWFpbigpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciBQb2ludCA9IHJlcXVpcmUoXCIuL21vZHVsZXMvb2JqZWN0cy9wb2ludC5qc1wiKSxcbiAgICAgICAgLy8gTk9URTogZGVidWcuXG4gICAgICAgIC8vIExpbmUgPSByZXF1aXJlKFwiLi9tb2R1bGVzL29iamVjdHMvbGluZS5qc1wiKSxcbiAgICAgICAgZ3JhcGhlciA9IHJlcXVpcmUoXCIuL21vZHVsZXMvbG9naWMvZ3JhcGhlci5qc1wiKSxcbiAgICAgICAgcmVuZGVyZXIgPSByZXF1aXJlKFwiLi9tb2R1bGVzL2xvZ2ljL3JlbmRlcmVyLmpzXCIpLFxuICAgICAgICBwcm9maWxpbmcgPSByZXF1aXJlKFwiLi9tb2R1bGVzL3V0aWxzL3Byb2ZpbGluZy5qc1wiKSxcbiAgICAgICAgLy8gTk9URTogZGVidWcuXG4gICAgICAgIC8vIHJhbmRvbSA9IHJlcXVpcmUoXCIuL21vZHVsZXMvdXRpbHMvcmFuZG9tLmpzXCIpLFxuICAgICAgICByZXNpemVEZXRlY3RvciA9IHJlcXVpcmUoXCIuL21vZHVsZXMvdXRpbHMvcmVzaXplLWRldGVjdG9yLmpzXCIpLFxuICAgICAgICBtb3VzZURldGVjdG9yID0gcmVxdWlyZShcIi4vbW9kdWxlcy91dGlscy9tb3VzZS1kZXRlY3Rvci5qc1wiKSxcbiAgICAgICAgb25jZSA9IHJlcXVpcmUoXCIuL21vZHVsZXMvdXRpbHMvb25jZS5qc1wiKSxcbiAgICAgICAgb25lQXRBVGltZVBsZWFzZSA9IHJlcXVpcmUoXCIuL21vZHVsZXMvdXRpbHMvb25lLWF0LWEtdGltZS1wbGVhc2UuanNcIiksXG4gICAgICAgIGRlbGF5ID0gcmVxdWlyZShcIi4vbW9kdWxlcy91dGlscy9kZWxheS5qc1wiKSxcbiAgICAgICAgSGV4RXZlbnQgPSByZXF1aXJlKFwiLi9tb2R1bGVzL2xvZ2ljL2V2ZW50cy5qc1wiKSxcbiAgICAgICAgQWN0aXZpdHlNb25pdG9yID0gcmVxdWlyZShcIi4vbW9kdWxlcy9sb2dpYy9hY3Rpdml0eS1tb25pdG9yLmpzXCIpLFxuICAgICAgICBHcmFwaE9iamVjdHNUb29sID0gcmVxdWlyZShcIi4vbW9kdWxlcy9sb2dpYy9ncmFwaC1vYmplY3RzLXRvb2wuanNcIiksXG4gICAgICAgIEhpZ2hsaWdodE9uSW50ZXJ2YWwgPSByZXF1aXJlKFwiLi9tb2R1bGVzL2xvZ2ljL2hpZ2hsaWdodC1vbi1pbnRlcnZhbC5qc1wiKSxcbiAgICAgICAgZGVib3VuY2UgPSAod2luZG93LkNvd2JveSB8fCB3aW5kb3cualF1ZXJ5KS5kZWJvdW5jZSxcblxuICAgICAgICBjYW52YXNJZCA9IFwiaGV4YWdvbmlmXCIsXG4gICAgICAgIGNhbnZhc0NvbnRhaW5lcklkID0gXCJoZXhhZ29uaWYtY29udGFpbmVyXCIsXG5cbiAgICAgICAgcnVuID0gb25lQXRBVGltZVBsZWFzZShnZW5lcmF0ZUFuZFJlbmRlcik7XG5cbiAgICBmdW5jdGlvbiBnZXRDYW52YXMoKSB7XG4gICAgICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjYW52YXNJZCk7XG5cbiAgICAgICAgcmV0dXJuIGNhbnZhcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVDYW52YXMoKSB7XG4gICAgICAgIHZhciBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjYW52YXNDb250YWluZXJJZCksXG4gICAgICAgICAgICBjYW52YXMsXG4gICAgICAgICAgICBpO1xuXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb250YWluZXIuY2hpbGRFbGVtZW50Q291bnQ7IGkrKykge1xuICAgICAgICAgICAgY29udGFpbmVyLnJlbW92ZUNoaWxkKGNvbnRhaW5lci5jaGlsZHJlbltpXSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcbiAgICAgICAgY2FudmFzLmlkID0gY2FudmFzSWQ7XG4gICAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoY2FudmFzLCBjb250YWluZXIuY2hpbGRyZW5bMF0pO1xuXG4gICAgICAgIHJldHVybiBjYW52YXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FsY3VsYXRlSGV4YWdvblNpZGVMZW5ndGgoKSB7XG4gICAgICAgIC8vIFRPRE8gREVCVUcgUkVNT1ZFXG4gICAgICAgIHJldHVybiAxMDA7XG5cbiAgICAgICAgLy8gdmFyIGNhbnZhcyA9IGdldENhbnZhcygpLFxuICAgICAgICAvLyAgICAgYWJzb2x1dGVNaW4gPSA3NSxcbiAgICAgICAgLy8gICAgIGFic29sdXRlTWF4ID0gMTUwLFxuICAgICAgICAvLyAgICAgc2hvcnRlc3RDYW52YXNTaWRlID0gTWF0aC5taW4oY2FudmFzLnNjcm9sbFdpZHRoLCBjYW52YXMuc2Nyb2xsSGVpZ2h0KSxcbiAgICAgICAgLy8gICAgIG1pbiA9IE1hdGgubWF4KGFic29sdXRlTWluLCBzaG9ydGVzdENhbnZhc1NpZGUgLyAyMCksXG4gICAgICAgIC8vICAgICBtYXggPSBNYXRoLm1pbihhYnNvbHV0ZU1heCwgc2hvcnRlc3RDYW52YXNTaWRlIC8gMTApO1xuICAgICAgICAvL1xuICAgICAgICAvLyByZXR1cm4gcmFuZG9tLmludGVnZXIobWluLCBtYXgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlQW5kUmVuZGVyKCkge1xuICAgICAgICB2YXIgY2FudmFzID0gY3JlYXRlQ2FudmFzKCksXG4gICAgICAgICAgICBjYW52YXNBcmVhID0gbmV3IFBvaW50KGNhbnZhcy5zY3JvbGxXaWR0aCwgY2FudmFzLnNjcm9sbEhlaWdodCksXG4gICAgICAgICAgICBoZXhhZ29uU2lkZUxlbmd0aCA9IGNhbGN1bGF0ZUhleGFnb25TaWRlTGVuZ3RoKCksXG4gICAgICAgICAgICBwcm9maWxlZEdyYXBoZXIgPSBwcm9maWxpbmcud3JhcChcImdyYXBoZXJcIiwgZnVuY3Rpb24gcHJvZmlsZWRHcmFwaGVyV3JhcHBlcigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZ3JhcGhlcihjYW52YXNBcmVhLCBoZXhhZ29uU2lkZUxlbmd0aCk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIGdyYXBoT2JqZWN0cyA9IHByb2ZpbGVkR3JhcGhlcigpLFxuICAgICAgICAgICAgZ3JhcGhPYmplY3RzVG9vbCA9IG5ldyBHcmFwaE9iamVjdHNUb29sKGdyYXBoT2JqZWN0cyksXG4gICAgICAgICAgICBwcm9maWxlZFJlbmRlcmVyID0gcHJvZmlsaW5nLndyYXAoXCJyZW5kZXJlclwiLCBmdW5jdGlvbiBwcm9maWxlZFJlbmRlcmVyV3JhcHBlcigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVuZGVyZXIoY2FudmFzSWQsIGNhbnZhc0FyZWEsIGdyYXBoT2JqZWN0cyk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIGhleEV2ZW50ID0gbmV3IEhleEV2ZW50KGNhbnZhcyksXG4gICAgICAgICAgICBhY3Rpdml0eU1vbml0b3IgPSBuZXcgQWN0aXZpdHlNb25pdG9yKGhleEV2ZW50KSxcbiAgICAgICAgICAgIC8vIE5PVEU6IGRlYnVnLlxuICAgICAgICAgICAgLy8gYWRkR29uaWZOZWlnaGJvckRlYnVnTGluZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vICAgICBPYmplY3Qua2V5cyhncmFwaE9iamVjdHMuZ29uaWZzKS5mb3JFYWNoKGZ1bmN0aW9uKGdvbmlmS2V5KSB7XG4gICAgICAgICAgICAvLyAgICAgICAgIHZhciBnb25pZiA9IGdyYXBoT2JqZWN0cy5nb25pZnNbZ29uaWZLZXldLFxuICAgICAgICAgICAgLy8gICAgICAgICAgICAgZnJvbUNlbnRlciA9IGdvbmlmLmhleGFnb24uZ2V0Q2VudGVyKCk7XG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gICAgICAgICBpZiAoIWZyb21DZW50ZXIpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vICAgICAgICAgZ29uaWYuZ2V0TmVpZ2hib3JzKCkuZm9yRWFjaChmdW5jdGlvbihuZWlnaGJvcikge1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgaWYgKG5laWdoYm9yKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgdmFyIHRvTGluZSA9IG5laWdoYm9yLmhleGFnb24uZ2V0TGluZVRocm91Z2hNaWRkbGUoKSxcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICAgICAgdG9DZW50ZXIgPSB0b0xpbmUgJiYgdG9MaW5lLmNlbnRlcigpO1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBpZiAoIXRvQ2VudGVyKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgICAgIHZhciBsaW5lID0gbmV3IExpbmUoZnJvbUNlbnRlciwgdG9DZW50ZXIpO1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICAgICBncmFwaE9iamVjdHMubGluZXNbbGluZS5jYWNoZUtleV0gPSBsaW5lO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgICAgIC8vIH0sXG4gICAgICAgICAgICBzZXR1cEFjdGl2aXR5TW9uaXRvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHN0YXJ0QWN0aXZpdGllcygpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFoaWdobGlnaHRPbkludGVydmFsLmlzU3RhcnRlZCgpKVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoaWdobGlnaHRPbkludGVydmFsLnN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBzdG9wQWN0aXZpdGllcygpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhpZ2hsaWdodE9uSW50ZXJ2YWwuaXNTdGFydGVkKCkpXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZ2hsaWdodE9uSW50ZXJ2YWwuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaGV4RXZlbnQubGlzdGVuKFwidXNlci5hY3Rpdml0eVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRBY3Rpdml0aWVzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaGV4RXZlbnQubGlzdGVuKFwidXNlci5pbmFjdGl2aXR5XCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBzdG9wQWN0aXZpdGllcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYWN0aXZpdHlNb25pdG9yLnN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgc3RhcnRBY3Rpdml0aWVzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2NlbmUsXG4gICAgICAgICAgICBoaWdobGlnaHRPbkludGVydmFsO1xuXG4gICAgICAgIC8vIE5PVEU6IGRlYnVnLlxuICAgICAgICAvLyBhZGRHb25pZk5laWdoYm9yRGVidWdMaW5lcygpO1xuXG4gICAgICAgIHNjZW5lID0gcHJvZmlsZWRSZW5kZXJlcigpO1xuICAgICAgICBoaWdobGlnaHRPbkludGVydmFsID0gbmV3IEhpZ2hsaWdodE9uSW50ZXJ2YWwoc2NlbmUsIGdyYXBoT2JqZWN0c1Rvb2wsIGhleEV2ZW50KTtcbiAgICAgICAgc2V0dXBBY3Rpdml0eU1vbml0b3IoKTtcbiAgICB9XG5cbiAgICBtb3VzZURldGVjdG9yKG9uY2UocnVuKSk7XG4gICAgcmVzaXplRGV0ZWN0b3IoZ2V0Q2FudmFzKCksIGRlYm91bmNlKDEwMDAsIGRlbGF5KHJ1biwgMTAwKSkpO1xufSgpKTtcbiIsIi8vIFRPRE86IHVzZSBIZXhFdmVudD9cbi8vIHZhciBIZXhFdmVudCA9IHJlcXVpcmUoXCIuL2V2ZW50cy5qc1wiKTtcbnZhciBhY3Rpdml0eUV2ZW50TmFtZSA9IFwidXNlci5hY3Rpdml0eVwiLFxuICAgIGluYWN0aXZpdHlFdmVudE5hbWUgPSBcInVzZXIuaW5hY3Rpdml0eVwiO1xuXG5mdW5jdGlvbiBBY3Rpdml0eU1vbml0b3IoaGV4RXZlbnQsIGxpbWl0KSB7XG4gICAgdGhpcy5oZXhFdmVudCA9IGhleEV2ZW50O1xuICAgIHRoaXMubGltaXRNaWxsaXNlY29uZHMgPSBsaW1pdCB8fCA2MCAqIDEwMDA7XG5cbiAgICB0aGlzLmNoZWNraW5nSW50ZXJ2YWxNaWxsaXNlY29uZHMgPSBNYXRoLmZsb29yKHRoaXMubGltaXRNaWxsaXNlY29uZHMgLyAyKTtcbiAgICB0aGlzLmxhdGVzdEFjdGl2aXR5VGltZXN0YW1wID0gbnVsbDtcbiAgICB0aGlzLmFjdGl2aXR5SW50ZXJ2YWwgPSBudWxsO1xuICAgIHRoaXMuaXNNb25pdG9yU3RhcnRlZCA9IGZhbHNlO1xuICAgIHRoaXMuaXNVc2VySXNBY3RpdmUgPSBmYWxzZTtcbn1cblxuQWN0aXZpdHlNb25pdG9yLnByb3RvdHlwZS5nZXRUaW1lc3RhbXAgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IERhdGUoKS52YWx1ZU9mKCk7XG59O1xuXG5BY3Rpdml0eU1vbml0b3IucHJvdG90eXBlLnJlc2V0QWN0aXZpdHlJbnRlcnZhbCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubGF0ZXN0QWN0aXZpdHlUaW1lc3RhbXAgPSB0aGlzLmdldFRpbWVzdGFtcCgpO1xufTtcblxuQWN0aXZpdHlNb25pdG9yLnByb3RvdHlwZS5zdGFydEFjdGl2aXR5SW50ZXJ2YWwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmFjdGl2aXR5SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCh0aGlzLmNoZWNrQWN0aXZpdHlJbnRlcnZhbC5iaW5kKHRoaXMpLCB0aGlzLmNoZWNraW5nSW50ZXJ2YWxNaWxsaXNlY29uZHMpO1xufTtcblxuQWN0aXZpdHlNb25pdG9yLnByb3RvdHlwZS5zdG9wQWN0aXZpdHlJbnRlcnZhbCA9IGZ1bmN0aW9uKCkge1xuICAgIGNsZWFySW50ZXJ2YWwodGhpcy5hY3Rpdml0eUludGVydmFsKTtcblxuICAgIHRoaXMuYWN0aXZpdHlJbnRlcnZhbCA9IG51bGw7XG59O1xuXG5BY3Rpdml0eU1vbml0b3IucHJvdG90eXBlLmNoZWNrQWN0aXZpdHlJbnRlcnZhbCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmIChNYXRoLmFicyh0aGlzLmdldFRpbWVzdGFtcCgpIC0gdGhpcy5sYXRlc3RBY3Rpdml0eVRpbWVzdGFtcCkgPiB0aGlzLmxpbWl0TWlsbGlzZWNvbmRzKSB7XG4gICAgICAgIHRoaXMuaW5hY3Rpdml0eURldGVjdGVkKCk7XG4gICAgfVxufTtcblxuQWN0aXZpdHlNb25pdG9yLnByb3RvdHlwZS5hY3Rpdml0eURldGVjdGVkID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pc1VzZXJJc0FjdGl2ZSA9IHRydWU7XG4gICAgdGhpcy5yZXNldEFjdGl2aXR5SW50ZXJ2YWwoKTtcblxuICAgIGlmICh0aGlzLmFjdGl2aXR5SW50ZXJ2YWwgPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5zdGFydEFjdGl2aXR5SW50ZXJ2YWwoKTtcbiAgICB9XG5cbiAgICB0aGlzLmhleEV2ZW50LmZpcmUoYWN0aXZpdHlFdmVudE5hbWUpO1xufTtcblxuQWN0aXZpdHlNb25pdG9yLnByb3RvdHlwZS5pbmFjdGl2aXR5RGV0ZWN0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3BBY3Rpdml0eUludGVydmFsKCk7XG4gICAgdGhpcy5pc1VzZXJJc0FjdGl2ZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5oZXhFdmVudC5maXJlKGluYWN0aXZpdHlFdmVudE5hbWUpO1xufTtcblxuQWN0aXZpdHlNb25pdG9yLnByb3RvdHlwZS5pc1N0YXJ0ZWQgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5pc01vbml0b3JTdGFydGVkID09PSB0cnVlO1xufTtcblxuQWN0aXZpdHlNb25pdG9yLnByb3RvdHlwZS5pc1VzZXJJc0FjdGl2ZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmlzVXNlcklzQWN0aXZlID09PSB0cnVlO1xufTtcblxuQWN0aXZpdHlNb25pdG9yLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmlzU3RhcnRlZCgpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIldhcyBhbHJlYWR5IHN0YXJ0ZWQuXCIpO1xuICAgIH1cblxuICAgIHRoaXMucmVzZXRBY3Rpdml0eUludGVydmFsKCk7XG4gICAgdGhpcy5zdGFydEFjdGl2aXR5SW50ZXJ2YWwoKTtcblxuICAgIC8vIFRPRE86IHVzZSBoZXhhZ29uaWYgdHJpZ2dlcmVkIGV2ZW50cz9cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHRoaXMuYWN0aXZpdHlEZXRlY3RlZC5iaW5kKHRoaXMpKTtcbn07XG5cbkFjdGl2aXR5TW9uaXRvci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmlzU3RhcnRlZCgpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIldhcyBub3Qgc3RhcnRlZC5cIik7XG4gICAgfVxuXG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCB0aGlzLmFjdGl2aXR5RGV0ZWN0ZWQuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLnN0b3BBY3Rpdml0eUludGVydmFsKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFjdGl2aXR5TW9uaXRvcjtcbiIsImZ1bmN0aW9uIEhleEV2ZW50cyhjYW52YXNFbGVtZW50LCBuYW1lc3BhY2VQcmVmaXgpIHtcbiAgICB0aGlzLmNhbnZhc0VsZW1lbnQgPSBjYW52YXNFbGVtZW50O1xuICAgIHRoaXMubmFtZXNwYWNlUHJlZml4ID0gbmFtZXNwYWNlUHJlZml4IHx8IFwiaGV4YWdvbmlmLlwiO1xufVxuXG5IZXhFdmVudHMucHJvdG90eXBlLmdldEV2ZW50TmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5uYW1lc3BhY2VQcmVmaXggKyBuYW1lO1xufTtcblxuSGV4RXZlbnRzLnByb3RvdHlwZS5maXJlID0gZnVuY3Rpb24obmFtZSwgZ3JhcGhpYywgb2JqZWN0KSB7XG4gICAgdmFyIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJIVE1MRXZlbnRzXCIpLFxuICAgICAgICBuYW1lc3BhY2VkTmFtZSA9IHRoaXMuZ2V0RXZlbnROYW1lKG5hbWUpO1xuXG4gICAgZXZlbnQuaW5pdEV2ZW50KG5hbWVzcGFjZWROYW1lLCB0cnVlLCB0cnVlKTtcbiAgICBldmVudC5ncmFwaGljID0gZ3JhcGhpYztcbiAgICBldmVudC5vYmplY3QgPSBvYmplY3Q7XG4gICAgcmV0dXJuIHRoaXMuY2FudmFzRWxlbWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn07XG5cbkhleEV2ZW50cy5wcm90b3R5cGUubGlzdGVuID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgICB2YXIgbmFtZXNwYWNlZE5hbWUgPSB0aGlzLmdldEV2ZW50TmFtZShuYW1lKTtcblxuICAgIHRoaXMuY2FudmFzRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKG5hbWVzcGFjZWROYW1lLCBmbik7XG59O1xuXG5IZXhFdmVudHMucHJvdG90eXBlLmNhbmNlbCA9IGZ1bmN0aW9uKG5hbWUsIGZuKSB7XG4gICAgdmFyIG5hbWVzcGFjZWROYW1lID0gdGhpcy5nZXRFdmVudE5hbWUobmFtZSk7XG5cbiAgICB0aGlzLmNhbnZhc0VsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lc3BhY2VkTmFtZSwgZm4pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIZXhFdmVudHM7XG4iLCJ2YXIgcmFuZG9tID0gcmVxdWlyZShcIi4uL3V0aWxzL3JhbmRvbS5qc1wiKTtcblxuZnVuY3Rpb24gR3JhcGhPYmplY3RzVG9vbChncmFwaE9iamVjdHMpIHtcbiAgICB0aGlzLmdyYXBoT2JqZWN0cyA9IGdyYXBoT2JqZWN0cztcbn1cblxuR3JhcGhPYmplY3RzVG9vbC5wcm90b3R5cGUuZ2V0UmFuZG9tT2JqZWN0ID0gZnVuY3Rpb24ob2JqZWN0cykge1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqZWN0cyksXG4gICAgICAgIGNvdW50ID0ga2V5cy5sZW5ndGgsXG4gICAgICAgIHJuZCA9IHJhbmRvbS5pbnRlZ2VyKDAsIGNvdW50KSxcbiAgICAgICAga2V5ID0ga2V5c1tybmRdLFxuICAgICAgICBvYmplY3QgPSBvYmplY3RzW2tleV07XG5cbiAgICByZXR1cm4gb2JqZWN0O1xufTtcblxuR3JhcGhPYmplY3RzVG9vbC5wcm90b3R5cGUuZ2V0UmFuZG9tSGV4YWdvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBoZXhhZ29uID0gdGhpcy5nZXRSYW5kb21PYmplY3QodGhpcy5ncmFwaE9iamVjdHMuaGV4YWdvbnMpO1xuXG4gICAgcmV0dXJuIGhleGFnb247XG59O1xuXG5HcmFwaE9iamVjdHNUb29sLnByb3RvdHlwZS5nZXRSYW5kb21MaW5lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxpbmUgPSB0aGlzLmdldFJhbmRvbU9iamVjdCh0aGlzLmdyYXBoT2JqZWN0cy5saW5lcyk7XG5cbiAgICByZXR1cm4gbGluZTtcbn07XG5cbkdyYXBoT2JqZWN0c1Rvb2wucHJvdG90eXBlLmdldFJhbmRvbU5vZGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMuZ2V0UmFuZG9tT2JqZWN0KHRoaXMuZ3JhcGhPYmplY3RzLm5vZGVzKTtcblxuICAgIHJldHVybiBub2RlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHcmFwaE9iamVjdHNUb29sO1xuIiwidmFyIFBvaW50ID0gcmVxdWlyZShcIi4uL29iamVjdHMvcG9pbnQuanNcIiksXG4gICAgTGluZSA9IHJlcXVpcmUoXCIuLi9vYmplY3RzL2xpbmUuanNcIiksXG4gICAgSGV4YWdvbiA9IHJlcXVpcmUoXCIuLi9vYmplY3RzL2hleGFnb24uanNcIiksXG4gICAgR29uaWYgPSByZXF1aXJlKFwiLi4vb2JqZWN0cy9nb25pZi5qc1wiKSxcbiAgICBBcmVhID0gcmVxdWlyZShcIi4uL29iamVjdHMvYXJlYS5qc1wiKSxcbiAgICBsaW1pdFByZWNpc2lvbiA9IHJlcXVpcmUoXCIuLi91dGlscy9saW1pdC1wcmVjaXNpb24uanNcIik7XG5cbmZ1bmN0aW9uIGdldE9yR2VuZXJhdGVIZXhhZ29uKGNhY2hlLCBoZXhhZ29uU2lkZUxlbmd0aCwgc3RhcnRQb2ludCwgc3RhcnRDb3JuZXIpIHtcbiAgICB2YXIgaGV4YWdvbiA9IG5ldyBIZXhhZ29uKCk7XG5cbiAgICB2YXIgcG9pbnQgPSBzdGFydFBvaW50LFxuICAgICAgICBjb3JuZXIgPSBzdGFydENvcm5lcjtcblxuICAgIGRvIHtcbiAgICAgICAgLy8gUG9pbnRzIGFuZCBjb3JuZXJzXG4gICAgICAgIHZhciBwb2ludENhY2hlS2V5ID0gcG9pbnQuY2FjaGVLZXksXG4gICAgICAgICAgICBjYWNoZWRQb2ludCA9IGNhY2hlLm5vZGVzW3BvaW50Q2FjaGVLZXldO1xuXG4gICAgICAgIGlmIChjYWNoZWRQb2ludCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjYWNoZS5ub2Rlc1twb2ludENhY2hlS2V5XSA9IHBvaW50O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcG9pbnQgPSBjYWNoZWRQb2ludDtcbiAgICAgICAgfVxuXG4gICAgICAgIGhleGFnb24uc2V0Q29ybmVyUG9pbnQoY29ybmVyLCBwb2ludCk7XG5cbiAgICAgICAgdmFyIG5leHRDb3JuZXIgPSBIZXhhZ29uLkNvcm5lcnMubmV4dChjb3JuZXIpO1xuICAgICAgICB2YXIgeCA9IGxpbWl0UHJlY2lzaW9uKHBvaW50LnggLSAoaGV4YWdvblNpZGVMZW5ndGggKiBNYXRoLmNvcyhjb3JuZXIucmFkKSksIDUpLFxuICAgICAgICAgICAgeSA9IGxpbWl0UHJlY2lzaW9uKHBvaW50LnkgKyAoaGV4YWdvblNpZGVMZW5ndGggKiBNYXRoLnNpbihjb3JuZXIucmFkKSksIDUpO1xuICAgICAgICB2YXIgbmV4dFBvaW50ID0gbmV3IFBvaW50KHgsIHkpO1xuXG4gICAgICAgIC8vIExpbmVzIGFuZCBzaWRlc1xuICAgICAgICB2YXIgbGluZSA9IG5ldyBMaW5lKHBvaW50LCBuZXh0UG9pbnQpO1xuXG4gICAgICAgIHZhciBsaW5lQ2FjaGVLZXkgPSBsaW5lLmNhY2hlS2V5LFxuICAgICAgICAgICAgY2FjaGVkTGluZSA9IGNhY2hlLmxpbmVzW2xpbmVDYWNoZUtleV07XG5cbiAgICAgICAgaWYgKGNhY2hlZExpbmUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY2FjaGUubGluZXNbbGluZUNhY2hlS2V5XSA9IGxpbmU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy90aHJvdyBuZXcgRXJyb3IoXCJMaW5lIGFscmVhZHkgZXhpc3RzIFwiICsgbGluZS5jYWNoZUtleSlcbiAgICAgICAgICAgIGxpbmUgPSBjYWNoZWRMaW5lO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNpZGUgPSBIZXhhZ29uLlNpZGVzLmZyb21Db3JuZXIoY29ybmVyKTtcblxuICAgICAgICBoZXhhZ29uLnNldFNpZGVMaW5lKHNpZGUsIGxpbmUpO1xuXG4gICAgICAgIC8vIFBhc3MgdG8gbmV4dCBpdGVyYXRpb24uXG4gICAgICAgIHBvaW50ID0gbmV4dFBvaW50O1xuICAgICAgICBjb3JuZXIgPSBuZXh0Q29ybmVyO1xuXG4gICAgICAgIC8vIFRPRE86IGZpeCBlcXVhbGl0eSBjaGVja1xuICAgIH0gd2hpbGUgKGNvcm5lci5yb3RhdGlvbiAhPT0gc3RhcnRDb3JuZXIucm90YXRpb24pO1xuXG4gICAgLy8gSGV4YWdvblxuICAgIHtcbiAgICAgICAgLy8gVE9ETzogYmFzZSBjYWNoZSBrZXkgb24gbG9jYXRpb24gaW5kZXgsIHNvIHRoaXMgY2hlY2sgY2FuIGJlIGRvbmUgbXVjaCBlYXJsaWVyLlxuICAgICAgICAvLyBUT0RPOiBnZW5lcmF0ZSBoZXhhZ29ucyB3aXRoIG5laWdodGJvcnMgaW5zdGVhZCBvZiBwb2ludHMsIHNvIHRoZSBjaGVjayBpcyBlYXNpZXIuXG4gICAgICAgIHZhciBoZXhhZ29uQ2FjaGVLZXkgPSBoZXhhZ29uLmdldENhY2hlS2V5KCksXG4gICAgICAgICAgICBjYWNoZWRIZXhhZ29uID0gY2FjaGUuaGV4YWdvbnNbaGV4YWdvbkNhY2hlS2V5XTtcblxuICAgICAgICBpZiAoY2FjaGVkSGV4YWdvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoY2FjaGVkSGV4YWdvbi5pc0NvbXBsZXRlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkSGV4YWdvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaGV4YWdvbiA9IGNhY2hlZEhleGFnb247XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZS5oZXhhZ29uc1toZXhhZ29uQ2FjaGVLZXldID0gaGV4YWdvbjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBoZXhhZ29uO1xufVxuXG5mdW5jdGlvbiBnb25pZkV4aXN0cyhjYWNoZSwgZ29uaWYpIHtcbiAgICByZXR1cm4gISFjYWNoZS5nb25pZnNbZ29uaWYuY2FjaGVLZXldO1xufVxuXG5mdW5jdGlvbiBnZXRPckdlbmVyYXRlR29uaWYoY2FjaGUsIGhleGFnb25TaWRlTGVuZ3RoLCBzdGFydFBvaW50LCBzdGFydFNpZGUpIHtcbiAgICB2YXIgc3RhcnRDb3JuZXIgPSBzdGFydFNpZGUuc3RhcnQsXG4gICAgICAgIGhleGFnb24gPSBnZXRPckdlbmVyYXRlSGV4YWdvbihjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgsIHN0YXJ0UG9pbnQsIHN0YXJ0Q29ybmVyKSxcbiAgICAgICAgZ29uaWYgPSBuZXcgR29uaWYoaGV4YWdvbik7XG5cbiAgICBpZiAoZ29uaWZFeGlzdHMoY2FjaGUsIGdvbmlmKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHb25pZiBnZW5lcmF0aW9uIGNvbGxpc2lvbi5cIik7XG4gICAgfVxuXG4gICAgY2FjaGUuZ29uaWZzW2dvbmlmLmNhY2hlS2V5XSA9IGdvbmlmO1xuXG4gICAgcmV0dXJuIGdvbmlmO1xufVxuXG5mdW5jdGlvbiBlYWNoU2hhcmVkTmVpZ2hib3JEaXJlY3Rpb24oZ29uaWYsIG5laWdoYm9yLCBzaWRlc1RvQ2hlY2ssIHNoYXJlZE5laWdoYm9yRGlyZWN0aW9uKSB7XG4gICAgdmFyIHNoYXJlZE5laWdoYm9yID0gbmVpZ2hib3IuZ2V0TmVpZ2hib3Ioc2hhcmVkTmVpZ2hib3JEaXJlY3Rpb24uZnJvbU5laWdoYm9yKTtcblxuICAgIGlmICgoISFzaGFyZWROZWlnaGJvcikgJiYgZ29uaWYuZ2V0TmVpZ2hib3Ioc2hhcmVkTmVpZ2hib3JEaXJlY3Rpb24uZnJvbUhlcmUpICE9PSBzaGFyZWROZWlnaGJvcikge1xuICAgICAgICBnb25pZi5zZXROZWlnaGJvcihzaGFyZWROZWlnaGJvckRpcmVjdGlvbi5mcm9tSGVyZSwgc2hhcmVkTmVpZ2hib3IpO1xuICAgICAgICBzaGFyZWROZWlnaGJvci5zZXROZWlnaGJvcihIZXhhZ29uLlNpZGVzLm9wcG9zaXRlKHNoYXJlZE5laWdoYm9yRGlyZWN0aW9uLmZyb21IZXJlKSwgZ29uaWYpO1xuXG4gICAgICAgIC8vIEluIGNhc2UgdGhpcyBvbmUgaGFzIG5laWdoYm9ycyBzdGlsbCB1bmtub3duLCBidXQgYWxyZWFkeSBjaGVja2VkIGluIHRoZSBpbml0YWwgcGFzcy5cbiAgICAgICAgc2lkZXNUb0NoZWNrLnB1c2goc2hhcmVkTmVpZ2hib3JEaXJlY3Rpb24uZnJvbUhlcmUpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYWRkTmVpZ2hib3JzKGdvbmlmKSB7XG4gICAgdmFyIHNpZGVzVG9DaGVjayA9IEhleGFnb24uU2lkZXMuYWxsKCksXG4gICAgICAgIHNpZGUgPSBzaWRlc1RvQ2hlY2suc2hpZnQoKTtcblxuICAgIHdoaWxlIChzaWRlKSB7XG4gICAgICAgIHZhciBuZWlnaGJvciA9IGdvbmlmLmdldE5laWdoYm9yKHNpZGUpO1xuXG4gICAgICAgIGlmIChuZWlnaGJvcikge1xuICAgICAgICAgICAgdmFyIGJvdW5kRWFjaFNoYXJlZE5laWdoYm9yRGlyZWN0aW9uID0gZWFjaFNoYXJlZE5laWdoYm9yRGlyZWN0aW9uLmJpbmQobnVsbCwgZ29uaWYsIG5laWdoYm9yLCBzaWRlc1RvQ2hlY2spLFxuICAgICAgICAgICAgICAgIHNoYXJlZE5laWdoYm9yRGlyZWN0aW9ucyA9IEdvbmlmLk5laWdoYm9ycy5nZXRTaGFyZWROZWlnaGJvckRpcmVjdGlvbnMoc2lkZSk7XG5cbiAgICAgICAgICAgIHNoYXJlZE5laWdoYm9yRGlyZWN0aW9ucy5mb3JFYWNoKGJvdW5kRWFjaFNoYXJlZE5laWdoYm9yRGlyZWN0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNpZGUgPSBzaWRlc1RvQ2hlY2suc2hpZnQoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlR29uaWZJbkRpcmVjdGlvbihhcmVhLCBjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgsIGdvbmlmLCBnb2luZ1Rvd2FyZHNEaXJlY3Rpb25zKSB7XG4gICAgLy8gRW5zdXJlIGFycmF5XG4gICAgZ29pbmdUb3dhcmRzRGlyZWN0aW9ucyA9IFtdLmNvbmNhdChnb2luZ1Rvd2FyZHNEaXJlY3Rpb25zKTtcblxuICAgIHZhciBjb21pbmdGcm9tRGlyZWN0aW9uLFxuICAgICAgICBnb2luZ1Rvd2FyZHNEaXJlY3Rpb25JbmRleCA9IDAsXG4gICAgICAgIGdvaW5nVG93YXJkc0RpcmVjdGlvbiA9IGdvaW5nVG93YXJkc0RpcmVjdGlvbnNbZ29pbmdUb3dhcmRzRGlyZWN0aW9uSW5kZXhdLFxuICAgICAgICBzdGFydFBvaW50ID0gZ29uaWYuaGV4YWdvbi5nZXRDb3JuZXJQb2ludChnb2luZ1Rvd2FyZHNEaXJlY3Rpb24uZW5kKS5wb2ludCxcbiAgICAgICAgbmVpZ2hib3I7XG5cbiAgICBkbyB7XG4gICAgICAgIGNvbWluZ0Zyb21EaXJlY3Rpb24gPSBIZXhhZ29uLlNpZGVzLm9wcG9zaXRlKGdvaW5nVG93YXJkc0RpcmVjdGlvbik7XG4gICAgICAgIHN0YXJ0UG9pbnQgPSBnb25pZi5oZXhhZ29uLmdldENvcm5lclBvaW50KGdvaW5nVG93YXJkc0RpcmVjdGlvbi5lbmQpLnBvaW50O1xuICAgICAgICBuZWlnaGJvciA9IGdldE9yR2VuZXJhdGVHb25pZihjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgsIHN0YXJ0UG9pbnQsIGNvbWluZ0Zyb21EaXJlY3Rpb24pO1xuXG4gICAgICAgIGdvbmlmLnNldE5laWdoYm9yKGdvaW5nVG93YXJkc0RpcmVjdGlvbiwgbmVpZ2hib3IpO1xuICAgICAgICBuZWlnaGJvci5zZXROZWlnaGJvcihjb21pbmdGcm9tRGlyZWN0aW9uLCBnb25pZik7XG4gICAgICAgIGFkZE5laWdoYm9ycyhuZWlnaGJvcik7XG5cbiAgICAgICAgZ29pbmdUb3dhcmRzRGlyZWN0aW9uSW5kZXggPSAoZ29pbmdUb3dhcmRzRGlyZWN0aW9uSW5kZXggKyAxKSAlIGdvaW5nVG93YXJkc0RpcmVjdGlvbnMubGVuZ3RoO1xuICAgICAgICBnb2luZ1Rvd2FyZHNEaXJlY3Rpb24gPSBnb2luZ1Rvd2FyZHNEaXJlY3Rpb25zW2dvaW5nVG93YXJkc0RpcmVjdGlvbkluZGV4XTtcbiAgICAgICAgZ29uaWYgPSBuZWlnaGJvcjtcbiAgICB9IHdoaWxlIChhcmVhLmlzSW5zaWRlKHN0YXJ0UG9pbnQpKTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVHcmFwaChhcmVhLCBjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgpIHtcbiAgICB2YXIgYXJlYVdpdGhQYWRkaW5nID0gbmV3IEFyZWEobmV3IFBvaW50KDAgLSBoZXhhZ29uU2lkZUxlbmd0aCwgMCAtIGhleGFnb25TaWRlTGVuZ3RoKSwgbmV3IFBvaW50KGFyZWEueCArIGhleGFnb25TaWRlTGVuZ3RoLCBhcmVhLnkgKyBoZXhhZ29uU2lkZUxlbmd0aCkpLFxuICAgICAgICBzdGFydFBvaW50ID0gbmV3IFBvaW50KGFyZWEueCAvIDIsIGFyZWEueSAvIDIpLFxuICAgICAgICBwb2ludCA9IHN0YXJ0UG9pbnQsXG4gICAgICAgIHN0YXJ0R29uaWYgPSBnZXRPckdlbmVyYXRlR29uaWYoY2FjaGUsIGhleGFnb25TaWRlTGVuZ3RoLCBwb2ludCwgSGV4YWdvbi5TaWRlcy5Cb3R0b20pLFxuICAgICAgICBnb25pZiA9IHN0YXJ0R29uaWY7XG5cbiAgICAvLyBHZW5lcmF0ZSBob3Jpem9udGFsbHkgZmlyc3QgL1xcL1xcL1xcL1xcL1xcLy5cbiAgICAvLyBUbyB0aGUgZWFzdC5cbiAgICBnZW5lcmF0ZUdvbmlmSW5EaXJlY3Rpb24oYXJlYVdpdGhQYWRkaW5nLCBjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgsIGdvbmlmLCBbSGV4YWdvbi5TaWRlcy5Cb3R0b21SaWdodCwgSGV4YWdvbi5TaWRlcy5Ub3BSaWdodF0pO1xuICAgIC8vIFRvIHRoZSB3ZXN0LlxuICAgIGdlbmVyYXRlR29uaWZJbkRpcmVjdGlvbihhcmVhV2l0aFBhZGRpbmcsIGNhY2hlLCBoZXhhZ29uU2lkZUxlbmd0aCwgZ29uaWYsIFtIZXhhZ29uLlNpZGVzLkJvdHRvbUxlZnQsIEhleGFnb24uU2lkZXMuVG9wTGVmdF0pO1xuXG4gICAgLy8gR2VuZXJhdGUgdmVydGljYWxseSwgYmFzZWQgb24gbmVpZ2hib3JzIGZyb20gdGhlIGZpcnN0IGdvbmlmLlxuICAgIC8vIEdlbmVyYXRlIGJhc2VkIG9uIG5laWdoYm9ycyB0byB0aGUgZWFzdC5cbiAgICBkbyB7XG4gICAgICAgIGdlbmVyYXRlR29uaWZJbkRpcmVjdGlvbihhcmVhV2l0aFBhZGRpbmcsIGNhY2hlLCBoZXhhZ29uU2lkZUxlbmd0aCwgZ29uaWYsIEhleGFnb24uU2lkZXMuVG9wKTtcbiAgICAgICAgZ2VuZXJhdGVHb25pZkluRGlyZWN0aW9uKGFyZWFXaXRoUGFkZGluZywgY2FjaGUsIGhleGFnb25TaWRlTGVuZ3RoLCBnb25pZiwgSGV4YWdvbi5TaWRlcy5Cb3R0b20pO1xuICAgICAgICBnb25pZiA9IGdvbmlmLmdldE5laWdoYm9yKEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQpIHx8IGdvbmlmLmdldE5laWdoYm9yKEhleGFnb24uU2lkZXMuVG9wUmlnaHQpO1xuICAgIH0gd2hpbGUgKGdvbmlmKTtcblxuICAgIC8vIFN0YXJ0IGZyb20gbGVmdCBuZWlnaGJvciBvZiB0aGUgZmlyc3QgZ29uaWYuXG4gICAgZ29uaWYgPSBzdGFydEdvbmlmLmdldE5laWdoYm9yKEhleGFnb24uU2lkZXMuQm90dG9tTGVmdCkgfHwgc3RhcnRHb25pZi5nZXROZWlnaGJvcihIZXhhZ29uLlNpZGVzLlRvcExlZnQpO1xuXG4gICAgLy8gR2VuZXJhdGUgYmFzZWQgb24gbmVpZ2hib3JzIHRvIHRoZSB3ZXN0LlxuICAgIGlmIChnb25pZikge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICBnZW5lcmF0ZUdvbmlmSW5EaXJlY3Rpb24oYXJlYVdpdGhQYWRkaW5nLCBjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgsIGdvbmlmLCBIZXhhZ29uLlNpZGVzLlRvcCk7XG4gICAgICAgICAgICBnZW5lcmF0ZUdvbmlmSW5EaXJlY3Rpb24oYXJlYVdpdGhQYWRkaW5nLCBjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgsIGdvbmlmLCBIZXhhZ29uLlNpZGVzLkJvdHRvbSk7XG4gICAgICAgICAgICBnb25pZiA9IGdvbmlmLmdldE5laWdoYm9yKEhleGFnb24uU2lkZXMuQm90dG9tTGVmdCkgfHwgZ29uaWYuZ2V0TmVpZ2hib3IoSGV4YWdvbi5TaWRlcy5Ub3BMZWZ0KTtcbiAgICAgICAgfSB3aGlsZSAoZ29uaWYpO1xuICAgIH1cblxuICAgIHJldHVybiBzdGFydEdvbmlmO1xufVxuXG5mdW5jdGlvbiBncmFwaGVyKGNhbnZhc0FyZWEsIGhleGFnb25TaWRlTGVuZ3RoKSB7XG4gICAgdmFyIGNhY2hlID0ge1xuICAgICAgICAgICAgaGV4YWdvbnM6IHt9LFxuICAgICAgICAgICAgbm9kZXM6IHt9LFxuICAgICAgICAgICAgbGluZXM6IHt9LFxuICAgICAgICAgICAgZ29uaWZzOiB7fSxcbiAgICAgICAgfSxcbiAgICAgICAgc3RhcnQgPSBnZW5lcmF0ZUdyYXBoKGNhbnZhc0FyZWEsIGNhY2hlLCBoZXhhZ29uU2lkZUxlbmd0aCksXG4gICAgICAgIGdyYXBoID0ge1xuICAgICAgICAgICAgaGV4YWdvbnM6IGNhY2hlLmhleGFnb25zLFxuICAgICAgICAgICAgbm9kZXM6IGNhY2hlLm5vZGVzLFxuICAgICAgICAgICAgbGluZXM6IGNhY2hlLmxpbmVzLFxuICAgICAgICAgICAgZ29uaWZzOiBjYWNoZS5nb25pZnMsXG4gICAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgIH07XG5cbiAgICByZXR1cm4gZ3JhcGg7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ3JhcGhlcjtcbiIsInZhciBNQVhfQVVUT19ISUdITElHSFRfREVMQVkgPSAxMCxcbiAgICByYW5kb20gPSByZXF1aXJlKFwiLi4vdXRpbHMvcmFuZG9tLmpzXCIpO1xuXG5mdW5jdGlvbiBIaWdobGlnaHRPbkludGVydmFsKHNjZW5lLCBncmFwaE9iamVjdHNUb29sLCBoZXhFdmVudCkge1xuICAgIHRoaXMuc2NlbmUgPSBzY2VuZTtcbiAgICB0aGlzLmdyYXBoT2JqZWN0c1Rvb2wgPSBncmFwaE9iamVjdHNUb29sO1xuICAgIHRoaXMuaGV4RXZlbnQgPSBoZXhFdmVudDtcblxuICAgIHRoaXMuaXNIaWdobGlnaHRlclN0YXJ0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmhpZ2hsaWdodENvdW50ZXIgPSAwO1xuICAgIHRoaXMuaGlnaGxpZ2h0Q291bnRlckludGVydmFsID0gbnVsbDtcbiAgICB0aGlzLmlzQXV0b21hdGVkSGlnaGxpZ2h0ID0gZmFsc2U7XG4gICAgdGhpcy5oaWdobGlnaHRJbnRlcnZhbCA9IG51bGw7XG5cbiAgICB0aGlzLmhpZ2hsaWdodE1pbGxpc2Vjb25kcyA9IDEwMDA7XG4gICAgdGhpcy51bmhpZ2hsaWdodEFmdGVyTWlsbGlzZWNvbmRzID0gNTAwO1xuXG4gICAgdGhpcy5ib3VuZExpc3RlbmVycyA9IHtcbiAgICAgICAgaGV4YWdvbmlmTGluZUhpZ2hsaWdodEV2ZW50TGlzdGVuZXI6IHRoaXMuaGV4YWdvbmlmTGluZUhpZ2hsaWdodEV2ZW50TGlzdGVuZXIuYmluZCh0aGlzKSxcbiAgICAgICAgaGV4YWdvbmlmTGluZVVuaGlnaGxpZ2h0RXZlbnRMaXN0ZW5lcjogdGhpcy5oZXhhZ29uaWZMaW5lVW5oaWdobGlnaHRFdmVudExpc3RlbmVyLmJpbmQodGhpcyksXG4gICAgICAgIGhpZ2hsaWdodENvdW50ZXJEZWNyZWFzZXI6IHRoaXMuaGlnaGxpZ2h0Q291bnRlckRlY3JlYXNlci5iaW5kKHRoaXMpLFxuICAgICAgICBoaWdobGlnaHRTb21ldGhpbmdUaGF0SWZOb3RoaW5nSGFzSGFwcGVuZWQ6IHRoaXMuaGlnaGxpZ2h0U29tZXRoaW5nVGhhdElmTm90aGluZ0hhc0hhcHBlbmVkLmJpbmQodGhpcyksXG5cbiAgICB9O1xufVxuXG5IaWdobGlnaHRPbkludGVydmFsLnByb3RvdHlwZS5oaWdobGlnaHRDb3VudGVyRGVjcmVhc2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5oaWdobGlnaHRDb3VudGVyID0gTWF0aC5tYXgoMCwgdGhpcy5oaWdobGlnaHRDb3VudGVyIC0gMSk7XG59O1xuXG5IaWdobGlnaHRPbkludGVydmFsLnByb3RvdHlwZS5yZXNldFJhbmRvbUxpbmUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGluZSA9IHRoaXMuZ3JhcGhPYmplY3RzVG9vbC5nZXRSYW5kb21MaW5lKCk7XG5cbiAgICB0aGlzLnNjZW5lLnJlc2V0TGluZShsaW5lKTtcbn07XG5cbkhpZ2hsaWdodE9uSW50ZXJ2YWwucHJvdG90eXBlLmhpZ2hsaWdodFJhbmRvbUxpbmUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGluZSA9IHRoaXMuZ3JhcGhPYmplY3RzVG9vbC5nZXRSYW5kb21MaW5lKCk7XG5cbiAgICB0aGlzLmlzQXV0b21hdGVkSGlnaGxpZ2h0ID0gdHJ1ZTtcbiAgICB0aGlzLnNjZW5lLmhpZ2hsaWdodExpbmUobGluZSk7XG4gICAgdGhpcy5pc0F1dG9tYXRlZEhpZ2hsaWdodCA9IGZhbHNlO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiB1bmhpZ2hsaWdodFNhbWVSYW5kb21MaW5lKCkge1xuICAgICAgICB0aGlzLnNjZW5lLnVuaGlnaGxpZ2h0TGluZShsaW5lKTtcbiAgICB9LmJpbmQodGhpcyksIHRoaXMudW5oaWdobGlnaHRBZnRlck1pbGxpc2Vjb25kcyk7XG59O1xuXG5IaWdobGlnaHRPbkludGVydmFsLnByb3RvdHlwZS5oaWdobGlnaHRSYW5kb21IZXhhZ29uID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGhleGFnb247XG5cbiAgICBkbyB7XG4gICAgICAgIGhleGFnb24gPSB0aGlzLmdyYXBoT2JqZWN0c1Rvb2wuZ2V0UmFuZG9tSGV4YWdvbigpO1xuICAgIH0gd2hpbGUgKCFoZXhhZ29uLmlzQ29tcGxldGUoKSk7XG5cbiAgICB0aGlzLmlzQXV0b21hdGVkSGlnaGxpZ2h0ID0gdHJ1ZTtcbiAgICB0aGlzLnNjZW5lLmhpZ2hsaWdodEhleGFnb24oaGV4YWdvbik7XG4gICAgdGhpcy5pc0F1dG9tYXRlZEhpZ2hsaWdodCA9IGZhbHNlO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiB1bmhpZ2hsaWdodFNhbWVSYW5kb21IZXhhZ29uKCkge1xuICAgICAgICB0aGlzLnNjZW5lLnVuaGlnaGxpZ2h0SGV4YWdvbihoZXhhZ29uKTtcbiAgICB9LmJpbmQodGhpcyksIHRoaXMudW5oaWdobGlnaHRBZnRlck1pbGxpc2Vjb25kcyk7XG59O1xuXG5IaWdobGlnaHRPbkludGVydmFsLnByb3RvdHlwZS5oaWdobGlnaHRTb21ldGhpbmdUaGF0SWZOb3RoaW5nSGFzSGFwcGVuZWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcm5kID0gcmFuZG9tLmludGVnZXIoMTApO1xuXG4gICAgaWYgKHRoaXMuaGlnaGxpZ2h0Q291bnRlciA9PT0gMCkge1xuICAgICAgICBpZiAocm5kIDwgMikge1xuICAgICAgICAgICAgdGhpcy5yZXNldFJhbmRvbUxpbmUoKTtcbiAgICAgICAgfSBlbHNlIGlmIChybmQgPCA5KSB7XG4gICAgICAgICAgICB0aGlzLmhpZ2hsaWdodFJhbmRvbUxpbmUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlnaGxpZ2h0UmFuZG9tSGV4YWdvbigpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuSGlnaGxpZ2h0T25JbnRlcnZhbC5wcm90b3R5cGUuaGV4YWdvbmlmTGluZUhpZ2hsaWdodEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuaXNBdXRvbWF0ZWRIaWdobGlnaHQpIHtcbiAgICAgICAgdGhpcy5oaWdobGlnaHRDb3VudGVyID0gTWF0aC5taW4oTnVtYmVyLk1BWF9WQUxVRSAtIDEsIHRoaXMuaGlnaGxpZ2h0Q291bnRlciArIDEsIE1BWF9BVVRPX0hJR0hMSUdIVF9ERUxBWSk7XG4gICAgfVxufTtcblxuSGlnaGxpZ2h0T25JbnRlcnZhbC5wcm90b3R5cGUuaGV4YWdvbmlmTGluZVVuaGlnaGxpZ2h0RXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFNvbWV0aGluZ1xufTtcblxuSGlnaGxpZ2h0T25JbnRlcnZhbC5wcm90b3R5cGUuaXNTdGFydGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNIaWdobGlnaHRlclN0YXJ0ZWQgPT09IHRydWU7XG59O1xuXG5IaWdobGlnaHRPbkludGVydmFsLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmlzU3RhcnRlZCgpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIldhcyBzdGFydGVkLlwiKTtcbiAgICB9XG5cbiAgICB0aGlzLmlzSGlnaGxpZ2h0ZXJTdGFydGVkID0gdHJ1ZTtcblxuICAgIHRoaXMuaGV4RXZlbnQubGlzdGVuKFwibGluZS5oaWdobGlnaHRcIiwgdGhpcy5ib3VuZExpc3RlbmVycy5oZXhhZ29uaWZMaW5lSGlnaGxpZ2h0RXZlbnRMaXN0ZW5lcik7XG4gICAgdGhpcy5oZXhFdmVudC5saXN0ZW4oXCJsaW5lLnVuaGlnaGxpZ2h0XCIsIHRoaXMuYm91bmRMaXN0ZW5lcnMuaGV4YWdvbmlmTGluZVVuaGlnaGxpZ2h0RXZlbnRMaXN0ZW5lcik7XG5cbiAgICB0aGlzLmhpZ2hsaWdodENvdW50ZXJJbnRlcnZhbCA9IHNldEludGVydmFsKHRoaXMuYm91bmRMaXN0ZW5lcnMuaGlnaGxpZ2h0Q291bnRlckRlY3JlYXNlciwgdGhpcy5oaWdobGlnaHRNaWxsaXNlY29uZHMpO1xuICAgIHRoaXMuaGlnaGxpZ2h0SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCh0aGlzLmJvdW5kTGlzdGVuZXJzLmhpZ2hsaWdodFNvbWV0aGluZ1RoYXRJZk5vdGhpbmdIYXNIYXBwZW5lZCwgdGhpcy5oaWdobGlnaHRNaWxsaXNlY29uZHMpO1xufTtcblxuSGlnaGxpZ2h0T25JbnRlcnZhbC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5pc1N0YXJ0ZWQoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJXYXMgbm90IHN0YXJ0ZWQuXCIpO1xuICAgIH1cblxuICAgIHRoaXMuaGV4RXZlbnQuY2FuY2VsKFwibGluZS5oaWdobGlnaHRcIiwgdGhpcy5ib3VuZExpc3RlbmVycy5oZXhhZ29uaWZMaW5lSGlnaGxpZ2h0RXZlbnRMaXN0ZW5lcik7XG4gICAgdGhpcy5oZXhFdmVudC5jYW5jZWwoXCJsaW5lLnVuaGlnaGxpZ2h0XCIsIHRoaXMuYm91bmRMaXN0ZW5lcnMuaGV4YWdvbmlmTGluZVVuaGlnaGxpZ2h0RXZlbnRMaXN0ZW5lcik7XG5cbiAgICBjbGVhckludGVydmFsKHRoaXMuaGlnaGxpZ2h0Q291bnRlckludGVydmFsKTtcbiAgICBjbGVhckludGVydmFsKHRoaXMuaGlnaGxpZ2h0SW50ZXJ2YWwpO1xuXG4gICAgdGhpcy5pc0hpZ2hsaWdodGVyU3RhcnRlZCA9IGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIaWdobGlnaHRPbkludGVydmFsO1xuIiwiZnVuY3Rpb24gcmVuZGVyZXIoY2FudmFzSWQsIGNhbnZhc0FyZWEsIGdyYXBoT2JqZWN0cykge1xuICAgIC8qIGdsb2JhbCBvQ2FudmFzOmZhbHNlICovXG5cbiAgICB2YXIgcmFuZG9tID0gcmVxdWlyZShcIi4uL3V0aWxzL3JhbmRvbS5qc1wiKSxcbiAgICAgICAgSGV4YWdvbiA9IHJlcXVpcmUoXCIuLi9vYmplY3RzL2hleGFnb24uanNcIiksXG4gICAgICAgIEhleEV2ZW50ID0gcmVxdWlyZShcIi4vZXZlbnRzLmpzXCIpO1xuXG4gICAgLy8gVE9ETzogdXNlIGhpZHBpLWNhbnZhcy1wb2x5ZmlsbFxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qb25kYXZpZGpvaG4vaGlkcGktY2FudmFzLXBvbHlmaWxsXG4gICAgdmFyIGNhbnZhc0VsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjYW52YXNJZCk7XG4gICAgY2FudmFzRWxlbWVudC53aWR0aCA9IGNhbnZhc0FyZWEueDtcbiAgICBjYW52YXNFbGVtZW50LmhlaWdodCA9IGNhbnZhc0FyZWEueTtcblxuICAgIHZhciBoZXhFdmVudCA9IG5ldyBIZXhFdmVudChjYW52YXNFbGVtZW50KSxcbiAgICAgICAgY2FudmFzID0gb0NhbnZhcy5jcmVhdGUoe1xuICAgICAgICAgICAgY2FudmFzOiBcIiNcIiArIGNhbnZhc0lkLFxuICAgICAgICB9KSxcbiAgICAgICAgZ3JhcGhpY3NMb29rdXBDYWNoZSA9IHt9O1xuXG4gICAgZnVuY3Rpb24gZ2V0RGVmYXVsdFN0cm9rZVdpZHRoKCkge1xuICAgICAgICAvLyBUT0RPOiBtb3ZlIHRvIG9wdGlvbnMgb2JqZWN0XG4gICAgICAgIC8vIHJldHVybiAxMDtcbiAgICAgICAgcmV0dXJuIHJhbmRvbS5pbnRlZ2VyKDMsIDEwKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREZWZhdWx0U3Ryb2tlQ29sb3IoKSB7XG4gICAgICAgIC8vIFRPRE86IG1vdmUgdG8gb3B0aW9ucyBvYmplY3RcbiAgICAgICAgLy8gcmV0dXJuIFwicmdiYSgwLCAwLCAwLCAwLjAxKVwiO1xuICAgICAgICAvLyByZXR1cm4gXCJyZ2JhKDAsIDAsIDAsIDAuMSlcIjtcbiAgICAgICAgcmV0dXJuIFwidHJhbnNwYXJlbnRcIjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXREZWZhdWx0RmlsbENvbG9yKCkge1xuICAgICAgICAvLyBUT0RPOiBtb3ZlIHRvIG9wdGlvbnMgb2JqZWN0XG4gICAgICAgIC8vIHJldHVybiBcInJnYmEoMCwgMCwgMCwgMC4wMSlcIjtcbiAgICAgICAgLy8gcmV0dXJuIFwicmdiYSgxMjcsIDAsIDAsIDAuMSlcIjtcbiAgICAgICAgcmV0dXJuIFwidHJhbnNwYXJlbnRcIjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRDb2xvckJ5TG9jYXRpb24oeCwgeSwgaGlnaGxpZ2h0KSB7XG4gICAgICAgIC8vIE5PVEU6IHggYW5kIHkgYXJlIG5vdCBndWFyYW50ZWVkIHRvIGJlIGluc2lkZSB0aGUgY2FudmFzIGFyZWFcbiAgICAgICAgdmFyIGJ5WCA9IE1hdGguZmxvb3IoKHggLyBjYW52YXNBcmVhLngpICogMjApLFxuICAgICAgICAgICAgYnlZID0gTWF0aC5mbG9vcigoeSAvIGNhbnZhc0FyZWEueSkgKiAzNjApLFxuICAgICAgICAgICAgLy8gVE9ETzogbW92ZSB0byBvcHRpb25zIG9iamVjdFxuICAgICAgICAgICAgb3BhY2l0eSA9IGhpZ2hsaWdodCA/IDAuNyA6IDAuMztcblxuICAgICAgICByZXR1cm4gXCJoc2xhKFwiICsgYnlZICsgXCIsIFwiICsgKDEwMCAtIChieVggLyAyKSkgKyBcIiUsIFwiICsgKDYwIC0gYnlYKSArIFwiJSwgXCIgKyBvcGFjaXR5LnRvRml4ZWQoMykgKyBcIilcIjtcbiAgICAgICAgLy8gcmV0dXJuIFwiaHNsYSg2MCwgMTAwJSwgNTAlLCAwLjMpXCI7XG4gICAgfVxuXG4gICAgdmFyIGxpbmVQcm90b3R5cGUgPSBjYW52YXMuZGlzcGxheS5saW5lKHtcbiAgICAgICAgICAgIGNhcDogXCJyb3VuZFwiLFxuICAgICAgICAgICAgc3Ryb2tlV2lkdGg6IGdldERlZmF1bHRTdHJva2VXaWR0aCgpLFxuICAgICAgICAgICAgc3Ryb2tlQ29sb3I6IGdldERlZmF1bHRTdHJva2VDb2xvcigpLFxuICAgICAgICB9KSxcbiAgICAgICAgZ29uaWZQcm90b3R5cGUgPSBjYW52YXMuZGlzcGxheS5wb2x5Z29uKHtcbiAgICAgICAgICAgIHNpZGVzOiA2LFxuICAgICAgICAgICAgZmlsbDogZ2V0RGVmYXVsdEZpbGxDb2xvcigpLFxuICAgICAgICAgICAgc3Ryb2tlV2lkdGg6IGdldERlZmF1bHRTdHJva2VXaWR0aCgpLFxuICAgICAgICAgICAgc3Ryb2tlQ29sb3I6IGdldERlZmF1bHRTdHJva2VDb2xvcigpLFxuICAgICAgICB9KTtcblxuICAgIGZ1bmN0aW9uIG9uTGluZU1vdXNlRW50ZXIoZXZlbnQpIHtcbiAgICAgICAgbGluZUhpZ2hsaWdodC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uTGluZU1vdXNlTGVhdmUoZXZlbnQpIHtcbiAgICAgICAgbGluZVVuaGlnaGxpZ2h0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Hb25pZkNsaWNrKGV2ZW50KSB7XG4gICAgICAgIGhpZ2hsaWdodEhleGFnb24odGhpcy50YWcuaGV4YWdvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGluZVJlc2V0KCkge1xuICAgICAgICB2YXIgbGluZUV2ZW50ID0gaGV4RXZlbnQuZmlyZShcImxpbmUucmVzZXRcIiwgdGhpcywgdGhpcy50YWcpO1xuXG4gICAgICAgIGlmIChsaW5lRXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdHJva2VDb2xvciA9IGdldERlZmF1bHRTdHJva2VDb2xvcigpO1xuICAgICAgICB0aGlzLnpJbmRleCA9IFwiYmFja1wiO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpbmVIaWdobGlnaHQoKSB7XG4gICAgICAgIHZhciBsaW5lRXZlbnQgPSBoZXhFdmVudC5maXJlKFwibGluZS5oaWdobGlnaHRcIiwgdGhpcywgdGhpcy50YWcpO1xuXG4gICAgICAgIGlmIChsaW5lRXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdHJva2VDb2xvciA9IGdldENvbG9yQnlMb2NhdGlvbih0aGlzLngsIHRoaXMueSwgdHJ1ZSk7XG4gICAgICAgIHRoaXMuekluZGV4ID0gXCJmcm9udFwiO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpbmVVbmhpZ2hsaWdodChldmVudCkge1xuICAgICAgICB2YXIgbGluZUV2ZW50ID0gaGV4RXZlbnQuZmlyZShcImxpbmUudW5oaWdobGlnaHRcIiwgdGhpcywgdGhpcy50YWcpO1xuXG4gICAgICAgIGlmIChsaW5lRXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdHJva2VDb2xvciA9IGdldENvbG9yQnlMb2NhdGlvbih0aGlzLngsIHRoaXMueSwgZmFsc2UpO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRyYXdMaW5lSW5TY2VuZShzY2VuZSwgc3RhcnQsIGVuZCwgdGFnKSB7XG4gICAgICAgIHZhciBsaW5lID0gbGluZVByb3RvdHlwZS5jbG9uZSh7XG4gICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgIHg6IHN0YXJ0LngsXG4gICAgICAgICAgICAgICAgeTogc3RhcnQueSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbmQ6IHtcbiAgICAgICAgICAgICAgICB4OiBlbmQueCxcbiAgICAgICAgICAgICAgICB5OiBlbmQueSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0YWc6IHRhZyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NlbmUuYWRkKGxpbmUpO1xuXG4gICAgICAgIGxpbmVcbiAgICAgICAgICAgIC5iaW5kKFwibW91c2VlbnRlciB0b3VjaGVudGVyXCIsIG9uTGluZU1vdXNlRW50ZXIpXG4gICAgICAgICAgICAuYmluZChcIm1vdXNlbGVhdmUgdG91Y2hsZWF2ZVwiLCBvbkxpbmVNb3VzZUxlYXZlKTtcblxuICAgICAgICByZXR1cm4gbGluZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmF3R29uaWZJblNjZW5lKHNjZW5lLCBjZW50ZXIsIHJhZGl1cywgdGFnKSB7XG4gICAgICAgIHZhciBnb25pZiA9IGdvbmlmUHJvdG90eXBlLmNsb25lKHtcbiAgICAgICAgICAgIG9yaWdpbjoge1xuICAgICAgICAgICAgICAgIHg6IGNlbnRlci54LFxuICAgICAgICAgICAgICAgIHk6IGNlbnRlci55LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJhZGl1czogcmFkaXVzLFxuICAgICAgICAgICAgdGFnOiB0YWcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNjZW5lLmFkZChnb25pZik7XG5cbiAgICAgICAgZ29uaWZcbiAgICAgICAgICAgIC5iaW5kKFwiY2xpY2sgdGFwXCIsIG9uR29uaWZDbGljayk7XG5cbiAgICAgICAgcmV0dXJuIGdvbmlmO1xuICAgIH1cblxuICAgIHZhciBzY2VuZUdyaWQgPSBcImdyaWRcIjtcblxuICAgIGNhbnZhcy5zY2VuZXMuY3JlYXRlKHNjZW5lR3JpZCwgZnVuY3Rpb24gY2FudmFzU2NlbmVzQ3JlYXRlKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgLy8gT2JqZWN0LmtleXMobm9kZXMpLnNvcnQoKS5yZWR1Y2UoZnVuY3Rpb24oc3RhcnQsIGVuZCkge1xuICAgICAgICAvLyAgICAgZHJhd0xpbmVJblNjZW5lKHNlbGYsIG5vZGVzW3N0YXJ0XSwgbm9kZXNbZW5kXSwgbm9kZSk7XG5cbiAgICAgICAgLy8gICAgIHJldHVybiBlbmQ7XG4gICAgICAgIC8vIH0pO1xuXG4gICAgICAgIC8vIFRPRE86IEFzeW5jL3F1ZXVlZCBvYmplY3QgYWRkaW5nLCBzbyBtYWluIHVzZXIgdGhyZWFkIHdvbid0IGZyZWV6ZS9iZWNvbWUgdW5yZXNwb25zaXZlP1xuICAgICAgICBPYmplY3Qua2V5cyhncmFwaE9iamVjdHMuZ29uaWZzKS5mb3JFYWNoKGZ1bmN0aW9uIGdvbmlmc0ZvckVhY2hDcmVhdGVHcmFwaGljKGNhY2hlS2V5KSB7XG4gICAgICAgICAgICB2YXIgZ29uaWYgPSBncmFwaE9iamVjdHMuZ29uaWZzW2NhY2hlS2V5XSxcbiAgICAgICAgICAgICAgICBjZW50ZXIgPSBnb25pZi5oZXhhZ29uLmdldENlbnRlcigpLFxuICAgICAgICAgICAgICAgIG9yaWdpbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogMCAtIGNlbnRlci54LFxuICAgICAgICAgICAgICAgICAgICB5OiAwIC0gY2VudGVyLnksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBUT0RPIERFQlVHIEZJWFxuICAgICAgICAgICAgICAgIHJhZGl1cyA9ICgxMDAgLSAyKSxcbiAgICAgICAgICAgICAgICBncmFwaGljID0gZHJhd0dvbmlmSW5TY2VuZShzZWxmLCBvcmlnaW4sIHJhZGl1cywgZ29uaWYpO1xuXG4gICAgICAgICAgICBncmFwaGljc0xvb2t1cENhY2hlW2NhY2hlS2V5XSA9IGdyYXBoaWM7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRPRE86IEFzeW5jL3F1ZXVlZCBvYmplY3QgYWRkaW5nLCBzbyBtYWluIHVzZXIgdGhyZWFkIHdvbid0IGZyZWV6ZS9iZWNvbWUgdW5yZXNwb25zaXZlP1xuICAgICAgICBPYmplY3Qua2V5cyhncmFwaE9iamVjdHMubGluZXMpLmZvckVhY2goZnVuY3Rpb24gbGluZXNGb3JFYWNoQ3JlYXRlR3JhcGhpYyhjYWNoZUtleSkge1xuICAgICAgICAgICAgdmFyIGxpbmUgPSBncmFwaE9iamVjdHMubGluZXNbY2FjaGVLZXldLFxuICAgICAgICAgICAgICAgIGdyYXBoaWMgPSBkcmF3TGluZUluU2NlbmUoc2VsZiwgbGluZS5zdGFydCwgbGluZS5lbmQsIGxpbmUpO1xuXG4gICAgICAgICAgICBncmFwaGljc0xvb2t1cENhY2hlW2NhY2hlS2V5XSA9IGdyYXBoaWM7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgY2FudmFzLnNjZW5lcy5sb2FkKHNjZW5lR3JpZCk7XG5cbiAgICBmdW5jdGlvbiBoaWdobGlnaHRMaW5lKGxpbmUpIHtcbiAgICAgICAgdmFyIGNhY2hlS2V5ID0gbGluZS5jYWNoZUtleSxcbiAgICAgICAgICAgIHNlbGVjdGVkID0gZ3JhcGhpY3NMb29rdXBDYWNoZVtjYWNoZUtleV07XG5cbiAgICAgICAgbGluZUhpZ2hsaWdodC5jYWxsKHNlbGVjdGVkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNldExpbmUobGluZSkge1xuICAgICAgICB2YXIgY2FjaGVLZXkgPSBsaW5lLmNhY2hlS2V5LFxuICAgICAgICAgICAgc2VsZWN0ZWQgPSBncmFwaGljc0xvb2t1cENhY2hlW2NhY2hlS2V5XTtcblxuICAgICAgICBsaW5lUmVzZXQuY2FsbChzZWxlY3RlZCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZWFjaExpbmVJbkhleGFnb24oaGV4YWdvbiwgZm4pIHtcbiAgICAgICAgdmFyIHN0YXJ0U2lkZSA9IEhleGFnb24uU2lkZXMuVG9wLFxuICAgICAgICAgICAgc2lkZSA9IHN0YXJ0U2lkZSxcbiAgICAgICAgICAgIHNpZGVMaW5lO1xuXG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIHNpZGVMaW5lID0gaGV4YWdvbi5nZXRTaWRlTGluZShzaWRlKTtcbiAgICAgICAgICAgIGZuKHNpZGVMaW5lLmxpbmUpO1xuICAgICAgICAgICAgc2lkZSA9IEhleGFnb24uU2lkZXMubmV4dChzaWRlKTtcbiAgICAgICAgfSB3aGlsZSAoc2lkZSAhPT0gc3RhcnRTaWRlKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBoaWdobGlnaHRIZXhhZ29uKGhleGFnb24pIHtcbiAgICAgICAgZWFjaExpbmVJbkhleGFnb24oaGV4YWdvbiwgaGlnaGxpZ2h0TGluZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5oaWdobGlnaHRIZXhhZ29uKGhleGFnb24pIHtcbiAgICAgICAgZWFjaExpbmVJbkhleGFnb24oaGV4YWdvbiwgdW5oaWdobGlnaHRMaW5lKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1bmhpZ2hsaWdodExpbmUobGluZSkge1xuICAgICAgICB2YXIgY2FjaGVLZXkgPSBsaW5lLmNhY2hlS2V5LFxuICAgICAgICAgICAgc2VsZWN0ZWQgPSBncmFwaGljc0xvb2t1cENhY2hlW2NhY2hlS2V5XTtcblxuICAgICAgICBsaW5lVW5oaWdobGlnaHQuY2FsbChzZWxlY3RlZCk7XG4gICAgfVxuXG4gICAgdmFyIGFwaSA9IHtcbiAgICAgICAgcmVzZXRMaW5lOiByZXNldExpbmUsXG4gICAgICAgIGhpZ2hsaWdodExpbmU6IGhpZ2hsaWdodExpbmUsXG4gICAgICAgIHVuaGlnaGxpZ2h0TGluZTogdW5oaWdobGlnaHRMaW5lLFxuICAgICAgICBoaWdobGlnaHRIZXhhZ29uOiBoaWdobGlnaHRIZXhhZ29uLFxuICAgICAgICB1bmhpZ2hsaWdodEhleGFnb246IHVuaGlnaGxpZ2h0SGV4YWdvbixcbiAgICB9O1xuXG4gICAgcmV0dXJuIGFwaTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSByZW5kZXJlcjtcbiIsImZ1bmN0aW9uIEFyZWEoc3RhcnQsIGVuZCkge1xuICAgIHRoaXMuc3RhcnQgPSBzdGFydDtcbiAgICB0aGlzLmVuZCA9IGVuZDtcblxuICAgIGlmICh0aGlzLnN0YXJ0LnggPD0gdGhpcy5lbmQueCkge1xuICAgICAgICB0aGlzLmFYID0gdGhpcy5zdGFydC54O1xuICAgICAgICB0aGlzLmJYID0gdGhpcy5lbmQueDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFYID0gdGhpcy5lbmQueDtcbiAgICAgICAgdGhpcy5iWCA9IHRoaXMuc3RhcnQueDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdGFydC55IDw9IHRoaXMuZW5kLnkpIHtcbiAgICAgICAgdGhpcy5hWSA9IHRoaXMuc3RhcnQueTtcbiAgICAgICAgdGhpcy5iWSA9IHRoaXMuZW5kLnk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5hWSA9IHRoaXMuZW5kLnk7XG4gICAgICAgIHRoaXMuYlkgPSB0aGlzLnN0YXJ0Lnk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbkFyZWEucHJvdG90eXBlLmlzSW5zaWRlID0gZnVuY3Rpb24ocG9pbnQpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNPdXRzaWRlKHBvaW50KTtcbn07XG5cbkFyZWEucHJvdG90eXBlLmlzT3V0c2lkZSA9IGZ1bmN0aW9uKHBvaW50KSB7XG4gICAgdmFyIGlzT3V0c2lkZSA9IChwb2ludC54IDwgdGhpcy5hWCkgfHwgKHBvaW50LnggPiB0aGlzLmJYKSB8fCAocG9pbnQueSA8IHRoaXMuYVkpIHx8IChwb2ludC55ID4gdGhpcy5iWSk7XG5cbiAgICByZXR1cm4gaXNPdXRzaWRlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcmVhO1xuIiwiZnVuY3Rpb24gQ29ybmVyKG5hbWUsIHJvdGF0aW9uKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLnJvdGF0aW9uID0gcm90YXRpb247XG5cbiAgICByZXR1cm4gdGhpcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb3JuZXI7XG4iLCJmdW5jdGlvbiBDb3JuZXJQb2ludChjb3JuZXIsIHBvaW50KSB7XG4gICAgdGhpcy5jb3JuZXIgPSBjb3JuZXI7XG4gICAgdGhpcy5wb2ludCA9IHBvaW50O1xuXG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ29ybmVyUG9pbnQ7XG4iLCJ2YXIgSGV4YWdvbiA9IHJlcXVpcmUoXCIuL2hleGFnb24uanNcIiksXG4gICAgcmFuZG9tID0gcmVxdWlyZShcIi4uL3V0aWxzL3JhbmRvbS5qc1wiKTtcblxuZnVuY3Rpb24gR29uaWYoaGV4YWdvbikge1xuICAgIHRoaXMuY2FjaGVLZXkgPSByYW5kb20uaW50ZWdlcihOdW1iZXIuTUFYX1ZBTFVFKTtcblxuICAgIHRoaXMuaGV4YWdvbiA9IGhleGFnb247XG5cbiAgICB0aGlzLm5laWdoYm9ycyA9IHtcbiAgICAgICAgdG9wOiBudWxsLFxuICAgICAgICB0b3BSaWdodDogbnVsbCxcbiAgICAgICAgYm90dG9tUmlnaHQ6IG51bGwsXG4gICAgICAgIGJvdHRvbTogbnVsbCxcbiAgICAgICAgYm90dG9tTGVmdDogbnVsbCxcbiAgICAgICAgdG9wTGVmdDogbnVsbCxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbkdvbmlmLk5laWdoYm9ycyA9IHt9O1xuXG5Hb25pZi5OZWlnaGJvcnMuZ2V0U2hhcmVkTmVpZ2hib3JEaXJlY3Rpb25zID0gZnVuY3Rpb24oZGlyZWN0aW9uKSB7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIHN3aXRjaCAoZGlyZWN0aW9uKSB7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLlRvcDpcbiAgICAgICAgcmVzdWx0ID0gW3tcbiAgICAgICAgICAgIGZyb21OZWlnaGJvcjogSGV4YWdvbi5TaWRlcy5Cb3R0b21MZWZ0LFxuICAgICAgICAgICAgZnJvbUhlcmU6IEhleGFnb24uU2lkZXMuVG9wTGVmdCxcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgZnJvbU5laWdoYm9yOiBIZXhhZ29uLlNpZGVzLkJvdHRvbVJpZ2h0LFxuICAgICAgICAgICAgZnJvbUhlcmU6IEhleGFnb24uU2lkZXMuVG9wUmlnaHQsXG4gICAgICAgIH1dO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wUmlnaHQ6XG4gICAgICAgIHJlc3VsdCA9IFt7XG4gICAgICAgICAgICBmcm9tTmVpZ2hib3I6IEhleGFnb24uU2lkZXMuVG9wTGVmdCxcbiAgICAgICAgICAgIGZyb21IZXJlOiBIZXhhZ29uLlNpZGVzLlRvcCxcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgZnJvbU5laWdoYm9yOiBIZXhhZ29uLlNpZGVzLkJvdHRvbSxcbiAgICAgICAgICAgIGZyb21IZXJlOiBIZXhhZ29uLlNpZGVzLkJvdHRvbVJpZ2h0LFxuICAgICAgICB9XTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLkJvdHRvbVJpZ2h0OlxuICAgICAgICByZXN1bHQgPSBbe1xuICAgICAgICAgICAgZnJvbU5laWdoYm9yOiBIZXhhZ29uLlNpZGVzLlRvcCxcbiAgICAgICAgICAgIGZyb21IZXJlOiBIZXhhZ29uLlNpZGVzLlRvcFJpZ2h0LFxuICAgICAgICB9LCB7XG4gICAgICAgICAgICBmcm9tTmVpZ2hib3I6IEhleGFnb24uU2lkZXMuQm90dG9tTGVmdCxcbiAgICAgICAgICAgIGZyb21IZXJlOiBIZXhhZ29uLlNpZGVzLkJvdHRvbSxcbiAgICAgICAgfV07XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Cb3R0b206XG4gICAgICAgIHJlc3VsdCA9IFt7XG4gICAgICAgICAgICBmcm9tTmVpZ2hib3I6IEhleGFnb24uU2lkZXMuVG9wUmlnaHQsXG4gICAgICAgICAgICBmcm9tSGVyZTogSGV4YWdvbi5TaWRlcy5Cb3R0b21SaWdodCxcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgZnJvbU5laWdoYm9yOiBIZXhhZ29uLlNpZGVzLlRvcExlZnQsXG4gICAgICAgICAgICBmcm9tSGVyZTogSGV4YWdvbi5TaWRlcy5Cb3R0b21MZWZ0LFxuICAgICAgICB9XTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLkJvdHRvbUxlZnQ6XG4gICAgICAgIHJlc3VsdCA9IFt7XG4gICAgICAgICAgICBmcm9tTmVpZ2hib3I6IEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQsXG4gICAgICAgICAgICBmcm9tSGVyZTogSGV4YWdvbi5TaWRlcy5Cb3R0b20sXG4gICAgICAgIH0sIHtcbiAgICAgICAgICAgIGZyb21OZWlnaGJvcjogSGV4YWdvbi5TaWRlcy5Ub3AsXG4gICAgICAgICAgICBmcm9tSGVyZTogSGV4YWdvbi5TaWRlcy5Ub3BMZWZ0LFxuICAgICAgICB9XTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLlRvcExlZnQ6XG4gICAgICAgIHJlc3VsdCA9IFt7XG4gICAgICAgICAgICBmcm9tTmVpZ2hib3I6IEhleGFnb24uU2lkZXMuQm90dG9tLFxuICAgICAgICAgICAgZnJvbUhlcmU6IEhleGFnb24uU2lkZXMuQm90dG9tTGVmdCxcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgZnJvbU5laWdoYm9yOiBIZXhhZ29uLlNpZGVzLlRvcFJpZ2h0LFxuICAgICAgICAgICAgZnJvbUhlcmU6IEhleGFnb24uU2lkZXMuVG9wLFxuICAgICAgICB9XTtcbiAgICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBuZWlnaGJvciBzaWRlIFwiICsgZGlyZWN0aW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuR29uaWYucHJvdG90eXBlLmdldE5laWdoYm9ycyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBuZWlnaGJvcnMgPSBbXG4gICAgICAgIHRoaXMubmVpZ2hib3JzLnRvcCxcbiAgICAgICAgdGhpcy5uZWlnaGJvcnMudG9wUmlnaHQsXG4gICAgICAgIHRoaXMubmVpZ2hib3JzLmJvdHRvbVJpZ2h0LFxuICAgICAgICB0aGlzLm5laWdoYm9ycy5ib3R0b20sXG4gICAgICAgIHRoaXMubmVpZ2hib3JzLmJvdHRvbUxlZnQsXG4gICAgICAgIHRoaXMubmVpZ2hib3JzLnRvcExlZnQsXG4gICAgXTtcblxuICAgIHJldHVybiBuZWlnaGJvcnM7XG59O1xuXG5Hb25pZi5wcm90b3R5cGUuZ2V0TmVpZ2hib3IgPSBmdW5jdGlvbihkaXJlY3Rpb24pIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wOlxuICAgICAgICByZXN1bHQgPSB0aGlzLm5laWdoYm9ycy50b3A7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Ub3BSaWdodDpcbiAgICAgICAgcmVzdWx0ID0gdGhpcy5uZWlnaGJvcnMudG9wUmlnaHQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Cb3R0b21SaWdodDpcbiAgICAgICAgcmVzdWx0ID0gdGhpcy5uZWlnaGJvcnMuYm90dG9tUmlnaHQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Cb3R0b206XG4gICAgICAgIHJlc3VsdCA9IHRoaXMubmVpZ2hib3JzLmJvdHRvbTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLkJvdHRvbUxlZnQ6XG4gICAgICAgIHJlc3VsdCA9IHRoaXMubmVpZ2hib3JzLmJvdHRvbUxlZnQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Ub3BMZWZ0OlxuICAgICAgICByZXN1bHQgPSB0aGlzLm5laWdoYm9ycy50b3BMZWZ0O1xuICAgICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIG5laWdoYm9yIHNpZGUgXCIgKyBkaXJlY3Rpb24pO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5Hb25pZi5wcm90b3R5cGUuc2V0TmVpZ2hib3IgPSBmdW5jdGlvbihkaXJlY3Rpb24sIG5laWdoYm9yKSB7XG4gICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wOlxuICAgICAgICB0aGlzLm5laWdoYm9ycy50b3AgPSBuZWlnaGJvcjtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLlRvcFJpZ2h0OlxuICAgICAgICB0aGlzLm5laWdoYm9ycy50b3BSaWdodCA9IG5laWdoYm9yO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQ6XG4gICAgICAgIHRoaXMubmVpZ2hib3JzLmJvdHRvbVJpZ2h0ID0gbmVpZ2hib3I7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Cb3R0b206XG4gICAgICAgIHRoaXMubmVpZ2hib3JzLmJvdHRvbSA9IG5laWdoYm9yO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tTGVmdDpcbiAgICAgICAgdGhpcy5uZWlnaGJvcnMuYm90dG9tTGVmdCA9IG5laWdoYm9yO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wTGVmdDpcbiAgICAgICAgdGhpcy5uZWlnaGJvcnMudG9wTGVmdCA9IG5laWdoYm9yO1xuICAgICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIGRpcmVjdGlvbiBcIiArIGRpcmVjdGlvbik7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHb25pZjtcbiIsInZhciBDb3JuZXIgPSByZXF1aXJlKFwiLi9jb3JuZXIuanNcIiksXG4gICAgQ29ybmVyUG9pbnQgPSByZXF1aXJlKFwiLi9jb3JuZXJwb2ludC5qc1wiKSxcbiAgICBTaWRlID0gcmVxdWlyZShcIi4vc2lkZS5qc1wiKSxcbiAgICBMaW5lID0gcmVxdWlyZShcIi4vbGluZS5qc1wiKSxcbiAgICBTaWRlTGluZSA9IHJlcXVpcmUoXCIuL3NpZGVsaW5lLmpzXCIpLFxuXG4gICAgTlVNQkVSX09GX1NJREVTID0gNjtcblxuZnVuY3Rpb24gSGV4YWdvbigpIHtcbiAgICB0aGlzLnBvaW50cyA9IHtcbiAgICAgICAgdG9wTGVmdDogbnVsbCxcbiAgICAgICAgdG9wUmlnaHQ6IG51bGwsXG4gICAgICAgIHJpZ2h0OiBudWxsLFxuICAgICAgICBib3R0b21SaWdodDogbnVsbCxcbiAgICAgICAgYm90dG9tTGVmdDogbnVsbCxcbiAgICAgICAgbGVmdDogbnVsbCxcbiAgICB9O1xuXG4gICAgdGhpcy5saW5lcyA9IHtcbiAgICAgICAgdG9wOiBudWxsLFxuICAgICAgICB0b3BSaWdodDogbnVsbCxcbiAgICAgICAgYm90dG9tUmlnaHQ6IG51bGwsXG4gICAgICAgIGJvdHRvbTogbnVsbCxcbiAgICAgICAgYm90dG9tTGVmdDogbnVsbCxcbiAgICAgICAgdG9wTGVmdDogbnVsbCxcbiAgICB9O1xufVxuXG5IZXhhZ29uLkNvcm5lcnMgPSB7XG4gICAgVG9wTGVmdDogbmV3IENvcm5lcihcInRvcCBsZWZ0XCIsIDEyMCksXG4gICAgVG9wUmlnaHQ6IG5ldyBDb3JuZXIoXCJ0b3AgcmlnaHRcIiwgNjApLFxuICAgIFJpZ2h0OiBuZXcgQ29ybmVyKFwicmlnaHRcIiwgMCksXG4gICAgQm90dG9tUmlnaHQ6IG5ldyBDb3JuZXIoXCJib3R0b20gcmlnaHRcIiwgMzAwKSxcbiAgICBCb3R0b21MZWZ0OiBuZXcgQ29ybmVyKFwiYm90dG9tIGxlZnRcIiwgMjQwKSxcbiAgICBMZWZ0OiBuZXcgQ29ybmVyKFwibGVmdFwiLCAxODApLFxufTtcblxuT2JqZWN0LmtleXMoSGV4YWdvbi5Db3JuZXJzKS5mb3JFYWNoKGZ1bmN0aW9uKGNvcm5lcktleSkge1xuICAgIHZhciBjb3JuZXIgPSBIZXhhZ29uLkNvcm5lcnNbY29ybmVyS2V5XTtcblxuICAgIGNvcm5lci5yYWQgPSAoKChjb3JuZXIucm90YXRpb24gKyA2MCkgLyAxODApICUgMzYwKSAqIE1hdGguUEk7XG59KTtcblxuSGV4YWdvbi5Db3JuZXJzLm5leHQgPSBmdW5jdGlvbihzdGFydCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBzd2l0Y2ggKHN0YXJ0KSB7XG4gICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuVG9wTGVmdDpcbiAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5Db3JuZXJzLlRvcFJpZ2h0O1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uQ29ybmVycy5Ub3BSaWdodDpcbiAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5Db3JuZXJzLlJpZ2h0O1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uQ29ybmVycy5SaWdodDpcbiAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5Db3JuZXJzLkJvdHRvbVJpZ2h0O1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uQ29ybmVycy5Cb3R0b21SaWdodDpcbiAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5Db3JuZXJzLkJvdHRvbUxlZnQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLkJvdHRvbUxlZnQ6XG4gICAgICAgIHJlc3VsdCA9IEhleGFnb24uQ29ybmVycy5MZWZ0O1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uQ29ybmVycy5MZWZ0OlxuICAgICAgICByZXN1bHQgPSBIZXhhZ29uLkNvcm5lcnMuVG9wTGVmdDtcbiAgICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzdGFydCBjb3JuZXIgXCIgKyBzdGFydCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkhleGFnb24uQ29ybmVycy5vcHBvc2l0ZSA9IGZ1bmN0aW9uKHN0YXJ0KSB7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIHN3aXRjaCAoc3RhcnQpIHtcbiAgICBjYXNlIEhleGFnb24uQ29ybmVycy5Ub3BMZWZ0OlxuICAgICAgICByZXN1bHQgPSBIZXhhZ29uLkNvcm5lcnMuQm90dG9tUmlnaHQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLlRvcFJpZ2h0OlxuICAgICAgICByZXN1bHQgPSBIZXhhZ29uLkNvcm5lcnMuQm90dG9tTGVmdDtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuUmlnaHQ6XG4gICAgICAgIHJlc3VsdCA9IEhleGFnb24uQ29ybmVycy5MZWZ0O1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uQ29ybmVycy5Cb3R0b21SaWdodDpcbiAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5Db3JuZXJzLlRvcExlZnQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLkJvdHRvbUxlZnQ6XG4gICAgICAgIHJlc3VsdCA9IEhleGFnb24uQ29ybmVycy5Ub3BSaWdodDtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuTGVmdDpcbiAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5Db3JuZXJzLlJpZ2h0O1xuICAgICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHN0YXJ0IGNvcm5lciBcIiArIHN0YXJ0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuSGV4YWdvbi5Db3JuZXJzLmNvbm5lY3RpbmcgPSBmdW5jdGlvbihzdGFydCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBzd2l0Y2ggKHN0YXJ0KSB7XG4gICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuVG9wTGVmdDpcbiAgICAgICAgcmVzdWx0ID0gW1xuICAgICAgICAgICAgSGV4YWdvbi5Db3JuZXJzLlJpZ2h0LFxuICAgICAgICAgICAgSGV4YWdvbi5Db3JuZXJzLkJvdHRvbUxlZnQsXG4gICAgICAgIF07XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLlRvcFJpZ2h0OlxuICAgICAgICByZXN1bHQgPSBbXG4gICAgICAgICAgICBIZXhhZ29uLkNvcm5lcnMuQm90dG9tUmlnaHQsXG4gICAgICAgICAgICBIZXhhZ29uLkNvcm5lcnMuTGVmdCxcbiAgICAgICAgXTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuUmlnaHQ6XG4gICAgICAgIHJlc3VsdCA9IFtcbiAgICAgICAgICAgIEhleGFnb24uQ29ybmVycy5Cb3R0b21MZWZ0LFxuICAgICAgICAgICAgSGV4YWdvbi5Db3JuZXJzLlRvcExlZnQsXG4gICAgICAgIF07XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLkJvdHRvbVJpZ2h0OlxuICAgICAgICByZXN1bHQgPSBbXG4gICAgICAgICAgICBIZXhhZ29uLkNvcm5lcnMuTGVmdCxcbiAgICAgICAgICAgIEhleGFnb24uQ29ybmVycy5Ub3BSaWdodCxcbiAgICAgICAgXTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuQm90dG9tTGVmdDpcbiAgICAgICAgcmVzdWx0ID0gW1xuICAgICAgICAgICAgSGV4YWdvbi5Db3JuZXJzLlJpZ2h0LFxuICAgICAgICAgICAgSGV4YWdvbi5Db3JuZXJzLlRvcExlZnQsXG4gICAgICAgIF07XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLkxlZnQ6XG4gICAgICAgIHJlc3VsdCA9IFtcbiAgICAgICAgICAgIEhleGFnb24uQ29ybmVycy5Cb3R0b21SaWdodCxcbiAgICAgICAgICAgIEhleGFnb24uQ29ybmVycy5Ub3BSaWdodCxcbiAgICAgICAgXTtcbiAgICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzdGFydCBjb3JuZXIgXCIgKyBzdGFydCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkhleGFnb24uU2lkZXMgPSB7XG4gICAgVG9wOiBuZXcgU2lkZShcInRvcFwiLCBIZXhhZ29uLkNvcm5lcnMuVG9wTGVmdCwgSGV4YWdvbi5Db3JuZXJzLlRvcFJpZ2h0KSxcbiAgICBUb3BSaWdodDogbmV3IFNpZGUoXCJ0b3AgcmlnaHRcIiwgSGV4YWdvbi5Db3JuZXJzLlRvcFJpZ2h0LCBIZXhhZ29uLkNvcm5lcnMuUmlnaHQpLFxuICAgIEJvdHRvbVJpZ2h0OiBuZXcgU2lkZShcImJvdHRvbSByaWdodFwiLCBIZXhhZ29uLkNvcm5lcnMuUmlnaHQsIEhleGFnb24uQ29ybmVycy5Cb3R0b21SaWdodCksXG4gICAgQm90dG9tOiBuZXcgU2lkZShcImJvdHRvbVwiLCBIZXhhZ29uLkNvcm5lcnMuQm90dG9tUmlnaHQsIEhleGFnb24uQ29ybmVycy5Cb3R0b21MZWZ0KSxcbiAgICBCb3R0b21MZWZ0OiBuZXcgU2lkZShcImJvdHRvbSBsZWZ0XCIsIEhleGFnb24uQ29ybmVycy5Cb3R0b21MZWZ0LCBIZXhhZ29uLkNvcm5lcnMuTGVmdCksXG4gICAgVG9wTGVmdDogbmV3IFNpZGUoXCJ0b3AgbGVmdFwiLCBIZXhhZ29uLkNvcm5lcnMuTGVmdCwgSGV4YWdvbi5Db3JuZXJzLlRvcExlZnQpLFxufTtcblxuSGV4YWdvbi5TaWRlcy5hbGwgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICBIZXhhZ29uLlNpZGVzLlRvcCxcbiAgICAgICAgSGV4YWdvbi5TaWRlcy5Ub3BSaWdodCxcbiAgICAgICAgSGV4YWdvbi5TaWRlcy5Cb3R0b21SaWdodCxcbiAgICAgICAgSGV4YWdvbi5TaWRlcy5Cb3R0b20sXG4gICAgICAgIEhleGFnb24uU2lkZXMuQm90dG9tTGVmdCxcbiAgICAgICAgSGV4YWdvbi5TaWRlcy5Ub3BMZWZ0LFxuICAgIF07XG59O1xuXG5IZXhhZ29uLlNpZGVzLm5leHQgPSBmdW5jdGlvbihzdGFydCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBzd2l0Y2ggKHN0YXJ0KSB7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLlRvcDpcbiAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5TaWRlcy5Ub3BSaWdodDtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLlRvcFJpZ2h0OlxuICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLkJvdHRvbVJpZ2h0O1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQ6XG4gICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuQm90dG9tO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tOlxuICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLkJvdHRvbUxlZnQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Cb3R0b21MZWZ0OlxuICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLlRvcExlZnQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Ub3BMZWZ0OlxuICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLlRvcDtcbiAgICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBzdGFydCBzaWRlIFwiICsgc3RhcnQpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5IZXhhZ29uLlNpZGVzLm9wcG9zaXRlID0gZnVuY3Rpb24oc3RhcnQpIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgc3dpdGNoIChzdGFydCkge1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Ub3A6XG4gICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuQm90dG9tO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wUmlnaHQ6XG4gICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuQm90dG9tTGVmdDtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLkJvdHRvbVJpZ2h0OlxuICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLlRvcExlZnQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Cb3R0b206XG4gICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuVG9wO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tTGVmdDpcbiAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5TaWRlcy5Ub3BSaWdodDtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLlRvcExlZnQ6XG4gICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gc3RhcnQgc2lkZSBcIiArIHN0YXJ0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuSGV4YWdvbi5TaWRlcy5mcm9tQ29ybmVyID0gZnVuY3Rpb24oc3RhcnQpIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgc3dpdGNoIChzdGFydCkge1xuICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLlRvcExlZnQ6XG4gICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuVG9wO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uQ29ybmVycy5Ub3BSaWdodDpcbiAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5TaWRlcy5Ub3BSaWdodDtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuUmlnaHQ6XG4gICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLkJvdHRvbVJpZ2h0OlxuICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLkJvdHRvbTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuQm90dG9tTGVmdDpcbiAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5TaWRlcy5Cb3R0b21MZWZ0O1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uQ29ybmVycy5MZWZ0OlxuICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLlRvcExlZnQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gc3RhcnQgc2lkZSBcIiArIHN0YXJ0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuSGV4YWdvbi5wcm90b3R5cGUuZ2V0TGluZVRocm91Z2hNaWRkbGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGluZSxcbiAgICAgICAgc2VsZiA9IHRoaXM7XG5cbiAgICB0aGlzLmNvcm5lclBvaW50cygpXG4gICAgICAgIC5zbGljZSgwLCAyKVxuICAgICAgICAuc29tZShmdW5jdGlvbiBmaW5kVHdvT3Bwb3NpbmdDb3JuZXJzKGNvcm5lclBvaW50KSB7XG4gICAgICAgICAgICB2YXIgb3Bwb3NpdGVDb3JuZXIgPSAoISFjb3JuZXJQb2ludCkgJiYgSGV4YWdvbi5Db3JuZXJzLm9wcG9zaXRlKGNvcm5lclBvaW50LmNvcm5lciksXG4gICAgICAgICAgICAgICAgb3Bwb3NpdGVDb3JuZXJQb2ludCA9ICghIW9wcG9zaXRlQ29ybmVyKSAmJiBzZWxmLmdldENvcm5lclBvaW50KG9wcG9zaXRlQ29ybmVyKTtcblxuICAgICAgICAgICAgbGluZSA9IG9wcG9zaXRlQ29ybmVyUG9pbnQgJiYgbmV3IExpbmUoY29ybmVyUG9pbnQucG9pbnQsIG9wcG9zaXRlQ29ybmVyUG9pbnQucG9pbnQpO1xuXG4gICAgICAgICAgICBpZiAobGluZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgcmV0dXJuIGxpbmUgfHwgbnVsbDtcbn07XG5cbkhleGFnb24ucHJvdG90eXBlLmdldENlbnRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsaW5lVGhyb3VnaE1pZGRsZSA9IHRoaXMuZ2V0TGluZVRocm91Z2hNaWRkbGUoKSxcbiAgICAgICAgY2VudGVyID0gbGluZVRocm91Z2hNaWRkbGUgJiYgbGluZVRocm91Z2hNaWRkbGUuY2VudGVyKCk7XG5cbiAgICByZXR1cm4gY2VudGVyIHx8IG51bGw7XG59O1xuXG5IZXhhZ29uLnByb3RvdHlwZS5nZXRDYWNoZUtleSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjZW50ZXIgPSB0aGlzLmdldENlbnRlcigpLFxuICAgICAgICBjZW50ZXJDYWNoZUtleSA9IGNlbnRlciAmJiBjZW50ZXIuY2FjaGVLZXk7XG5cbiAgICByZXR1cm4gY2VudGVyQ2FjaGVLZXkgfHwgbnVsbDtcbn07XG5cbkhleGFnb24ucHJvdG90eXBlLmNvcm5lckNvdW50ID0gZnVuY3Rpb24oKSB7XG4gICAgLy8gVE9ETzogZ2V0IGEgbGlicmFyeSB0aGF0IGhhcyAuY291bnQoKVxuICAgIHZhciBjb3VudCA9IHRoaXMuY29ybmVyUG9pbnRzKCkucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGNvcm5lclBvaW50KSB7XG4gICAgICAgIHJldHVybiBwcmV2ICsgKChjb3JuZXJQb2ludCkgPyAxIDogMCk7XG4gICAgfSwgMCk7XG5cbiAgICByZXR1cm4gY291bnQ7XG59O1xuXG5IZXhhZ29uLnByb3RvdHlwZS5pc0NvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuY29ybmVyQ291bnQoKSA9PT0gTlVNQkVSX09GX1NJREVTO1xufTtcblxuSGV4YWdvbi5wcm90b3R5cGUuY29ybmVyUG9pbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFt0aGlzLnBvaW50cy50b3BMZWZ0LCB0aGlzLnBvaW50cy50b3BSaWdodCwgdGhpcy5wb2ludHMucmlnaHQsIHRoaXMucG9pbnRzLmJvdHRvbVJpZ2h0LCB0aGlzLnBvaW50cy5ib3R0b21MZWZ0LCB0aGlzLnBvaW50cy5sZWZ0XTtcbn07XG5cbkhleGFnb24ucHJvdG90eXBlLmdldENvcm5lclBvaW50ID0gZnVuY3Rpb24oY29ybmVyKSB7XG4gICAgdmFyIHJlc3VsdCA9IG51bGw7XG5cbiAgICB0aGlzLmNvcm5lclBvaW50cygpLnNvbWUoZnVuY3Rpb24oY29ybmVyUG9pbnQpIHtcbiAgICAgICAgLy8gVE9ETzogZml4IGVxdWFsaXR5IGNoZWNrXG4gICAgICAgIGlmIChjb3JuZXJQb2ludC5jb3JuZXIucm90YXRpb24gPT09IGNvcm5lci5yb3RhdGlvbikge1xuICAgICAgICAgICAgcmVzdWx0ID0gY29ybmVyUG9pbnQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5IZXhhZ29uLnByb3RvdHlwZS5zZXRDb3JuZXJQb2ludCA9IGZ1bmN0aW9uKGNvcm5lciwgcG9pbnQpIHtcbiAgICB2YXIgY29ybmVyUG9pbnQgPSBuZXcgQ29ybmVyUG9pbnQoY29ybmVyLCBwb2ludCk7XG5cbiAgICBzd2l0Y2ggKGNvcm5lcikge1xuICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLlRvcExlZnQ6XG4gICAgICAgIHRoaXMucG9pbnRzLnRvcExlZnQgPSBjb3JuZXJQb2ludDtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuVG9wUmlnaHQ6XG4gICAgICAgIHRoaXMucG9pbnRzLnRvcFJpZ2h0ID0gY29ybmVyUG9pbnQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLlJpZ2h0OlxuICAgICAgICB0aGlzLnBvaW50cy5yaWdodCA9IGNvcm5lclBvaW50O1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uQ29ybmVycy5Cb3R0b21SaWdodDpcbiAgICAgICAgdGhpcy5wb2ludHMuYm90dG9tUmlnaHQgPSBjb3JuZXJQb2ludDtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuQm90dG9tTGVmdDpcbiAgICAgICAgdGhpcy5wb2ludHMuYm90dG9tTGVmdCA9IGNvcm5lclBvaW50O1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uQ29ybmVycy5MZWZ0OlxuICAgICAgICB0aGlzLnBvaW50cy5sZWZ0ID0gY29ybmVyUG9pbnQ7XG4gICAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gY29ybmVyIFwiICsgY29ybmVyKTtcbiAgICB9XG59O1xuXG5IZXhhZ29uLnByb3RvdHlwZS5zaWRlQ291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBUT0RPOiBnZXQgYSBsaWJyYXJ5IHRoYXQgaGFzIC5jb3VudCgpXG4gICAgdmFyIGNvdW50ID0gdGhpcy5zaWRlTGluZXMoKS5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgc2lkZUxpbmUpIHtcbiAgICAgICAgcmV0dXJuIHByZXYgKyAoc2lkZUxpbmUgPT09IHVuZGVmaW5lZCA/IDAgOiAxKTtcbiAgICB9LCAwKTtcblxuICAgIHJldHVybiBjb3VudDtcbn07XG5cbkhleGFnb24ucHJvdG90eXBlLnNpZGVMaW5lcyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBbdGhpcy5saW5lcy50b3AsIHRoaXMubGluZXMudG9wUmlnaHQsIHRoaXMubGluZXMuYm90dG9tUmlnaHQsIHRoaXMubGluZXMuYm90dG9tLCB0aGlzLmxpbmVzLmJvdHRvbUxlZnQsIHRoaXMubGluZXMudG9wTGVmdF07XG59O1xuXG5IZXhhZ29uLnByb3RvdHlwZS5nZXRTaWRlTGluZSA9IGZ1bmN0aW9uKHNpZGUpIHtcbiAgICB2YXIgcmVzdWx0ID0gbnVsbDtcblxuICAgIHRoaXMuc2lkZUxpbmVzKCkuc29tZShmdW5jdGlvbihzaWRlTGluZSkge1xuICAgICAgICAvLyBUT0RPOiBmaXggZXF1YWxpdHkgY2hlY2tcbiAgICAgICAgaWYgKHNpZGVMaW5lLnNpZGUuZ2V0Um90YXRpb24oKSA9PT0gc2lkZS5nZXRSb3RhdGlvbigpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBzaWRlTGluZTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkhleGFnb24ucHJvdG90eXBlLnNldFNpZGVMaW5lID0gZnVuY3Rpb24oc2lkZSwgbGluZSkge1xuICAgIHZhciBzaWRlTGluZSA9IG5ldyBTaWRlTGluZShzaWRlLCBsaW5lKTtcblxuICAgIHN3aXRjaCAoc2lkZSkge1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Ub3A6XG4gICAgICAgIHRoaXMubGluZXMudG9wID0gc2lkZUxpbmU7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Ub3BSaWdodDpcbiAgICAgICAgdGhpcy5saW5lcy50b3BSaWdodCA9IHNpZGVMaW5lO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQ6XG4gICAgICAgIHRoaXMubGluZXMuYm90dG9tUmlnaHQgPSBzaWRlTGluZTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLkJvdHRvbTpcbiAgICAgICAgdGhpcy5saW5lcy5ib3R0b20gPSBzaWRlTGluZTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBIZXhhZ29uLlNpZGVzLkJvdHRvbUxlZnQ6XG4gICAgICAgIHRoaXMubGluZXMuYm90dG9tTGVmdCA9IHNpZGVMaW5lO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wTGVmdDpcbiAgICAgICAgdGhpcy5saW5lcy50b3BMZWZ0ID0gc2lkZUxpbmU7XG4gICAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gc2lkZSBcIiArIHNpZGUpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGV4YWdvbjtcbiIsInZhciBQb2ludCA9IHJlcXVpcmUoXCIuL3BvaW50LmpzXCIpO1xuXG5mdW5jdGlvbiBMaW5lKHN0YXJ0LCBlbmQpIHtcbiAgICB0aGlzLnN0YXJ0ID0gc3RhcnQ7XG4gICAgdGhpcy5lbmQgPSBlbmQ7XG4gICAgdGhpcy5jYWNoZUtleSA9IHRoaXMuX2dldENhY2hlS2V5KCk7XG4gICAgdGhpcy5fX2NlbnRlciA9IG51bGw7XG5cbiAgICByZXR1cm4gdGhpcztcbn1cblxuTGluZS5wcm90b3R5cGUuX2dldENhY2hlS2V5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN0YXJ0ID0gdGhpcy5zdGFydC5jYWNoZUtleSxcbiAgICAgICAgZW5kID0gdGhpcy5lbmQuY2FjaGVLZXksXG4gICAgICAgIHJlc3VsdDtcblxuICAgIGlmIChzdGFydCA8IGVuZCkge1xuICAgICAgICByZXN1bHQgPSBzdGFydCArIFwiLVwiICsgZW5kO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdCA9IGVuZCArIFwiLVwiICsgc3RhcnQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkxpbmUucHJvdG90eXBlLl9jZW50ZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgeCA9ICh0aGlzLnN0YXJ0LnggKyB0aGlzLmVuZC54KSAvIDIsXG4gICAgICAgIHkgPSAodGhpcy5zdGFydC55ICsgdGhpcy5lbmQueSkgLyAyLFxuICAgICAgICByZXN1bHQgPSBuZXcgUG9pbnQoeCwgeSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuTGluZS5wcm90b3R5cGUuY2VudGVyID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICh0aGlzLl9fY2VudGVyIHx8ICh0aGlzLl9fY2VudGVyID0gdGhpcy5fY2VudGVyKCkpKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTGluZTtcbiIsImZ1bmN0aW9uIFBvaW50KHgsIHkpIHtcbiAgICB0aGlzLnggPSB4O1xuICAgIHRoaXMueSA9IHk7XG4gICAgdGhpcy5jYWNoZUtleSA9IHRoaXMuX2dldENhY2hlS2V5KCk7XG5cbiAgICByZXR1cm4gdGhpcztcbn1cblxuUG9pbnQucHJvdG90eXBlLl9nZXRDYWNoZUtleSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB4ID0gdGhpcy54LnRvRml4ZWQoMyksXG4gICAgICAgIHkgPSB0aGlzLnkudG9GaXhlZCgzKSxcbiAgICAgICAgcmVzdWx0ID0geCArIFwiLCBcIiArIHk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQb2ludDtcbiIsImZ1bmN0aW9uIFNpZGUobmFtZSwgc3RhcnQsIGVuZCkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgIHRoaXMuZW5kID0gZW5kO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59XG5cblNpZGUucHJvdG90eXBlLmdldFJvdGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN0YXJ0ID0gdGhpcy5zdGFydC5yb3RhdGlvbixcbiAgICAgICAgZW5kID0gdGhpcy5lbmQucm90YXRpb24sXG4gICAgICAgIHRlbXAsXG4gICAgICAgIHJvdGF0aW9uO1xuXG4gICAgaWYgKHN0YXJ0ID4gZW5kKSB7XG4gICAgICAgIHRlbXAgPSBzdGFydDtcbiAgICAgICAgc3RhcnQgPSBlbmQ7XG4gICAgICAgIGVuZCA9IHRlbXA7XG4gICAgfVxuXG4gICAgcm90YXRpb24gPSAoc3RhcnQgKyAoKGVuZCAtIHN0YXJ0KSAvIDIpKSAlIDM2MDtcblxuICAgIGlmICgoZW5kIC0gc3RhcnQpID4gMTgwKSB7XG4gICAgICAgIHJvdGF0aW9uICs9IDE4MDtcbiAgICB9XG5cbiAgICByZXR1cm4gcm90YXRpb247XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNpZGU7XG4iLCJmdW5jdGlvbiBTaWRlTGluZShzaWRlLCBsaW5lKSB7XG4gICAgdGhpcy5zaWRlID0gc2lkZTtcbiAgICB0aGlzLmxpbmUgPSBsaW5lO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2lkZUxpbmU7XG4iLCJmdW5jdGlvbiBkZWxheShmbiwgbWlsbGlzZWNvbmRzKSB7XG4gICAgdmFyIGRlbGF5ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZuLmJpbmQobnVsbCksIG1pbGxpc2Vjb25kcyk7XG4gICAgfTtcblxuICAgIHJldHVybiBkZWxheWVyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRlbGF5O1xuIiwidmFyIEJBU0UgPSAxMDtcblxuZnVuY3Rpb24gbGltaXRQcmVjaXNpb24obiwgZGVjaW1hbHMpIHtcbiAgICB2YXIgcG93ID0gTWF0aC5wb3coQkFTRSwgZGVjaW1hbHMpLFxuICAgICAgICByZXN1bHQgPSBNYXRoLnJvdW5kKG4gKiBwb3cpIC8gcG93O1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBsaW1pdFByZWNpc2lvbjtcbiIsInZhciBvbmNlID0gcmVxdWlyZShcIi4vb25jZS5qc1wiKTtcblxuZnVuY3Rpb24gbW91c2VEZXRlY3Rvcihmbikge1xuICAgIC8vIEV4cGVyaW1lbnRhbCBjb2RlIHRvIGRldGVjdCBpZiBhIG1vdXNlIHBvaW50aW5nIGRldmljZSBpcyB1c2VkLlxuICAgIC8vIElmIGEgbW91c2UgaXMgZGV0ZWN0ZWQsIGNhbGwgdGhlIHN1cHBsaWVkIGZ1bmN0aW9uIG9uY2UuXG4gICAgdmFyIG9uVG91Y2hNb3ZlRXZlbnRBcmdzID0ge1xuICAgICAgICAgICAgdGFyZ2V0OiBudWxsLFxuICAgICAgICB9LFxuICAgICAgICBvblRvdWNoTW92ZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIG9uVG91Y2hNb3ZlRXZlbnRBcmdzLnRhcmdldCA9IGUudGFyZ2V0O1xuICAgICAgICB9LFxuICAgICAgICBvbk1vdXNlTW92ZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIC8vIElmIHRoZSB0YXJnZXQgaXNuJ3QgdGhlIHNhbWUsIHRoZSBhc3N1bXB0aW9uIGlzIHRoYXQgdGhlIHRvdWNobW92ZSBldmVudCB3YXNuJ3QgZmlyZWQgZmlyc3QgLSBoZW5jZSBpdCdzIG5vdCBhIHRvdWNoIGV2ZW50LlxuICAgICAgICAgICAgLy8gVE9ETzogd291bGQgYmUgYmV0dGVyIHRvIHVzZSB0aGUgbW91c2UgZXZlbnQgLnggYW5kIC55LCBpZiBtYXRjaGluZyBvbmVzIGV4aXN0IGluIHRvdWNobW92ZSBldGNldGVyYS5cbiAgICAgICAgICAgIGlmIChvblRvdWNoTW92ZUV2ZW50QXJncy50YXJnZXQgIT09IGUudGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgb25EZXRlY3QoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVsZWFzZSBwb2ludGVyXG4gICAgICAgICAgICBvblRvdWNoTW92ZUV2ZW50QXJncy50YXJnZXQgPSBudWxsO1xuICAgICAgICB9LFxuICAgICAgICBvbkRldGVjdCA9IG9uY2UoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwidG91Y2htb3ZlXCIsIG9uVG91Y2hNb3ZlKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgb25Nb3VzZU1vdmUpO1xuICAgICAgICAgICAgZm4uY2FsbChudWxsKTtcbiAgICAgICAgfSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwidG91Y2htb3ZlXCIsIG9uVG91Y2hNb3ZlKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIG9uTW91c2VNb3ZlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBtb3VzZURldGVjdG9yO1xuIiwiZnVuY3Rpb24gb25jZShmbikge1xuICAgIHZhciBoYXNSdW4gPSBmYWxzZSxcbiAgICAgICAgcnVuT25jZUNoZWNrID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAoIWhhc1J1bikge1xuICAgICAgICAgICAgICAgIGhhc1J1biA9IHRydWU7XG4gICAgICAgICAgICAgICAgZm4uY2FsbChudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgIHJldHVybiBydW5PbmNlQ2hlY2s7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gb25jZTtcbiIsImZ1bmN0aW9uIG9uZUF0QVRpbWVQbGVhc2UoZm4pIHtcbiAgICB2YXIgcnVubmluZyA9IGZhbHNlLFxuICAgICAgICB3cmFwcGVyID0gZnVuY3Rpb24gb25lQXRBVGltZVBsZWFzZVdyYXBwZXIoKSB7XG4gICAgICAgICAgICBpZiAocnVubmluZykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJ1bm5pbmcgPSB0cnVlO1xuXG4gICAgICAgICAgICBmbi5jYWxsKG51bGwpO1xuXG4gICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIH07XG5cbiAgICByZXR1cm4gd3JhcHBlcjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBvbmVBdEFUaW1lUGxlYXNlO1xuIiwiZnVuY3Rpb24gd3JhcChuYW1lLCBmbikge1xuICAgIHZhciB3cmFwcGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgICAgLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuICAgICAgICBpZiAoY29uc29sZSAmJiBjb25zb2xlLnRpbWVsaW5lKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zb2xlLnRpbWVsaW5lKG5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5wcm9maWxlKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zb2xlLnByb2ZpbGUobmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQgPSBmbi5jYWxsKG51bGwpO1xuXG4gICAgICAgIGlmIChjb25zb2xlICYmIGNvbnNvbGUudGltZWxpbmVFbmQpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnNvbGUudGltZWxpbmVFbmQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25zb2xlICYmIGNvbnNvbGUucHJvZmlsZUVuZClcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc29sZS5wcm9maWxlRW5kKCk7XG4gICAgICAgIH1cbiAgICAgICAgLyogZXNsaW50LWVuYWJsZSBuby1jb25zb2xlICovXG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHdyYXBwZWQ7XG59XG5cbnZhciBhcGkgPSB7XG4gICAgd3JhcDogd3JhcCxcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYXBpO1xuIiwiZnVuY3Rpb24gZmxvYXRpbmdQb2ludChmcm9tLCB0bykge1xuICAgIGlmICh0byA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRvID0gZnJvbTtcbiAgICAgICAgZnJvbSA9IDA7XG4gICAgfVxuXG4gICAgdmFyIHJuZCA9IE1hdGgucmFuZG9tKCksXG4gICAgICAgIHJlc3VsdCA9IGZyb20gKyAocm5kICogdG8pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaW50ZWdlcihmcm9tLCB0bykge1xuICAgIHZhciBmcCA9IGZsb2F0aW5nUG9pbnQoZnJvbSwgdG8pLFxuICAgICAgICByZXN1bHQgPSBNYXRoLmZsb29yKGZwKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbnZhciBhcGkgPSB7XG4gICAgZmxvYXRpbmdQb2ludDogZmxvYXRpbmdQb2ludCxcbiAgICBpbnRlZ2VyOiBpbnRlZ2VyLFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBhcGk7XG4iLCJmdW5jdGlvbiByZXNpemVEZXRlY3RvcihlbGVtZW50LCBmbikge1xuICAgIC8vIEN1cnJlbnRseSBub3QgY2hlY2tpbmcgZm9yIGhlaWdodCBjaGFuZ2VzIGJlY2F1c2UgdGhhdCB3b3VsZFxuICAgIC8vIHJlc2V0IHRoZSBlbGVtZW50IGV2ZXJ5IHRpbWUgdGhlIGRldmVsb3BlciBjb25zb2xlIHdhcyB0b2dnbGVkLlxuXG4gICAgLy8gQ2hyb21lIG9uIEFuZHJvaWQgYWxzbyB0cmlnZ2VycyBhIHJlc2l6ZSB3aGVuIHNjcm9sbGluZyBlbm91Z2ggdG9cbiAgICAvLyBoaWRlIHRoZSBhZGRyZXNzIGJhciBhbmQgbWVudS5cblxuICAgIC8vIFRPRE86IHJlYWQgdGhpcyB2YWx1ZSBvbmNlIGFmdGVyIGVsZW1lbnQgaGFzIGJlZW4gZHJhd24sIG90aGVyd2lzZSB0aGUgZmlyc3RcbiAgICAvLyByZXNpemUsIGV2ZW4gaWYgaW4gaGVpZ2h0LCB3aWxsIHRyaWdnZXIgdGhlIGRyYXdpbmcuXG4gICAgdmFyIHByZXZpb3VzRWxlbWVudFdpZHRoID0gMDtcblxuICAgIC8vIFRPRE86IHJlbW92ZSBsaXN0ZW5lcj9cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBmdW5jdGlvbiBvblJlc2l6ZUV2ZW50TGlzdGVuZXIoKSB7XG4gICAgICAgIGlmICghZWxlbWVudCkge1xuICAgICAgICAgICAgZm4uY2FsbChudWxsKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwcmV2aW91c0VsZW1lbnRXaWR0aCAhPT0gZWxlbWVudC5zY3JvbGxXaWR0aCkge1xuICAgICAgICAgICAgcHJldmlvdXNFbGVtZW50V2lkdGggPSBlbGVtZW50LnNjcm9sbFdpZHRoO1xuXG4gICAgICAgICAgICBmbi5jYWxsKG51bGwpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVzaXplRGV0ZWN0b3I7XG4iXX0=
