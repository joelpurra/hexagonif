(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
        HighlightOnInterval = require("./modules/logic/highlight-on-interval.js"),
        debounce = (window.Cowboy || $).debounce;

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
    resizeDetector(getCanvas(), debounce(1000, delay(run, 100)));
}());
},{"./modules/logic/activity-monitor.js":2,"./modules/logic/events.js":3,"./modules/logic/graph-objects-tool.js":4,"./modules/logic/grapher.js":5,"./modules/logic/highlight-on-interval.js":6,"./modules/logic/renderer.js":7,"./modules/objects/line.js":13,"./modules/objects/point.js":14,"./modules/utils/delay.js":17,"./modules/utils/mouse-detector.js":19,"./modules/utils/once.js":20,"./modules/utils/one-at-a-time-please.js":21,"./modules/utils/profiling.js":22,"./modules/utils/random.js":23,"./modules/utils/resize-detector.js":24}],2:[function(require,module,exports){
var HexEvent = require("./events.js"),
    activityEventName = "user.activity",
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
},{"./events.js":3}],3:[function(require,module,exports){
function HexEvents(canvasElement, namespacePrefix) {
    this.canvasElement = canvasElement;
    this.namespacePrefix = namespacePrefix || 'hexagonif.';
}

HexEvents.prototype.getEventName = function(name) {
    return this.namespacePrefix + name;
}

HexEvents.prototype.fire = function(name, graphic, object) {
    var event = document.createEvent('HTMLEvents'),
        namespacedName = this.getEventName(name);

    event.initEvent(namespacedName, true, true);
    event.graphic = graphic;
    event.object = object;
    return this.canvasElement.dispatchEvent(event);
}

HexEvents.prototype.listen = function(name, fn) {
    var namespacedName = this.getEventName(name);

    this.canvasElement.addEventListener(namespacedName, fn);
}

HexEvents.prototype.cancel = function(name, fn) {
    var namespacedName = this.getEventName(name);

    this.canvasElement.removeEventListener(namespacedName, fn);
}

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
}

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
    limitPrecision = require("../utils/limit-precision.js"),
    random = require("../utils/random.js");

function getOrGenerateHexagon(cache, hexagonSideLength, startPoint, startCorner) {
    var hexagon = new Hexagon();

    var point = startPoint,
        corner = startCorner;

    do {
        // Points and corners
        {
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
        }

        // Lines and sides
        {
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
        }

        point = nextPoint;
        corner = nextCorner;

        // TODO: fix equality check
    } while (corner.rotation !== startCorner.rotation)

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

function addNeighbors(gonif) {
    var sidesToCheck = Hexagon.Sides.all();

    while (side = sidesToCheck.shift()) {
        var neighbor = gonif.getNeighbor(side);

        if (!!neighbor) {
            var sharedNeighborDirections = Gonif.Neighbors.getSharedNeighborDirections(side);

            sharedNeighborDirections.forEach(function(sharedNeighborDirection) {
                var sharedNeighbor = neighbor.getNeighbor(sharedNeighborDirection.fromNeighbor);

                if ((!!sharedNeighbor) && gonif.getNeighbor(sharedNeighborDirection.fromHere) !== sharedNeighbor) {
                    gonif.setNeighbor(sharedNeighborDirection.fromHere, sharedNeighbor);
                    sharedNeighbor.setNeighbor(Hexagon.Sides.opposite(sharedNeighborDirection.fromHere), gonif);

                    // In case this one has neighbors still unknown, but already checked in the inital pass.
                    sidesToCheck.push(sharedNeighborDirection.fromHere);
                }
            });
        }
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
    } while (area.isInside(startPoint))
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
    } while (!!gonif);

    // Start from left neighbor of the first gonif.
    gonif = startGonif.getNeighbor(Hexagon.Sides.BottomLeft) || startGonif.getNeighbor(Hexagon.Sides.TopLeft);

    // Generate based on neighbors to the west.
    if (!!gonif) {
        do {
            generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.Top);
            generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.Bottom);
            gonif = gonif.getNeighbor(Hexagon.Sides.BottomLeft) || gonif.getNeighbor(Hexagon.Sides.TopLeft);
        } while (!!gonif);
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
},{"../objects/area.js":8,"../objects/gonif.js":11,"../objects/hexagon.js":12,"../objects/line.js":13,"../objects/point.js":14,"../utils/limit-precision.js":18,"../utils/random.js":23}],6:[function(require,module,exports){
var MAX_AUTO_HIGHLIGHT_DELAY = 10,
    random = require("../utils/random.js");

function HighlightOnInterval(scene, graphObjectsTool, hexEvent) {
    this.scene = scene;
    this.graphObjectsTool = graphObjectsTool;
    this.hexEvent = hexEvent;

    this.isHighlighterStarted = false;
    this.highlightCounter = 0,
    this.highlightCounterInterval = null;
    this.isAutomatedHighlight = false,
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
}

HighlightOnInterval.prototype.resetRandomLine = function() {
    var line = this.graphObjectsTool.getRandomLine();

    this.scene.resetLine(line);
}

HighlightOnInterval.prototype.highlightRandomLine = function() {
    var line = this.graphObjectsTool.getRandomLine();

    this.isAutomatedHighlight = true;
    this.scene.highlightLine(line);
    this.isAutomatedHighlight = false;

    setTimeout(function unhighlightSameRandomLine() {
        this.scene.unhighlightLine(line);
    }.bind(this), this.unhighlightAfterMilliseconds);
}

HighlightOnInterval.prototype.highlightRandomHexagon = function() {
    var hexagon;

    do {
        hexagon = this.graphObjectsTool.getRandomHexagon();
    } while (!hexagon.isComplete())

    this.isAutomatedHighlight = true;
    this.scene.highlightHexagon(hexagon);
    this.isAutomatedHighlight = false;

    setTimeout(function unhighlightSameRandomHexagon() {
        this.scene.unhighlightHexagon(hexagon);
    }.bind(this), this.unhighlightAfterMilliseconds);
}

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
}

HighlightOnInterval.prototype.hexagonifLineHighlightEventListener = function() {
    if (!this.isAutomatedHighlight) {
        this.highlightCounter = Math.min(Number.MAX_VALUE - 1, this.highlightCounter + 1, MAX_AUTO_HIGHLIGHT_DELAY);
    }
}

HighlightOnInterval.prototype.hexagonifLineUnhighlightEventListener = function() {
    // Something
}

HighlightOnInterval.prototype.isStarted = function() {
    return this.isHighlighterStarted == true;
}

HighlightOnInterval.prototype.start = function() {
    if (this.isStarted()) {
        throw new Error("Was started.")
    }

    this.isHighlighterStarted = true;

    this.hexEvent.listen("line.highlight", this.boundListeners.hexagonifLineHighlightEventListener);
    this.hexEvent.listen("line.unhighlight", this.boundListeners.hexagonifLineUnhighlightEventListener);

    this.highlightCounterInterval = setInterval(this.boundListeners.highlightCounterDecreaser, this.highlightMilliseconds);
    this.highlightInterval = setInterval(this.boundListeners.highlightSomethingThatIfNothingHasHappened, this.highlightMilliseconds);
}

HighlightOnInterval.prototype.stop = function() {
    if (!this.isStarted()) {
        throw new Error("Was not started.")
    }

    this.hexEvent.cancel("line.highlight", this.boundListeners.hexagonifLineHighlightEventListener);
    this.hexEvent.cancel("line.unhighlight", this.boundListeners.hexagonifLineUnhighlightEventListener);

    clearInterval(this.highlightCounterInterval);
    clearInterval(this.highlightInterval);

    this.isHighlighterStarted = false;
}

module.exports = HighlightOnInterval;
},{"../utils/random.js":23}],7:[function(require,module,exports){
function renderer(canvasId, canvasArea, graphObjects) {
    var random = require("../utils/random.js"),
        Hexagon = require("../objects/hexagon.js"),
        HexEvent = require("./events.js");

    // TODO: use hidpi-canvas-polyfill
    // https://github.com/jondavidjohn/hidpi-canvas-polyfill
    var canvasElement = document.getElementById(canvasId);
    canvasElement.width = canvasArea.x;
    canvasElement.height = canvasArea.y;

    var hexEvent = new HexEvent(canvasElement);

    var canvas = oCanvas.create({
            canvas: "#" + canvasId
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
    });

    var gonifPrototype = canvas.display.polygon({
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
                y: start.y
            },
            end: {
                x: end.x,
                y: end.y
            },
            tag: tag
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
                y: center.y
            },
            radius: radius,
            tag: tag
        });

        scene.add(gonif);

        gonif
            .bind("click tap", onGonifClick);

        return gonif;
    }

    var sceneGrid = "grid";

    canvas.scenes.create(sceneGrid, function canvasScenesCreate() {
        var scene = this;

        // Object.keys(nodes).sort().reduce(function(start, end) {
        //     drawLineInScene(scene, nodes[start], nodes[end], node);

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
                graphic = drawGonifInScene(scene, origin, radius, gonif);

            graphicsLookupCache[cacheKey] = graphic;
        });

        // TODO: Async/queued object adding, so main user thread won't freeze/become unresponsive?
        Object.keys(graphObjects.lines).forEach(function linesForEachCreateGraphic(cacheKey) {
            var line = graphObjects.lines[cacheKey],
                graphic = drawLineInScene(scene, line.start, line.end, line);

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
        } while (side !== startSide)
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
                fromHere: Hexagon.Sides.TopLeft
            }, {
                fromNeighbor: Hexagon.Sides.BottomRight,
                fromHere: Hexagon.Sides.TopRight
            }];
            break;
        case Hexagon.Sides.TopRight:
            result = [{
                fromNeighbor: Hexagon.Sides.TopLeft,
                fromHere: Hexagon.Sides.Top
            }, {
                fromNeighbor: Hexagon.Sides.Bottom,
                fromHere: Hexagon.Sides.BottomRight
            }];
            break;
        case Hexagon.Sides.BottomRight:
            result = [{
                fromNeighbor: Hexagon.Sides.Top,
                fromHere: Hexagon.Sides.TopRight
            }, {
                fromNeighbor: Hexagon.Sides.BottomLeft,
                fromHere: Hexagon.Sides.Bottom
            }];
            break;
        case Hexagon.Sides.Bottom:
            result = [{
                fromNeighbor: Hexagon.Sides.TopRight,
                fromHere: Hexagon.Sides.BottomRight
            }, {
                fromNeighbor: Hexagon.Sides.TopLeft,
                fromHere: Hexagon.Sides.BottomLeft
            }];
            break;
        case Hexagon.Sides.BottomLeft:
            result = [{
                fromNeighbor: Hexagon.Sides.BottomRight,
                fromHere: Hexagon.Sides.Bottom
            }, {
                fromNeighbor: Hexagon.Sides.Top,
                fromHere: Hexagon.Sides.TopLeft
            }];
            break;
        case Hexagon.Sides.TopLeft:
            result = [{
                fromNeighbor: Hexagon.Sides.Bottom,
                fromHere: Hexagon.Sides.BottomLeft
            }, {
                fromNeighbor: Hexagon.Sides.TopRight,
                fromHere: Hexagon.Sides.Top
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
        this.neighbors.topLeft
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
    SideLine = require("./sideline.js");

var NUMBER_OF_SIDES = 6;

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
                Hexagon.Corners.BottomLeft
            ];
            break;
        case Hexagon.Corners.TopRight:
            result = [
                Hexagon.Corners.BottomRight,
                Hexagon.Corners.Left
            ];
            break;
        case Hexagon.Corners.Right:
            result = [
                Hexagon.Corners.BottomLeft,
                Hexagon.Corners.TopLeft
            ];
            break;
        case Hexagon.Corners.BottomRight:
            result = [
                Hexagon.Corners.Left,
                Hexagon.Corners.TopRight
            ];
            break;
        case Hexagon.Corners.BottomLeft:
            result = [
                Hexagon.Corners.Right,
                Hexagon.Corners.TopLeft
            ];
            break;
        case Hexagon.Corners.Left:
            result = [
                Hexagon.Corners.BottomRight,
                Hexagon.Corners.TopRight
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
        Hexagon.Sides.TopLeft
    ];
}

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
        hexagon = this;

    this.cornerPoints().slice(0, 2).some(function findTwoOpposingCorners(cornerPoint) {
        var oppositeCorner = ( !! cornerPoint) && Hexagon.Corners.opposite(cornerPoint.corner),
            oppositeCornerPoint = ( !! oppositeCorner) && hexagon.getCornerPoint(oppositeCorner);

        line = oppositeCornerPoint && new Line(cornerPoint.point, oppositeCornerPoint.point);

        if (line) {
            return true;
        }

        return false;
    });

    return line || null;
}

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
        return prev + (( !! cornerPoint) ? 1 : 0);
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
        result = end + "-" + start
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
        }

    return wrapper;
}

module.exports = oneAtATimePlease;
},{}],22:[function(require,module,exports){
function wrap(name, fn) {
    var wrapped = function() {
        var result;

        console && console.timeline && console.timeline(name);
        console && console.profile && console.profile(name);

        result = fn.call(null);

        console && console.timelineEnd && console.timelineEnd();
        console && console.profileEnd && console.profileEnd();

        return result;
    }

    return wrapped;
}

var api = {
    wrap: wrap
}

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
    integer: integer
}

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvZmFrZV85ZjlmNTM1LmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9sb2dpYy9hY3Rpdml0eS1tb25pdG9yLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9sb2dpYy9ldmVudHMuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL2xvZ2ljL2dyYXBoLW9iamVjdHMtdG9vbC5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvbG9naWMvZ3JhcGhlci5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvbG9naWMvaGlnaGxpZ2h0LW9uLWludGVydmFsLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9sb2dpYy9yZW5kZXJlci5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvb2JqZWN0cy9hcmVhLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9vYmplY3RzL2Nvcm5lci5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvb2JqZWN0cy9jb3JuZXJwb2ludC5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvb2JqZWN0cy9nb25pZi5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvb2JqZWN0cy9oZXhhZ29uLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy9vYmplY3RzL2xpbmUuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL29iamVjdHMvcG9pbnQuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL29iamVjdHMvc2lkZS5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvb2JqZWN0cy9zaWRlbGluZS5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvdXRpbHMvZGVsYXkuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL3V0aWxzL2xpbWl0LXByZWNpc2lvbi5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvdXRpbHMvbW91c2UtZGV0ZWN0b3IuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL3V0aWxzL29uY2UuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL3V0aWxzL29uZS1hdC1hLXRpbWUtcGxlYXNlLmpzIiwiL1VzZXJzL2pvZWxwdXJyYS9kZXYvb3duL2dyYXBoaWNzL2hleGFnb25pZi9zcmMvcmVzb3VyY2VzL2phdmFzY3JpcHQvbW9kdWxlcy91dGlscy9wcm9maWxpbmcuanMiLCIvVXNlcnMvam9lbHB1cnJhL2Rldi9vd24vZ3JhcGhpY3MvaGV4YWdvbmlmL3NyYy9yZXNvdXJjZXMvamF2YXNjcmlwdC9tb2R1bGVzL3V0aWxzL3JhbmRvbS5qcyIsIi9Vc2Vycy9qb2VscHVycmEvZGV2L293bi9ncmFwaGljcy9oZXhhZ29uaWYvc3JjL3Jlc291cmNlcy9qYXZhc2NyaXB0L21vZHVsZXMvdXRpbHMvcmVzaXplLWRldGVjdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIG1haW4oKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgUG9pbnQgPSByZXF1aXJlKFwiLi9tb2R1bGVzL29iamVjdHMvcG9pbnQuanNcIiksXG4gICAgICAgIExpbmUgPSByZXF1aXJlKFwiLi9tb2R1bGVzL29iamVjdHMvbGluZS5qc1wiKSxcbiAgICAgICAgZ3JhcGhlciA9IHJlcXVpcmUoXCIuL21vZHVsZXMvbG9naWMvZ3JhcGhlci5qc1wiKSxcbiAgICAgICAgcmVuZGVyZXIgPSByZXF1aXJlKFwiLi9tb2R1bGVzL2xvZ2ljL3JlbmRlcmVyLmpzXCIpLFxuICAgICAgICBwcm9maWxpbmcgPSByZXF1aXJlKFwiLi9tb2R1bGVzL3V0aWxzL3Byb2ZpbGluZy5qc1wiKSxcbiAgICAgICAgcmFuZG9tID0gcmVxdWlyZShcIi4vbW9kdWxlcy91dGlscy9yYW5kb20uanNcIiksXG4gICAgICAgIHJlc2l6ZURldGVjdG9yID0gcmVxdWlyZShcIi4vbW9kdWxlcy91dGlscy9yZXNpemUtZGV0ZWN0b3IuanNcIiksXG4gICAgICAgIG1vdXNlRGV0ZWN0b3IgPSByZXF1aXJlKFwiLi9tb2R1bGVzL3V0aWxzL21vdXNlLWRldGVjdG9yLmpzXCIpLFxuICAgICAgICBvbmNlID0gcmVxdWlyZShcIi4vbW9kdWxlcy91dGlscy9vbmNlLmpzXCIpLFxuICAgICAgICBvbmVBdEFUaW1lUGxlYXNlID0gcmVxdWlyZShcIi4vbW9kdWxlcy91dGlscy9vbmUtYXQtYS10aW1lLXBsZWFzZS5qc1wiKSxcbiAgICAgICAgZGVsYXkgPSByZXF1aXJlKFwiLi9tb2R1bGVzL3V0aWxzL2RlbGF5LmpzXCIpLFxuICAgICAgICBIZXhFdmVudCA9IHJlcXVpcmUoXCIuL21vZHVsZXMvbG9naWMvZXZlbnRzLmpzXCIpLFxuICAgICAgICBBY3Rpdml0eU1vbml0b3IgPSByZXF1aXJlKFwiLi9tb2R1bGVzL2xvZ2ljL2FjdGl2aXR5LW1vbml0b3IuanNcIiksXG4gICAgICAgIEdyYXBoT2JqZWN0c1Rvb2wgPSByZXF1aXJlKFwiLi9tb2R1bGVzL2xvZ2ljL2dyYXBoLW9iamVjdHMtdG9vbC5qc1wiKSxcbiAgICAgICAgSGlnaGxpZ2h0T25JbnRlcnZhbCA9IHJlcXVpcmUoXCIuL21vZHVsZXMvbG9naWMvaGlnaGxpZ2h0LW9uLWludGVydmFsLmpzXCIpLFxuICAgICAgICBkZWJvdW5jZSA9ICh3aW5kb3cuQ293Ym95IHx8ICQpLmRlYm91bmNlO1xuXG4gICAgdmFyIGNhbnZhc0lkID0gXCJoZXhhZ29uaWZcIixcbiAgICAgICAgY2FudmFzQ29udGFpbmVySWQgPSBcImhleGFnb25pZi1jb250YWluZXJcIjtcblxuICAgIGZ1bmN0aW9uIGdldENhbnZhcygpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNhbnZhc0lkKTtcblxuICAgICAgICByZXR1cm4gY2FudmFzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZUNhbnZhcygpIHtcbiAgICAgICAgdmFyIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNhbnZhc0NvbnRhaW5lcklkKSxcbiAgICAgICAgICAgIGNhbnZhcyxcbiAgICAgICAgICAgIGk7XG5cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvbnRhaW5lci5jaGlsZEVsZW1lbnRDb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBjb250YWluZXIucmVtb3ZlQ2hpbGQoY29udGFpbmVyLmNoaWxkcmVuW2ldKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xuICAgICAgICBjYW52YXMuaWQgPSBjYW52YXNJZDtcbiAgICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShjYW52YXMsIGNvbnRhaW5lci5jaGlsZHJlblswXSk7XG5cbiAgICAgICAgcmV0dXJuIGNhbnZhcztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYWxjdWxhdGVIZXhhZ29uU2lkZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gVE9ETyBERUJVRyBSRU1PVkVcbiAgICAgICAgcmV0dXJuIDEwMDtcblxuICAgICAgICB2YXIgY2FudmFzID0gZ2V0Q2FudmFzKCksXG4gICAgICAgICAgICBhYnNvbHV0ZU1pbiA9IDc1LFxuICAgICAgICAgICAgYWJzb2x1dGVNYXggPSAxNTAsXG4gICAgICAgICAgICBzaG9ydGVzdENhbnZhc1NpZGUgPSBNYXRoLm1pbihjYW52YXMuc2Nyb2xsV2lkdGgsIGNhbnZhcy5zY3JvbGxIZWlnaHQpLFxuICAgICAgICAgICAgbWluID0gTWF0aC5tYXgoYWJzb2x1dGVNaW4sIHNob3J0ZXN0Q2FudmFzU2lkZSAvIDIwKSxcbiAgICAgICAgICAgIG1heCA9IE1hdGgubWluKGFic29sdXRlTWF4LCBzaG9ydGVzdENhbnZhc1NpZGUgLyAxMCk7XG5cbiAgICAgICAgcmV0dXJuIHJhbmRvbS5pbnRlZ2VyKG1pbiwgbWF4KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZW5lcmF0ZUFuZFJlbmRlcigpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IGNyZWF0ZUNhbnZhcygpLFxuICAgICAgICAgICAgY2FudmFzQXJlYSA9IG5ldyBQb2ludChjYW52YXMuc2Nyb2xsV2lkdGgsIGNhbnZhcy5zY3JvbGxIZWlnaHQpLFxuICAgICAgICAgICAgaGV4YWdvblNpZGVMZW5ndGggPSBjYWxjdWxhdGVIZXhhZ29uU2lkZUxlbmd0aCgpLFxuICAgICAgICAgICAgcHJvZmlsZWRHcmFwaGVyID0gcHJvZmlsaW5nLndyYXAoXCJncmFwaGVyXCIsIGZ1bmN0aW9uIHByb2ZpbGVkR3JhcGhlcldyYXBwZXIoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdyYXBoZXIoY2FudmFzQXJlYSwgaGV4YWdvblNpZGVMZW5ndGgpO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBncmFwaE9iamVjdHMgPSBwcm9maWxlZEdyYXBoZXIoKSxcbiAgICAgICAgICAgIGdyYXBoT2JqZWN0c1Rvb2wgPSBuZXcgR3JhcGhPYmplY3RzVG9vbChncmFwaE9iamVjdHMpLFxuICAgICAgICAgICAgcHJvZmlsZWRSZW5kZXJlciA9IHByb2ZpbGluZy53cmFwKFwicmVuZGVyZXJcIiwgZnVuY3Rpb24gcHJvZmlsZWRSZW5kZXJlcldyYXBwZXIoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlbmRlcmVyKGNhbnZhc0lkLCBjYW52YXNBcmVhLCBncmFwaE9iamVjdHMpO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBoZXhFdmVudCA9IG5ldyBIZXhFdmVudChjYW52YXMpLFxuICAgICAgICAgICAgYWN0aXZpdHlNb25pdG9yID0gbmV3IEFjdGl2aXR5TW9uaXRvcihoZXhFdmVudCksXG4gICAgICAgICAgICBhZGRHb25pZk5laWdoYm9yRGVidWdMaW5lcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGdyYXBoT2JqZWN0cy5nb25pZnMpLmZvckVhY2goZnVuY3Rpb24oZ29uaWZLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdvbmlmID0gZ3JhcGhPYmplY3RzLmdvbmlmc1tnb25pZktleV0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmcm9tQ2VudGVyID0gZ29uaWYuaGV4YWdvbi5nZXRDZW50ZXIoKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoIWZyb21DZW50ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGdvbmlmLmdldE5laWdoYm9ycygpLmZvckVhY2goZnVuY3Rpb24obmVpZ2hib3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZWlnaGJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b0xpbmUgPSBuZWlnaGJvci5oZXhhZ29uLmdldExpbmVUaHJvdWdoTWlkZGxlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvQ2VudGVyID0gdG9MaW5lICYmIHRvTGluZS5jZW50ZXIoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdG9DZW50ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsaW5lID0gbmV3IExpbmUoZnJvbUNlbnRlciwgdG9DZW50ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3JhcGhPYmplY3RzLmxpbmVzW2xpbmUuY2FjaGVLZXldID0gbGluZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0dXBBY3Rpdml0eU1vbml0b3IgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBzdGFydEFjdGl2aXRpZXMoKSB7XG4gICAgICAgICAgICAgICAgICAgIGhpZ2hsaWdodE9uSW50ZXJ2YWwuaXNTdGFydGVkKCkgfHwgaGlnaGxpZ2h0T25JbnRlcnZhbC5zdGFydCgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHN0b3BBY3Rpdml0aWVzKCkge1xuICAgICAgICAgICAgICAgICAgICBoaWdobGlnaHRPbkludGVydmFsLmlzU3RhcnRlZCgpICYmIGhpZ2hsaWdodE9uSW50ZXJ2YWwuc3RvcCgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGhleEV2ZW50Lmxpc3RlbihcInVzZXIuYWN0aXZpdHlcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE8gREVCVUcgUkVNT1ZFXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVXNlciBhY3Rpdml0eSFcIik7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0QWN0aXZpdGllcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGhleEV2ZW50Lmxpc3RlbihcInVzZXIuaW5hY3Rpdml0eVwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyBERUJVRyBSRU1PVkVcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJVc2VyIGluYWN0aXZpdHkhXCIpO1xuICAgICAgICAgICAgICAgICAgICBzdG9wQWN0aXZpdGllcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYWN0aXZpdHlNb25pdG9yLnN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgc3RhcnRBY3Rpdml0aWVzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2NlbmUsXG4gICAgICAgICAgICBoaWdobGlnaHRPbkludGVydmFsO1xuXG4gICAgICAgIC8vIGFkZEdvbmlmTmVpZ2hib3JEZWJ1Z0xpbmVzKCk7XG5cbiAgICAgICAgc2NlbmUgPSBwcm9maWxlZFJlbmRlcmVyKCk7XG4gICAgICAgIGhpZ2hsaWdodE9uSW50ZXJ2YWwgPSBuZXcgSGlnaGxpZ2h0T25JbnRlcnZhbChzY2VuZSwgZ3JhcGhPYmplY3RzVG9vbCwgaGV4RXZlbnQpO1xuICAgICAgICBzZXR1cEFjdGl2aXR5TW9uaXRvcigpO1xuICAgIH1cblxuICAgIHZhciBydW4gPSBvbmVBdEFUaW1lUGxlYXNlKGdlbmVyYXRlQW5kUmVuZGVyKTtcblxuICAgIG1vdXNlRGV0ZWN0b3Iob25jZShydW4pKTtcbiAgICByZXNpemVEZXRlY3RvcihnZXRDYW52YXMoKSwgZGVib3VuY2UoMTAwMCwgZGVsYXkocnVuLCAxMDApKSk7XG59KCkpOyIsInZhciBIZXhFdmVudCA9IHJlcXVpcmUoXCIuL2V2ZW50cy5qc1wiKSxcbiAgICBhY3Rpdml0eUV2ZW50TmFtZSA9IFwidXNlci5hY3Rpdml0eVwiLFxuICAgIGluYWN0aXZpdHlFdmVudE5hbWUgPSBcInVzZXIuaW5hY3Rpdml0eVwiO1xuXG5mdW5jdGlvbiBBY3Rpdml0eU1vbml0b3IoaGV4RXZlbnQsIGxpbWl0KSB7XG4gICAgdGhpcy5oZXhFdmVudCA9IGhleEV2ZW50O1xuICAgIHRoaXMubGltaXRNaWxsaXNlY29uZHMgPSBsaW1pdCB8fCA2MCAqIDEwMDA7XG5cblx0dGhpcy5jaGVja2luZ0ludGVydmFsTWlsbGlzZWNvbmRzID0gTWF0aC5mbG9vcih0aGlzLmxpbWl0TWlsbGlzZWNvbmRzIC8gMik7XG4gICAgdGhpcy5sYXRlc3RBY3Rpdml0eVRpbWVzdGFtcCA9IG51bGw7XG4gICAgdGhpcy5hY3Rpdml0eUludGVydmFsID0gbnVsbDtcbiAgICB0aGlzLmlzTW9uaXRvclN0YXJ0ZWQgPSBmYWxzZTtcbiAgICB0aGlzLmlzVXNlcklzQWN0aXZlID0gZmFsc2U7XG59XG5cbkFjdGl2aXR5TW9uaXRvci5wcm90b3R5cGUuZ2V0VGltZXN0YW1wID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKCkudmFsdWVPZigpO1xufTtcblxuQWN0aXZpdHlNb25pdG9yLnByb3RvdHlwZS5yZXNldEFjdGl2aXR5SW50ZXJ2YWwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmxhdGVzdEFjdGl2aXR5VGltZXN0YW1wID0gdGhpcy5nZXRUaW1lc3RhbXAoKTtcbn07XG5cbkFjdGl2aXR5TW9uaXRvci5wcm90b3R5cGUuc3RhcnRBY3Rpdml0eUludGVydmFsID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5hY3Rpdml0eUludGVydmFsID0gc2V0SW50ZXJ2YWwodGhpcy5jaGVja0FjdGl2aXR5SW50ZXJ2YWwuYmluZCh0aGlzKSwgdGhpcy5jaGVja2luZ0ludGVydmFsTWlsbGlzZWNvbmRzKTtcbn07XG5cbkFjdGl2aXR5TW9uaXRvci5wcm90b3R5cGUuc3RvcEFjdGl2aXR5SW50ZXJ2YWwgPSBmdW5jdGlvbigpIHtcbiAgICBjbGVhckludGVydmFsKHRoaXMuYWN0aXZpdHlJbnRlcnZhbCk7XG5cbiAgICB0aGlzLmFjdGl2aXR5SW50ZXJ2YWwgPSBudWxsO1xufTtcblxuQWN0aXZpdHlNb25pdG9yLnByb3RvdHlwZS5jaGVja0FjdGl2aXR5SW50ZXJ2YWwgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoTWF0aC5hYnModGhpcy5nZXRUaW1lc3RhbXAoKSAtIHRoaXMubGF0ZXN0QWN0aXZpdHlUaW1lc3RhbXApID4gdGhpcy5saW1pdE1pbGxpc2Vjb25kcykge1xuICAgICAgICB0aGlzLmluYWN0aXZpdHlEZXRlY3RlZCgpO1xuICAgIH1cbn07XG5cbkFjdGl2aXR5TW9uaXRvci5wcm90b3R5cGUuYWN0aXZpdHlEZXRlY3RlZCA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLmlzVXNlcklzQWN0aXZlID0gdHJ1ZTtcbiAgICB0aGlzLnJlc2V0QWN0aXZpdHlJbnRlcnZhbCgpO1xuXG4gICAgaWYgKHRoaXMuYWN0aXZpdHlJbnRlcnZhbCA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLnN0YXJ0QWN0aXZpdHlJbnRlcnZhbCgpO1xuICAgIH1cblxuICAgIHRoaXMuaGV4RXZlbnQuZmlyZShhY3Rpdml0eUV2ZW50TmFtZSk7XG59O1xuXG5BY3Rpdml0eU1vbml0b3IucHJvdG90eXBlLmluYWN0aXZpdHlEZXRlY3RlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RvcEFjdGl2aXR5SW50ZXJ2YWwoKTtcbiAgICB0aGlzLmlzVXNlcklzQWN0aXZlID0gZmFsc2U7XG5cbiAgICB0aGlzLmhleEV2ZW50LmZpcmUoaW5hY3Rpdml0eUV2ZW50TmFtZSk7XG59O1xuXG5BY3Rpdml0eU1vbml0b3IucHJvdG90eXBlLmlzU3RhcnRlZCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmlzTW9uaXRvclN0YXJ0ZWQgPT09IHRydWU7XG59O1xuXG5BY3Rpdml0eU1vbml0b3IucHJvdG90eXBlLmlzVXNlcklzQWN0aXZlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNVc2VySXNBY3RpdmUgPT09IHRydWU7XG59O1xuXG5BY3Rpdml0eU1vbml0b3IucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuaXNTdGFydGVkKCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiV2FzIGFscmVhZHkgc3RhcnRlZC5cIik7XG4gICAgfVxuXG4gICAgdGhpcy5yZXNldEFjdGl2aXR5SW50ZXJ2YWwoKTtcbiAgICB0aGlzLnN0YXJ0QWN0aXZpdHlJbnRlcnZhbCgpO1xuXG4gICAgLy8gVE9ETzogdXNlIGhleGFnb25pZiB0cmlnZ2VyZWQgZXZlbnRzP1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgdGhpcy5hY3Rpdml0eURldGVjdGVkLmJpbmQodGhpcykpO1xufTtcblxuQWN0aXZpdHlNb25pdG9yLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuaXNTdGFydGVkKCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiV2FzIG5vdCBzdGFydGVkLlwiKTtcbiAgICB9XG5cbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHRoaXMuYWN0aXZpdHlEZXRlY3RlZC5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuc3RvcEFjdGl2aXR5SW50ZXJ2YWwoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQWN0aXZpdHlNb25pdG9yOyIsImZ1bmN0aW9uIEhleEV2ZW50cyhjYW52YXNFbGVtZW50LCBuYW1lc3BhY2VQcmVmaXgpIHtcbiAgICB0aGlzLmNhbnZhc0VsZW1lbnQgPSBjYW52YXNFbGVtZW50O1xuICAgIHRoaXMubmFtZXNwYWNlUHJlZml4ID0gbmFtZXNwYWNlUHJlZml4IHx8ICdoZXhhZ29uaWYuJztcbn1cblxuSGV4RXZlbnRzLnByb3RvdHlwZS5nZXRFdmVudE5hbWUgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMubmFtZXNwYWNlUHJlZml4ICsgbmFtZTtcbn1cblxuSGV4RXZlbnRzLnByb3RvdHlwZS5maXJlID0gZnVuY3Rpb24obmFtZSwgZ3JhcGhpYywgb2JqZWN0KSB7XG4gICAgdmFyIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0hUTUxFdmVudHMnKSxcbiAgICAgICAgbmFtZXNwYWNlZE5hbWUgPSB0aGlzLmdldEV2ZW50TmFtZShuYW1lKTtcblxuICAgIGV2ZW50LmluaXRFdmVudChuYW1lc3BhY2VkTmFtZSwgdHJ1ZSwgdHJ1ZSk7XG4gICAgZXZlbnQuZ3JhcGhpYyA9IGdyYXBoaWM7XG4gICAgZXZlbnQub2JqZWN0ID0gb2JqZWN0O1xuICAgIHJldHVybiB0aGlzLmNhbnZhc0VsZW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCk7XG59XG5cbkhleEV2ZW50cy5wcm90b3R5cGUubGlzdGVuID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgICB2YXIgbmFtZXNwYWNlZE5hbWUgPSB0aGlzLmdldEV2ZW50TmFtZShuYW1lKTtcblxuICAgIHRoaXMuY2FudmFzRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKG5hbWVzcGFjZWROYW1lLCBmbik7XG59XG5cbkhleEV2ZW50cy5wcm90b3R5cGUuY2FuY2VsID0gZnVuY3Rpb24obmFtZSwgZm4pIHtcbiAgICB2YXIgbmFtZXNwYWNlZE5hbWUgPSB0aGlzLmdldEV2ZW50TmFtZShuYW1lKTtcblxuICAgIHRoaXMuY2FudmFzRWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKG5hbWVzcGFjZWROYW1lLCBmbik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGV4RXZlbnRzOyIsInZhciByYW5kb20gPSByZXF1aXJlKFwiLi4vdXRpbHMvcmFuZG9tLmpzXCIpO1xuXG5mdW5jdGlvbiBHcmFwaE9iamVjdHNUb29sKGdyYXBoT2JqZWN0cykge1xuICAgIHRoaXMuZ3JhcGhPYmplY3RzID0gZ3JhcGhPYmplY3RzO1xufVxuXG5HcmFwaE9iamVjdHNUb29sLnByb3RvdHlwZS5nZXRSYW5kb21PYmplY3QgPSBmdW5jdGlvbihvYmplY3RzKSB7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmplY3RzKSxcbiAgICAgICAgY291bnQgPSBrZXlzLmxlbmd0aCxcbiAgICAgICAgcm5kID0gcmFuZG9tLmludGVnZXIoMCwgY291bnQpLFxuICAgICAgICBrZXkgPSBrZXlzW3JuZF0sXG4gICAgICAgIG9iamVjdCA9IG9iamVjdHNba2V5XTtcblxuICAgIHJldHVybiBvYmplY3Q7XG59O1xuXG5HcmFwaE9iamVjdHNUb29sLnByb3RvdHlwZS5nZXRSYW5kb21IZXhhZ29uID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGhleGFnb24gPSB0aGlzLmdldFJhbmRvbU9iamVjdCh0aGlzLmdyYXBoT2JqZWN0cy5oZXhhZ29ucyk7XG5cbiAgICByZXR1cm4gaGV4YWdvbjtcbn1cblxuR3JhcGhPYmplY3RzVG9vbC5wcm90b3R5cGUuZ2V0UmFuZG9tTGluZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsaW5lID0gdGhpcy5nZXRSYW5kb21PYmplY3QodGhpcy5ncmFwaE9iamVjdHMubGluZXMpO1xuXG4gICAgcmV0dXJuIGxpbmU7XG59O1xuXG5HcmFwaE9iamVjdHNUb29sLnByb3RvdHlwZS5nZXRSYW5kb21Ob2RlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLmdldFJhbmRvbU9iamVjdCh0aGlzLmdyYXBoT2JqZWN0cy5ub2Rlcyk7XG5cbiAgICByZXR1cm4gbm9kZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR3JhcGhPYmplY3RzVG9vbDsiLCJ2YXIgUG9pbnQgPSByZXF1aXJlKFwiLi4vb2JqZWN0cy9wb2ludC5qc1wiKSxcbiAgICBMaW5lID0gcmVxdWlyZShcIi4uL29iamVjdHMvbGluZS5qc1wiKSxcbiAgICBIZXhhZ29uID0gcmVxdWlyZShcIi4uL29iamVjdHMvaGV4YWdvbi5qc1wiKSxcbiAgICBHb25pZiA9IHJlcXVpcmUoXCIuLi9vYmplY3RzL2dvbmlmLmpzXCIpLFxuICAgIEFyZWEgPSByZXF1aXJlKFwiLi4vb2JqZWN0cy9hcmVhLmpzXCIpLFxuICAgIGxpbWl0UHJlY2lzaW9uID0gcmVxdWlyZShcIi4uL3V0aWxzL2xpbWl0LXByZWNpc2lvbi5qc1wiKSxcbiAgICByYW5kb20gPSByZXF1aXJlKFwiLi4vdXRpbHMvcmFuZG9tLmpzXCIpO1xuXG5mdW5jdGlvbiBnZXRPckdlbmVyYXRlSGV4YWdvbihjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgsIHN0YXJ0UG9pbnQsIHN0YXJ0Q29ybmVyKSB7XG4gICAgdmFyIGhleGFnb24gPSBuZXcgSGV4YWdvbigpO1xuXG4gICAgdmFyIHBvaW50ID0gc3RhcnRQb2ludCxcbiAgICAgICAgY29ybmVyID0gc3RhcnRDb3JuZXI7XG5cbiAgICBkbyB7XG4gICAgICAgIC8vIFBvaW50cyBhbmQgY29ybmVyc1xuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgcG9pbnRDYWNoZUtleSA9IHBvaW50LmNhY2hlS2V5LFxuICAgICAgICAgICAgICAgIGNhY2hlZFBvaW50ID0gY2FjaGUubm9kZXNbcG9pbnRDYWNoZUtleV07XG5cbiAgICAgICAgICAgIGlmIChjYWNoZWRQb2ludCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY2FjaGUubm9kZXNbcG9pbnRDYWNoZUtleV0gPSBwb2ludDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcG9pbnQgPSBjYWNoZWRQb2ludDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaGV4YWdvbi5zZXRDb3JuZXJQb2ludChjb3JuZXIsIHBvaW50KTtcblxuICAgICAgICAgICAgdmFyIG5leHRDb3JuZXIgPSBIZXhhZ29uLkNvcm5lcnMubmV4dChjb3JuZXIpO1xuICAgICAgICAgICAgdmFyIHggPSBsaW1pdFByZWNpc2lvbihwb2ludC54IC0gKGhleGFnb25TaWRlTGVuZ3RoICogTWF0aC5jb3MoY29ybmVyLnJhZCkpLCA1KSxcbiAgICAgICAgICAgICAgICB5ID0gbGltaXRQcmVjaXNpb24ocG9pbnQueSArIChoZXhhZ29uU2lkZUxlbmd0aCAqIE1hdGguc2luKGNvcm5lci5yYWQpKSwgNSk7XG4gICAgICAgICAgICB2YXIgbmV4dFBvaW50ID0gbmV3IFBvaW50KHgsIHkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTGluZXMgYW5kIHNpZGVzXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBsaW5lID0gbmV3IExpbmUocG9pbnQsIG5leHRQb2ludCk7XG5cbiAgICAgICAgICAgIHZhciBsaW5lQ2FjaGVLZXkgPSBsaW5lLmNhY2hlS2V5LFxuICAgICAgICAgICAgICAgIGNhY2hlZExpbmUgPSBjYWNoZS5saW5lc1tsaW5lQ2FjaGVLZXldO1xuXG4gICAgICAgICAgICBpZiAoY2FjaGVkTGluZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY2FjaGUubGluZXNbbGluZUNhY2hlS2V5XSA9IGxpbmU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKFwiTGluZSBhbHJlYWR5IGV4aXN0cyBcIiArIGxpbmUuY2FjaGVLZXkpXG4gICAgICAgICAgICAgICAgbGluZSA9IGNhY2hlZExpbmU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBzaWRlID0gSGV4YWdvbi5TaWRlcy5mcm9tQ29ybmVyKGNvcm5lcik7XG5cbiAgICAgICAgICAgIGhleGFnb24uc2V0U2lkZUxpbmUoc2lkZSwgbGluZSk7XG4gICAgICAgIH1cblxuICAgICAgICBwb2ludCA9IG5leHRQb2ludDtcbiAgICAgICAgY29ybmVyID0gbmV4dENvcm5lcjtcblxuICAgICAgICAvLyBUT0RPOiBmaXggZXF1YWxpdHkgY2hlY2tcbiAgICB9IHdoaWxlIChjb3JuZXIucm90YXRpb24gIT09IHN0YXJ0Q29ybmVyLnJvdGF0aW9uKVxuXG4gICAgLy8gSGV4YWdvblxuICAgIHtcbiAgICAgICAgLy8gVE9ETzogYmFzZSBjYWNoZSBrZXkgb24gbG9jYXRpb24gaW5kZXgsIHNvIHRoaXMgY2hlY2sgY2FuIGJlIGRvbmUgbXVjaCBlYXJsaWVyLlxuICAgICAgICAvLyBUT0RPOiBnZW5lcmF0ZSBoZXhhZ29ucyB3aXRoIG5laWdodGJvcnMgaW5zdGVhZCBvZiBwb2ludHMsIHNvIHRoZSBjaGVjayBpcyBlYXNpZXIuXG4gICAgICAgIHZhciBoZXhhZ29uQ2FjaGVLZXkgPSBoZXhhZ29uLmdldENhY2hlS2V5KCksXG4gICAgICAgICAgICBjYWNoZWRIZXhhZ29uID0gY2FjaGUuaGV4YWdvbnNbaGV4YWdvbkNhY2hlS2V5XTtcblxuICAgICAgICBpZiAoY2FjaGVkSGV4YWdvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoY2FjaGVkSGV4YWdvbi5pc0NvbXBsZXRlKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FjaGVkSGV4YWdvbjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaGV4YWdvbiA9IGNhY2hlZEhleGFnb247XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZS5oZXhhZ29uc1toZXhhZ29uQ2FjaGVLZXldID0gaGV4YWdvbjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBoZXhhZ29uO1xufVxuXG5mdW5jdGlvbiBnb25pZkV4aXN0cyhjYWNoZSwgZ29uaWYpIHtcbiAgICByZXR1cm4gISFjYWNoZS5nb25pZnNbZ29uaWYuY2FjaGVLZXldO1xufVxuXG5mdW5jdGlvbiBnZXRPckdlbmVyYXRlR29uaWYoY2FjaGUsIGhleGFnb25TaWRlTGVuZ3RoLCBzdGFydFBvaW50LCBzdGFydFNpZGUpIHtcbiAgICB2YXIgc3RhcnRDb3JuZXIgPSBzdGFydFNpZGUuc3RhcnQsXG4gICAgICAgIGhleGFnb24gPSBnZXRPckdlbmVyYXRlSGV4YWdvbihjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgsIHN0YXJ0UG9pbnQsIHN0YXJ0Q29ybmVyKSxcbiAgICAgICAgZ29uaWYgPSBuZXcgR29uaWYoaGV4YWdvbik7XG5cbiAgICBpZiAoZ29uaWZFeGlzdHMoY2FjaGUsIGdvbmlmKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHb25pZiBnZW5lcmF0aW9uIGNvbGxpc2lvbi5cIik7XG4gICAgfVxuXG4gICAgY2FjaGUuZ29uaWZzW2dvbmlmLmNhY2hlS2V5XSA9IGdvbmlmO1xuXG4gICAgcmV0dXJuIGdvbmlmO1xufVxuXG5mdW5jdGlvbiBhZGROZWlnaGJvcnMoZ29uaWYpIHtcbiAgICB2YXIgc2lkZXNUb0NoZWNrID0gSGV4YWdvbi5TaWRlcy5hbGwoKTtcblxuICAgIHdoaWxlIChzaWRlID0gc2lkZXNUb0NoZWNrLnNoaWZ0KCkpIHtcbiAgICAgICAgdmFyIG5laWdoYm9yID0gZ29uaWYuZ2V0TmVpZ2hib3Ioc2lkZSk7XG5cbiAgICAgICAgaWYgKCEhbmVpZ2hib3IpIHtcbiAgICAgICAgICAgIHZhciBzaGFyZWROZWlnaGJvckRpcmVjdGlvbnMgPSBHb25pZi5OZWlnaGJvcnMuZ2V0U2hhcmVkTmVpZ2hib3JEaXJlY3Rpb25zKHNpZGUpO1xuXG4gICAgICAgICAgICBzaGFyZWROZWlnaGJvckRpcmVjdGlvbnMuZm9yRWFjaChmdW5jdGlvbihzaGFyZWROZWlnaGJvckRpcmVjdGlvbikge1xuICAgICAgICAgICAgICAgIHZhciBzaGFyZWROZWlnaGJvciA9IG5laWdoYm9yLmdldE5laWdoYm9yKHNoYXJlZE5laWdoYm9yRGlyZWN0aW9uLmZyb21OZWlnaGJvcik7XG5cbiAgICAgICAgICAgICAgICBpZiAoKCEhc2hhcmVkTmVpZ2hib3IpICYmIGdvbmlmLmdldE5laWdoYm9yKHNoYXJlZE5laWdoYm9yRGlyZWN0aW9uLmZyb21IZXJlKSAhPT0gc2hhcmVkTmVpZ2hib3IpIHtcbiAgICAgICAgICAgICAgICAgICAgZ29uaWYuc2V0TmVpZ2hib3Ioc2hhcmVkTmVpZ2hib3JEaXJlY3Rpb24uZnJvbUhlcmUsIHNoYXJlZE5laWdoYm9yKTtcbiAgICAgICAgICAgICAgICAgICAgc2hhcmVkTmVpZ2hib3Iuc2V0TmVpZ2hib3IoSGV4YWdvbi5TaWRlcy5vcHBvc2l0ZShzaGFyZWROZWlnaGJvckRpcmVjdGlvbi5mcm9tSGVyZSksIGdvbmlmKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJbiBjYXNlIHRoaXMgb25lIGhhcyBuZWlnaGJvcnMgc3RpbGwgdW5rbm93biwgYnV0IGFscmVhZHkgY2hlY2tlZCBpbiB0aGUgaW5pdGFsIHBhc3MuXG4gICAgICAgICAgICAgICAgICAgIHNpZGVzVG9DaGVjay5wdXNoKHNoYXJlZE5laWdoYm9yRGlyZWN0aW9uLmZyb21IZXJlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVHb25pZkluRGlyZWN0aW9uKGFyZWEsIGNhY2hlLCBoZXhhZ29uU2lkZUxlbmd0aCwgZ29uaWYsIGdvaW5nVG93YXJkc0RpcmVjdGlvbnMpIHtcbiAgICAvLyBFbnN1cmUgYXJyYXlcbiAgICBnb2luZ1Rvd2FyZHNEaXJlY3Rpb25zID0gW10uY29uY2F0KGdvaW5nVG93YXJkc0RpcmVjdGlvbnMpO1xuXG4gICAgdmFyIGNvbWluZ0Zyb21EaXJlY3Rpb24sXG4gICAgICAgIGdvaW5nVG93YXJkc0RpcmVjdGlvbkluZGV4ID0gMCxcbiAgICAgICAgZ29pbmdUb3dhcmRzRGlyZWN0aW9uID0gZ29pbmdUb3dhcmRzRGlyZWN0aW9uc1tnb2luZ1Rvd2FyZHNEaXJlY3Rpb25JbmRleF0sXG4gICAgICAgIHN0YXJ0UG9pbnQgPSBnb25pZi5oZXhhZ29uLmdldENvcm5lclBvaW50KGdvaW5nVG93YXJkc0RpcmVjdGlvbi5lbmQpLnBvaW50LFxuICAgICAgICBuZWlnaGJvcjtcblxuICAgIGRvIHtcbiAgICAgICAgY29taW5nRnJvbURpcmVjdGlvbiA9IEhleGFnb24uU2lkZXMub3Bwb3NpdGUoZ29pbmdUb3dhcmRzRGlyZWN0aW9uKTtcbiAgICAgICAgc3RhcnRQb2ludCA9IGdvbmlmLmhleGFnb24uZ2V0Q29ybmVyUG9pbnQoZ29pbmdUb3dhcmRzRGlyZWN0aW9uLmVuZCkucG9pbnQ7XG4gICAgICAgIG5laWdoYm9yID0gZ2V0T3JHZW5lcmF0ZUdvbmlmKGNhY2hlLCBoZXhhZ29uU2lkZUxlbmd0aCwgc3RhcnRQb2ludCwgY29taW5nRnJvbURpcmVjdGlvbik7XG5cbiAgICAgICAgZ29uaWYuc2V0TmVpZ2hib3IoZ29pbmdUb3dhcmRzRGlyZWN0aW9uLCBuZWlnaGJvcik7XG4gICAgICAgIG5laWdoYm9yLnNldE5laWdoYm9yKGNvbWluZ0Zyb21EaXJlY3Rpb24sIGdvbmlmKTtcbiAgICAgICAgYWRkTmVpZ2hib3JzKG5laWdoYm9yKTtcblxuICAgICAgICBnb2luZ1Rvd2FyZHNEaXJlY3Rpb25JbmRleCA9IChnb2luZ1Rvd2FyZHNEaXJlY3Rpb25JbmRleCArIDEpICUgZ29pbmdUb3dhcmRzRGlyZWN0aW9ucy5sZW5ndGg7XG4gICAgICAgIGdvaW5nVG93YXJkc0RpcmVjdGlvbiA9IGdvaW5nVG93YXJkc0RpcmVjdGlvbnNbZ29pbmdUb3dhcmRzRGlyZWN0aW9uSW5kZXhdO1xuICAgICAgICBnb25pZiA9IG5laWdoYm9yO1xuICAgIH0gd2hpbGUgKGFyZWEuaXNJbnNpZGUoc3RhcnRQb2ludCkpXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlR3JhcGgoYXJlYSwgY2FjaGUsIGhleGFnb25TaWRlTGVuZ3RoKSB7XG4gICAgdmFyIGFyZWFXaXRoUGFkZGluZyA9IG5ldyBBcmVhKG5ldyBQb2ludCgwIC0gaGV4YWdvblNpZGVMZW5ndGgsIDAgLSBoZXhhZ29uU2lkZUxlbmd0aCksIG5ldyBQb2ludChhcmVhLnggKyBoZXhhZ29uU2lkZUxlbmd0aCwgYXJlYS55ICsgaGV4YWdvblNpZGVMZW5ndGgpKSxcbiAgICAgICAgc3RhcnRQb2ludCA9IG5ldyBQb2ludChhcmVhLnggLyAyLCBhcmVhLnkgLyAyKSxcbiAgICAgICAgcG9pbnQgPSBzdGFydFBvaW50LFxuICAgICAgICBzdGFydEdvbmlmID0gZ2V0T3JHZW5lcmF0ZUdvbmlmKGNhY2hlLCBoZXhhZ29uU2lkZUxlbmd0aCwgcG9pbnQsIEhleGFnb24uU2lkZXMuQm90dG9tKSxcbiAgICAgICAgZ29uaWYgPSBzdGFydEdvbmlmO1xuXG4gICAgLy8gR2VuZXJhdGUgaG9yaXpvbnRhbGx5IGZpcnN0IC9cXC9cXC9cXC9cXC9cXC8uXG4gICAgLy8gVG8gdGhlIGVhc3QuXG4gICAgZ2VuZXJhdGVHb25pZkluRGlyZWN0aW9uKGFyZWFXaXRoUGFkZGluZywgY2FjaGUsIGhleGFnb25TaWRlTGVuZ3RoLCBnb25pZiwgW0hleGFnb24uU2lkZXMuQm90dG9tUmlnaHQsIEhleGFnb24uU2lkZXMuVG9wUmlnaHRdKTtcbiAgICAvLyBUbyB0aGUgd2VzdC5cbiAgICBnZW5lcmF0ZUdvbmlmSW5EaXJlY3Rpb24oYXJlYVdpdGhQYWRkaW5nLCBjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgsIGdvbmlmLCBbSGV4YWdvbi5TaWRlcy5Cb3R0b21MZWZ0LCBIZXhhZ29uLlNpZGVzLlRvcExlZnRdKTtcblxuICAgIC8vIEdlbmVyYXRlIHZlcnRpY2FsbHksIGJhc2VkIG9uIG5laWdoYm9ycyBmcm9tIHRoZSBmaXJzdCBnb25pZi5cbiAgICAvLyBHZW5lcmF0ZSBiYXNlZCBvbiBuZWlnaGJvcnMgdG8gdGhlIGVhc3QuXG4gICAgZG8ge1xuICAgICAgICBnZW5lcmF0ZUdvbmlmSW5EaXJlY3Rpb24oYXJlYVdpdGhQYWRkaW5nLCBjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgsIGdvbmlmLCBIZXhhZ29uLlNpZGVzLlRvcCk7XG4gICAgICAgIGdlbmVyYXRlR29uaWZJbkRpcmVjdGlvbihhcmVhV2l0aFBhZGRpbmcsIGNhY2hlLCBoZXhhZ29uU2lkZUxlbmd0aCwgZ29uaWYsIEhleGFnb24uU2lkZXMuQm90dG9tKTtcbiAgICAgICAgZ29uaWYgPSBnb25pZi5nZXROZWlnaGJvcihIZXhhZ29uLlNpZGVzLkJvdHRvbVJpZ2h0KSB8fCBnb25pZi5nZXROZWlnaGJvcihIZXhhZ29uLlNpZGVzLlRvcFJpZ2h0KTtcbiAgICB9IHdoaWxlICghIWdvbmlmKTtcblxuICAgIC8vIFN0YXJ0IGZyb20gbGVmdCBuZWlnaGJvciBvZiB0aGUgZmlyc3QgZ29uaWYuXG4gICAgZ29uaWYgPSBzdGFydEdvbmlmLmdldE5laWdoYm9yKEhleGFnb24uU2lkZXMuQm90dG9tTGVmdCkgfHwgc3RhcnRHb25pZi5nZXROZWlnaGJvcihIZXhhZ29uLlNpZGVzLlRvcExlZnQpO1xuXG4gICAgLy8gR2VuZXJhdGUgYmFzZWQgb24gbmVpZ2hib3JzIHRvIHRoZSB3ZXN0LlxuICAgIGlmICghIWdvbmlmKSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGdlbmVyYXRlR29uaWZJbkRpcmVjdGlvbihhcmVhV2l0aFBhZGRpbmcsIGNhY2hlLCBoZXhhZ29uU2lkZUxlbmd0aCwgZ29uaWYsIEhleGFnb24uU2lkZXMuVG9wKTtcbiAgICAgICAgICAgIGdlbmVyYXRlR29uaWZJbkRpcmVjdGlvbihhcmVhV2l0aFBhZGRpbmcsIGNhY2hlLCBoZXhhZ29uU2lkZUxlbmd0aCwgZ29uaWYsIEhleGFnb24uU2lkZXMuQm90dG9tKTtcbiAgICAgICAgICAgIGdvbmlmID0gZ29uaWYuZ2V0TmVpZ2hib3IoSGV4YWdvbi5TaWRlcy5Cb3R0b21MZWZ0KSB8fCBnb25pZi5nZXROZWlnaGJvcihIZXhhZ29uLlNpZGVzLlRvcExlZnQpO1xuICAgICAgICB9IHdoaWxlICghIWdvbmlmKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhcnRHb25pZjtcbn1cblxuZnVuY3Rpb24gZ3JhcGhlcihjYW52YXNBcmVhLCBoZXhhZ29uU2lkZUxlbmd0aCkge1xuICAgIHZhciBjYWNoZSA9IHtcbiAgICAgICAgICAgIGhleGFnb25zOiB7fSxcbiAgICAgICAgICAgIG5vZGVzOiB7fSxcbiAgICAgICAgICAgIGxpbmVzOiB7fSxcbiAgICAgICAgICAgIGdvbmlmczoge30sXG4gICAgICAgIH0sXG4gICAgICAgIHN0YXJ0ID0gZ2VuZXJhdGVHcmFwaChjYW52YXNBcmVhLCBjYWNoZSwgaGV4YWdvblNpZGVMZW5ndGgpLFxuICAgICAgICBncmFwaCA9IHtcbiAgICAgICAgICAgIGhleGFnb25zOiBjYWNoZS5oZXhhZ29ucyxcbiAgICAgICAgICAgIG5vZGVzOiBjYWNoZS5ub2RlcyxcbiAgICAgICAgICAgIGxpbmVzOiBjYWNoZS5saW5lcyxcbiAgICAgICAgICAgIGdvbmlmczogY2FjaGUuZ29uaWZzLFxuICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIGdyYXBoO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdyYXBoZXI7IiwidmFyIE1BWF9BVVRPX0hJR0hMSUdIVF9ERUxBWSA9IDEwLFxuICAgIHJhbmRvbSA9IHJlcXVpcmUoXCIuLi91dGlscy9yYW5kb20uanNcIik7XG5cbmZ1bmN0aW9uIEhpZ2hsaWdodE9uSW50ZXJ2YWwoc2NlbmUsIGdyYXBoT2JqZWN0c1Rvb2wsIGhleEV2ZW50KSB7XG4gICAgdGhpcy5zY2VuZSA9IHNjZW5lO1xuICAgIHRoaXMuZ3JhcGhPYmplY3RzVG9vbCA9IGdyYXBoT2JqZWN0c1Rvb2w7XG4gICAgdGhpcy5oZXhFdmVudCA9IGhleEV2ZW50O1xuXG4gICAgdGhpcy5pc0hpZ2hsaWdodGVyU3RhcnRlZCA9IGZhbHNlO1xuICAgIHRoaXMuaGlnaGxpZ2h0Q291bnRlciA9IDAsXG4gICAgdGhpcy5oaWdobGlnaHRDb3VudGVySW50ZXJ2YWwgPSBudWxsO1xuICAgIHRoaXMuaXNBdXRvbWF0ZWRIaWdobGlnaHQgPSBmYWxzZSxcbiAgICB0aGlzLmhpZ2hsaWdodEludGVydmFsID0gbnVsbDtcblxuICAgIHRoaXMuaGlnaGxpZ2h0TWlsbGlzZWNvbmRzID0gMTAwMDtcbiAgICB0aGlzLnVuaGlnaGxpZ2h0QWZ0ZXJNaWxsaXNlY29uZHMgPSA1MDA7XG5cbiAgICB0aGlzLmJvdW5kTGlzdGVuZXJzID0ge1xuICAgICAgICBoZXhhZ29uaWZMaW5lSGlnaGxpZ2h0RXZlbnRMaXN0ZW5lcjogdGhpcy5oZXhhZ29uaWZMaW5lSGlnaGxpZ2h0RXZlbnRMaXN0ZW5lci5iaW5kKHRoaXMpLFxuICAgICAgICBoZXhhZ29uaWZMaW5lVW5oaWdobGlnaHRFdmVudExpc3RlbmVyOiB0aGlzLmhleGFnb25pZkxpbmVVbmhpZ2hsaWdodEV2ZW50TGlzdGVuZXIuYmluZCh0aGlzKSxcbiAgICAgICAgaGlnaGxpZ2h0Q291bnRlckRlY3JlYXNlcjogdGhpcy5oaWdobGlnaHRDb3VudGVyRGVjcmVhc2VyLmJpbmQodGhpcyksXG4gICAgICAgIGhpZ2hsaWdodFNvbWV0aGluZ1RoYXRJZk5vdGhpbmdIYXNIYXBwZW5lZDogdGhpcy5oaWdobGlnaHRTb21ldGhpbmdUaGF0SWZOb3RoaW5nSGFzSGFwcGVuZWQuYmluZCh0aGlzKSxcblxuICAgIH07XG59XG5cbkhpZ2hsaWdodE9uSW50ZXJ2YWwucHJvdG90eXBlLmhpZ2hsaWdodENvdW50ZXJEZWNyZWFzZXIgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmhpZ2hsaWdodENvdW50ZXIgPSBNYXRoLm1heCgwLCB0aGlzLmhpZ2hsaWdodENvdW50ZXIgLSAxKTtcbn1cblxuSGlnaGxpZ2h0T25JbnRlcnZhbC5wcm90b3R5cGUucmVzZXRSYW5kb21MaW5lID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxpbmUgPSB0aGlzLmdyYXBoT2JqZWN0c1Rvb2wuZ2V0UmFuZG9tTGluZSgpO1xuXG4gICAgdGhpcy5zY2VuZS5yZXNldExpbmUobGluZSk7XG59XG5cbkhpZ2hsaWdodE9uSW50ZXJ2YWwucHJvdG90eXBlLmhpZ2hsaWdodFJhbmRvbUxpbmUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGluZSA9IHRoaXMuZ3JhcGhPYmplY3RzVG9vbC5nZXRSYW5kb21MaW5lKCk7XG5cbiAgICB0aGlzLmlzQXV0b21hdGVkSGlnaGxpZ2h0ID0gdHJ1ZTtcbiAgICB0aGlzLnNjZW5lLmhpZ2hsaWdodExpbmUobGluZSk7XG4gICAgdGhpcy5pc0F1dG9tYXRlZEhpZ2hsaWdodCA9IGZhbHNlO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiB1bmhpZ2hsaWdodFNhbWVSYW5kb21MaW5lKCkge1xuICAgICAgICB0aGlzLnNjZW5lLnVuaGlnaGxpZ2h0TGluZShsaW5lKTtcbiAgICB9LmJpbmQodGhpcyksIHRoaXMudW5oaWdobGlnaHRBZnRlck1pbGxpc2Vjb25kcyk7XG59XG5cbkhpZ2hsaWdodE9uSW50ZXJ2YWwucHJvdG90eXBlLmhpZ2hsaWdodFJhbmRvbUhleGFnb24gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaGV4YWdvbjtcblxuICAgIGRvIHtcbiAgICAgICAgaGV4YWdvbiA9IHRoaXMuZ3JhcGhPYmplY3RzVG9vbC5nZXRSYW5kb21IZXhhZ29uKCk7XG4gICAgfSB3aGlsZSAoIWhleGFnb24uaXNDb21wbGV0ZSgpKVxuXG4gICAgdGhpcy5pc0F1dG9tYXRlZEhpZ2hsaWdodCA9IHRydWU7XG4gICAgdGhpcy5zY2VuZS5oaWdobGlnaHRIZXhhZ29uKGhleGFnb24pO1xuICAgIHRoaXMuaXNBdXRvbWF0ZWRIaWdobGlnaHQgPSBmYWxzZTtcblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gdW5oaWdobGlnaHRTYW1lUmFuZG9tSGV4YWdvbigpIHtcbiAgICAgICAgdGhpcy5zY2VuZS51bmhpZ2hsaWdodEhleGFnb24oaGV4YWdvbik7XG4gICAgfS5iaW5kKHRoaXMpLCB0aGlzLnVuaGlnaGxpZ2h0QWZ0ZXJNaWxsaXNlY29uZHMpO1xufVxuXG5IaWdobGlnaHRPbkludGVydmFsLnByb3RvdHlwZS5oaWdobGlnaHRTb21ldGhpbmdUaGF0SWZOb3RoaW5nSGFzSGFwcGVuZWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcm5kID0gcmFuZG9tLmludGVnZXIoMTApO1xuXG4gICAgaWYgKHRoaXMuaGlnaGxpZ2h0Q291bnRlciA9PT0gMCkge1xuICAgICAgICBpZiAocm5kIDwgMikge1xuICAgICAgICAgICAgdGhpcy5yZXNldFJhbmRvbUxpbmUoKTtcbiAgICAgICAgfSBlbHNlIGlmIChybmQgPCA5KSB7XG4gICAgICAgICAgICB0aGlzLmhpZ2hsaWdodFJhbmRvbUxpbmUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlnaGxpZ2h0UmFuZG9tSGV4YWdvbigpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5IaWdobGlnaHRPbkludGVydmFsLnByb3RvdHlwZS5oZXhhZ29uaWZMaW5lSGlnaGxpZ2h0RXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5pc0F1dG9tYXRlZEhpZ2hsaWdodCkge1xuICAgICAgICB0aGlzLmhpZ2hsaWdodENvdW50ZXIgPSBNYXRoLm1pbihOdW1iZXIuTUFYX1ZBTFVFIC0gMSwgdGhpcy5oaWdobGlnaHRDb3VudGVyICsgMSwgTUFYX0FVVE9fSElHSExJR0hUX0RFTEFZKTtcbiAgICB9XG59XG5cbkhpZ2hsaWdodE9uSW50ZXJ2YWwucHJvdG90eXBlLmhleGFnb25pZkxpbmVVbmhpZ2hsaWdodEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBTb21ldGhpbmdcbn1cblxuSGlnaGxpZ2h0T25JbnRlcnZhbC5wcm90b3R5cGUuaXNTdGFydGVkID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNIaWdobGlnaHRlclN0YXJ0ZWQgPT0gdHJ1ZTtcbn1cblxuSGlnaGxpZ2h0T25JbnRlcnZhbC5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5pc1N0YXJ0ZWQoKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJXYXMgc3RhcnRlZC5cIilcbiAgICB9XG5cbiAgICB0aGlzLmlzSGlnaGxpZ2h0ZXJTdGFydGVkID0gdHJ1ZTtcblxuICAgIHRoaXMuaGV4RXZlbnQubGlzdGVuKFwibGluZS5oaWdobGlnaHRcIiwgdGhpcy5ib3VuZExpc3RlbmVycy5oZXhhZ29uaWZMaW5lSGlnaGxpZ2h0RXZlbnRMaXN0ZW5lcik7XG4gICAgdGhpcy5oZXhFdmVudC5saXN0ZW4oXCJsaW5lLnVuaGlnaGxpZ2h0XCIsIHRoaXMuYm91bmRMaXN0ZW5lcnMuaGV4YWdvbmlmTGluZVVuaGlnaGxpZ2h0RXZlbnRMaXN0ZW5lcik7XG5cbiAgICB0aGlzLmhpZ2hsaWdodENvdW50ZXJJbnRlcnZhbCA9IHNldEludGVydmFsKHRoaXMuYm91bmRMaXN0ZW5lcnMuaGlnaGxpZ2h0Q291bnRlckRlY3JlYXNlciwgdGhpcy5oaWdobGlnaHRNaWxsaXNlY29uZHMpO1xuICAgIHRoaXMuaGlnaGxpZ2h0SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCh0aGlzLmJvdW5kTGlzdGVuZXJzLmhpZ2hsaWdodFNvbWV0aGluZ1RoYXRJZk5vdGhpbmdIYXNIYXBwZW5lZCwgdGhpcy5oaWdobGlnaHRNaWxsaXNlY29uZHMpO1xufVxuXG5IaWdobGlnaHRPbkludGVydmFsLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmlzU3RhcnRlZCgpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIldhcyBub3Qgc3RhcnRlZC5cIilcbiAgICB9XG5cbiAgICB0aGlzLmhleEV2ZW50LmNhbmNlbChcImxpbmUuaGlnaGxpZ2h0XCIsIHRoaXMuYm91bmRMaXN0ZW5lcnMuaGV4YWdvbmlmTGluZUhpZ2hsaWdodEV2ZW50TGlzdGVuZXIpO1xuICAgIHRoaXMuaGV4RXZlbnQuY2FuY2VsKFwibGluZS51bmhpZ2hsaWdodFwiLCB0aGlzLmJvdW5kTGlzdGVuZXJzLmhleGFnb25pZkxpbmVVbmhpZ2hsaWdodEV2ZW50TGlzdGVuZXIpO1xuXG4gICAgY2xlYXJJbnRlcnZhbCh0aGlzLmhpZ2hsaWdodENvdW50ZXJJbnRlcnZhbCk7XG4gICAgY2xlYXJJbnRlcnZhbCh0aGlzLmhpZ2hsaWdodEludGVydmFsKTtcblxuICAgIHRoaXMuaXNIaWdobGlnaHRlclN0YXJ0ZWQgPSBmYWxzZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBIaWdobGlnaHRPbkludGVydmFsOyIsImZ1bmN0aW9uIHJlbmRlcmVyKGNhbnZhc0lkLCBjYW52YXNBcmVhLCBncmFwaE9iamVjdHMpIHtcbiAgICB2YXIgcmFuZG9tID0gcmVxdWlyZShcIi4uL3V0aWxzL3JhbmRvbS5qc1wiKSxcbiAgICAgICAgSGV4YWdvbiA9IHJlcXVpcmUoXCIuLi9vYmplY3RzL2hleGFnb24uanNcIiksXG4gICAgICAgIEhleEV2ZW50ID0gcmVxdWlyZShcIi4vZXZlbnRzLmpzXCIpO1xuXG4gICAgLy8gVE9ETzogdXNlIGhpZHBpLWNhbnZhcy1wb2x5ZmlsbFxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qb25kYXZpZGpvaG4vaGlkcGktY2FudmFzLXBvbHlmaWxsXG4gICAgdmFyIGNhbnZhc0VsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChjYW52YXNJZCk7XG4gICAgY2FudmFzRWxlbWVudC53aWR0aCA9IGNhbnZhc0FyZWEueDtcbiAgICBjYW52YXNFbGVtZW50LmhlaWdodCA9IGNhbnZhc0FyZWEueTtcblxuICAgIHZhciBoZXhFdmVudCA9IG5ldyBIZXhFdmVudChjYW52YXNFbGVtZW50KTtcblxuICAgIHZhciBjYW52YXMgPSBvQ2FudmFzLmNyZWF0ZSh7XG4gICAgICAgICAgICBjYW52YXM6IFwiI1wiICsgY2FudmFzSWRcbiAgICAgICAgfSksXG4gICAgICAgIGdyYXBoaWNzTG9va3VwQ2FjaGUgPSB7fTtcblxuICAgIGZ1bmN0aW9uIGdldERlZmF1bHRTdHJva2VXaWR0aCgpIHtcbiAgICAgICAgLy8gVE9ETzogbW92ZSB0byBvcHRpb25zIG9iamVjdFxuICAgICAgICAvLyByZXR1cm4gMTA7XG4gICAgICAgIHJldHVybiByYW5kb20uaW50ZWdlcigzLCAxMCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RGVmYXVsdFN0cm9rZUNvbG9yKCkge1xuICAgICAgICAvLyBUT0RPOiBtb3ZlIHRvIG9wdGlvbnMgb2JqZWN0XG4gICAgICAgIC8vIHJldHVybiBcInJnYmEoMCwgMCwgMCwgMC4wMSlcIjtcbiAgICAgICAgLy8gcmV0dXJuIFwicmdiYSgwLCAwLCAwLCAwLjEpXCI7XG4gICAgICAgIHJldHVybiBcInRyYW5zcGFyZW50XCI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0RGVmYXVsdEZpbGxDb2xvcigpIHtcbiAgICAgICAgLy8gVE9ETzogbW92ZSB0byBvcHRpb25zIG9iamVjdFxuICAgICAgICAvLyByZXR1cm4gXCJyZ2JhKDAsIDAsIDAsIDAuMDEpXCI7XG4gICAgICAgIC8vIHJldHVybiBcInJnYmEoMTI3LCAwLCAwLCAwLjEpXCI7XG4gICAgICAgIHJldHVybiBcInRyYW5zcGFyZW50XCI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Q29sb3JCeUxvY2F0aW9uKHgsIHksIGhpZ2hsaWdodCkge1xuICAgICAgICAvLyBOT1RFOiB4IGFuZCB5IGFyZSBub3QgZ3VhcmFudGVlZCB0byBiZSBpbnNpZGUgdGhlIGNhbnZhcyBhcmVhXG4gICAgICAgIHZhciBieVggPSBNYXRoLmZsb29yKCh4IC8gY2FudmFzQXJlYS54KSAqIDIwKSxcbiAgICAgICAgICAgIGJ5WSA9IE1hdGguZmxvb3IoKHkgLyBjYW52YXNBcmVhLnkpICogMzYwKSxcbiAgICAgICAgICAgIC8vIFRPRE86IG1vdmUgdG8gb3B0aW9ucyBvYmplY3RcbiAgICAgICAgICAgIG9wYWNpdHkgPSBoaWdobGlnaHQgPyAwLjcgOiAwLjM7XG5cbiAgICAgICAgcmV0dXJuIFwiaHNsYShcIiArIGJ5WSArIFwiLCBcIiArICgxMDAgLSAoYnlYIC8gMikpICsgXCIlLCBcIiArICg2MCAtIGJ5WCkgKyBcIiUsIFwiICsgb3BhY2l0eS50b0ZpeGVkKDMpICsgXCIpXCI7XG4gICAgICAgIC8vIHJldHVybiBcImhzbGEoNjAsIDEwMCUsIDUwJSwgMC4zKVwiO1xuICAgIH1cblxuICAgIHZhciBsaW5lUHJvdG90eXBlID0gY2FudmFzLmRpc3BsYXkubGluZSh7XG4gICAgICAgIGNhcDogXCJyb3VuZFwiLFxuICAgICAgICBzdHJva2VXaWR0aDogZ2V0RGVmYXVsdFN0cm9rZVdpZHRoKCksXG4gICAgICAgIHN0cm9rZUNvbG9yOiBnZXREZWZhdWx0U3Ryb2tlQ29sb3IoKSxcbiAgICB9KTtcblxuICAgIHZhciBnb25pZlByb3RvdHlwZSA9IGNhbnZhcy5kaXNwbGF5LnBvbHlnb24oe1xuICAgICAgICBzaWRlczogNixcbiAgICAgICAgZmlsbDogZ2V0RGVmYXVsdEZpbGxDb2xvcigpLFxuICAgICAgICBzdHJva2VXaWR0aDogZ2V0RGVmYXVsdFN0cm9rZVdpZHRoKCksXG4gICAgICAgIHN0cm9rZUNvbG9yOiBnZXREZWZhdWx0U3Ryb2tlQ29sb3IoKSxcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIG9uTGluZU1vdXNlRW50ZXIoZXZlbnQpIHtcbiAgICAgICAgbGluZUhpZ2hsaWdodC5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uTGluZU1vdXNlTGVhdmUoZXZlbnQpIHtcbiAgICAgICAgbGluZVVuaGlnaGxpZ2h0LmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gb25Hb25pZkNsaWNrKGV2ZW50KSB7XG4gICAgICAgIGhpZ2hsaWdodEhleGFnb24odGhpcy50YWcuaGV4YWdvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbGluZVJlc2V0KCkge1xuICAgICAgICB2YXIgbGluZUV2ZW50ID0gaGV4RXZlbnQuZmlyZShcImxpbmUucmVzZXRcIiwgdGhpcywgdGhpcy50YWcpO1xuXG4gICAgICAgIGlmIChsaW5lRXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdHJva2VDb2xvciA9IGdldERlZmF1bHRTdHJva2VDb2xvcigpO1xuICAgICAgICB0aGlzLnpJbmRleCA9IFwiYmFja1wiO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpbmVIaWdobGlnaHQoKSB7XG4gICAgICAgIHZhciBsaW5lRXZlbnQgPSBoZXhFdmVudC5maXJlKFwibGluZS5oaWdobGlnaHRcIiwgdGhpcywgdGhpcy50YWcpO1xuXG4gICAgICAgIGlmIChsaW5lRXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdHJva2VDb2xvciA9IGdldENvbG9yQnlMb2NhdGlvbih0aGlzLngsIHRoaXMueSwgdHJ1ZSk7XG4gICAgICAgIHRoaXMuekluZGV4ID0gXCJmcm9udFwiO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGxpbmVVbmhpZ2hsaWdodChldmVudCkge1xuICAgICAgICB2YXIgbGluZUV2ZW50ID0gaGV4RXZlbnQuZmlyZShcImxpbmUudW5oaWdobGlnaHRcIiwgdGhpcywgdGhpcy50YWcpO1xuXG4gICAgICAgIGlmIChsaW5lRXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdHJva2VDb2xvciA9IGdldENvbG9yQnlMb2NhdGlvbih0aGlzLngsIHRoaXMueSwgZmFsc2UpO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRyYXdMaW5lSW5TY2VuZShzY2VuZSwgc3RhcnQsIGVuZCwgdGFnKSB7XG4gICAgICAgIHZhciBsaW5lID0gbGluZVByb3RvdHlwZS5jbG9uZSh7XG4gICAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICAgIHg6IHN0YXJ0LngsXG4gICAgICAgICAgICAgICAgeTogc3RhcnQueVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVuZDoge1xuICAgICAgICAgICAgICAgIHg6IGVuZC54LFxuICAgICAgICAgICAgICAgIHk6IGVuZC55XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGFnOiB0YWdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2NlbmUuYWRkKGxpbmUpO1xuXG4gICAgICAgIGxpbmVcbiAgICAgICAgICAgIC5iaW5kKFwibW91c2VlbnRlciB0b3VjaGVudGVyXCIsIG9uTGluZU1vdXNlRW50ZXIpXG4gICAgICAgICAgICAuYmluZChcIm1vdXNlbGVhdmUgdG91Y2hsZWF2ZVwiLCBvbkxpbmVNb3VzZUxlYXZlKTtcblxuICAgICAgICByZXR1cm4gbGluZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmF3R29uaWZJblNjZW5lKHNjZW5lLCBjZW50ZXIsIHJhZGl1cywgdGFnKSB7XG4gICAgICAgIHZhciBnb25pZiA9IGdvbmlmUHJvdG90eXBlLmNsb25lKHtcbiAgICAgICAgICAgIG9yaWdpbjoge1xuICAgICAgICAgICAgICAgIHg6IGNlbnRlci54LFxuICAgICAgICAgICAgICAgIHk6IGNlbnRlci55XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmFkaXVzOiByYWRpdXMsXG4gICAgICAgICAgICB0YWc6IHRhZ1xuICAgICAgICB9KTtcblxuICAgICAgICBzY2VuZS5hZGQoZ29uaWYpO1xuXG4gICAgICAgIGdvbmlmXG4gICAgICAgICAgICAuYmluZChcImNsaWNrIHRhcFwiLCBvbkdvbmlmQ2xpY2spO1xuXG4gICAgICAgIHJldHVybiBnb25pZjtcbiAgICB9XG5cbiAgICB2YXIgc2NlbmVHcmlkID0gXCJncmlkXCI7XG5cbiAgICBjYW52YXMuc2NlbmVzLmNyZWF0ZShzY2VuZUdyaWQsIGZ1bmN0aW9uIGNhbnZhc1NjZW5lc0NyZWF0ZSgpIHtcbiAgICAgICAgdmFyIHNjZW5lID0gdGhpcztcblxuICAgICAgICAvLyBPYmplY3Qua2V5cyhub2Rlcykuc29ydCgpLnJlZHVjZShmdW5jdGlvbihzdGFydCwgZW5kKSB7XG4gICAgICAgIC8vICAgICBkcmF3TGluZUluU2NlbmUoc2NlbmUsIG5vZGVzW3N0YXJ0XSwgbm9kZXNbZW5kXSwgbm9kZSk7XG5cbiAgICAgICAgLy8gICAgIHJldHVybiBlbmQ7XG4gICAgICAgIC8vIH0pO1xuXG4gICAgICAgIC8vIFRPRE86IEFzeW5jL3F1ZXVlZCBvYmplY3QgYWRkaW5nLCBzbyBtYWluIHVzZXIgdGhyZWFkIHdvbid0IGZyZWV6ZS9iZWNvbWUgdW5yZXNwb25zaXZlP1xuICAgICAgICBPYmplY3Qua2V5cyhncmFwaE9iamVjdHMuZ29uaWZzKS5mb3JFYWNoKGZ1bmN0aW9uIGdvbmlmc0ZvckVhY2hDcmVhdGVHcmFwaGljKGNhY2hlS2V5KSB7XG4gICAgICAgICAgICB2YXIgZ29uaWYgPSBncmFwaE9iamVjdHMuZ29uaWZzW2NhY2hlS2V5XSxcbiAgICAgICAgICAgICAgICBjZW50ZXIgPSBnb25pZi5oZXhhZ29uLmdldENlbnRlcigpLFxuICAgICAgICAgICAgICAgIG9yaWdpbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgeDogMCAtIGNlbnRlci54LFxuICAgICAgICAgICAgICAgICAgICB5OiAwIC0gY2VudGVyLnksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBUT0RPIERFQlVHIEZJWFxuICAgICAgICAgICAgICAgIHJhZGl1cyA9ICgxMDAgLSAyKSxcbiAgICAgICAgICAgICAgICBncmFwaGljID0gZHJhd0dvbmlmSW5TY2VuZShzY2VuZSwgb3JpZ2luLCByYWRpdXMsIGdvbmlmKTtcblxuICAgICAgICAgICAgZ3JhcGhpY3NMb29rdXBDYWNoZVtjYWNoZUtleV0gPSBncmFwaGljO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUT0RPOiBBc3luYy9xdWV1ZWQgb2JqZWN0IGFkZGluZywgc28gbWFpbiB1c2VyIHRocmVhZCB3b24ndCBmcmVlemUvYmVjb21lIHVucmVzcG9uc2l2ZT9cbiAgICAgICAgT2JqZWN0LmtleXMoZ3JhcGhPYmplY3RzLmxpbmVzKS5mb3JFYWNoKGZ1bmN0aW9uIGxpbmVzRm9yRWFjaENyZWF0ZUdyYXBoaWMoY2FjaGVLZXkpIHtcbiAgICAgICAgICAgIHZhciBsaW5lID0gZ3JhcGhPYmplY3RzLmxpbmVzW2NhY2hlS2V5XSxcbiAgICAgICAgICAgICAgICBncmFwaGljID0gZHJhd0xpbmVJblNjZW5lKHNjZW5lLCBsaW5lLnN0YXJ0LCBsaW5lLmVuZCwgbGluZSk7XG5cbiAgICAgICAgICAgIGdyYXBoaWNzTG9va3VwQ2FjaGVbY2FjaGVLZXldID0gZ3JhcGhpYztcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBjYW52YXMuc2NlbmVzLmxvYWQoc2NlbmVHcmlkKTtcblxuICAgIGZ1bmN0aW9uIGhpZ2hsaWdodExpbmUobGluZSkge1xuICAgICAgICB2YXIgY2FjaGVLZXkgPSBsaW5lLmNhY2hlS2V5LFxuICAgICAgICAgICAgc2VsZWN0ZWQgPSBncmFwaGljc0xvb2t1cENhY2hlW2NhY2hlS2V5XTtcblxuICAgICAgICBsaW5lSGlnaGxpZ2h0LmNhbGwoc2VsZWN0ZWQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc2V0TGluZShsaW5lKSB7XG4gICAgICAgIHZhciBjYWNoZUtleSA9IGxpbmUuY2FjaGVLZXksXG4gICAgICAgICAgICBzZWxlY3RlZCA9IGdyYXBoaWNzTG9va3VwQ2FjaGVbY2FjaGVLZXldO1xuXG4gICAgICAgIGxpbmVSZXNldC5jYWxsKHNlbGVjdGVkKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlYWNoTGluZUluSGV4YWdvbihoZXhhZ29uLCBmbikge1xuICAgICAgICB2YXIgc3RhcnRTaWRlID0gSGV4YWdvbi5TaWRlcy5Ub3AsXG4gICAgICAgICAgICBzaWRlID0gc3RhcnRTaWRlLFxuICAgICAgICAgICAgc2lkZUxpbmU7XG5cbiAgICAgICAgZG8ge1xuICAgICAgICAgICAgc2lkZUxpbmUgPSBoZXhhZ29uLmdldFNpZGVMaW5lKHNpZGUpO1xuICAgICAgICAgICAgZm4oc2lkZUxpbmUubGluZSk7XG4gICAgICAgICAgICBzaWRlID0gSGV4YWdvbi5TaWRlcy5uZXh0KHNpZGUpO1xuICAgICAgICB9IHdoaWxlIChzaWRlICE9PSBzdGFydFNpZGUpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaGlnaGxpZ2h0SGV4YWdvbihoZXhhZ29uKSB7XG4gICAgICAgIGVhY2hMaW5lSW5IZXhhZ29uKGhleGFnb24sIGhpZ2hsaWdodExpbmUpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVuaGlnaGxpZ2h0SGV4YWdvbihoZXhhZ29uKSB7XG4gICAgICAgIGVhY2hMaW5lSW5IZXhhZ29uKGhleGFnb24sIHVuaGlnaGxpZ2h0TGluZSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdW5oaWdobGlnaHRMaW5lKGxpbmUpIHtcbiAgICAgICAgdmFyIGNhY2hlS2V5ID0gbGluZS5jYWNoZUtleSxcbiAgICAgICAgICAgIHNlbGVjdGVkID0gZ3JhcGhpY3NMb29rdXBDYWNoZVtjYWNoZUtleV07XG5cbiAgICAgICAgbGluZVVuaGlnaGxpZ2h0LmNhbGwoc2VsZWN0ZWQpO1xuICAgIH1cblxuICAgIHZhciBhcGkgPSB7XG4gICAgICAgIHJlc2V0TGluZTogcmVzZXRMaW5lLFxuICAgICAgICBoaWdobGlnaHRMaW5lOiBoaWdobGlnaHRMaW5lLFxuICAgICAgICB1bmhpZ2hsaWdodExpbmU6IHVuaGlnaGxpZ2h0TGluZSxcbiAgICAgICAgaGlnaGxpZ2h0SGV4YWdvbjogaGlnaGxpZ2h0SGV4YWdvbixcbiAgICAgICAgdW5oaWdobGlnaHRIZXhhZ29uOiB1bmhpZ2hsaWdodEhleGFnb24sXG4gICAgfTtcblxuICAgIHJldHVybiBhcGk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVuZGVyZXI7IiwiZnVuY3Rpb24gQXJlYShzdGFydCwgZW5kKSB7XG4gICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgIHRoaXMuZW5kID0gZW5kO1xuXG4gICAgaWYgKHRoaXMuc3RhcnQueCA8PSB0aGlzLmVuZC54KSB7XG4gICAgICAgIHRoaXMuYVggPSB0aGlzLnN0YXJ0Lng7XG4gICAgICAgIHRoaXMuYlggPSB0aGlzLmVuZC54O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYVggPSB0aGlzLmVuZC54O1xuICAgICAgICB0aGlzLmJYID0gdGhpcy5zdGFydC54O1xuICAgIH1cblxuICAgIGlmICh0aGlzLnN0YXJ0LnkgPD0gdGhpcy5lbmQueSkge1xuICAgICAgICB0aGlzLmFZID0gdGhpcy5zdGFydC55O1xuICAgICAgICB0aGlzLmJZID0gdGhpcy5lbmQueTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmFZID0gdGhpcy5lbmQueTtcbiAgICAgICAgdGhpcy5iWSA9IHRoaXMuc3RhcnQueTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbn1cblxuQXJlYS5wcm90b3R5cGUuaXNJbnNpZGUgPSBmdW5jdGlvbihwb2ludCkge1xuICAgIHJldHVybiAhdGhpcy5pc091dHNpZGUocG9pbnQpO1xufTtcblxuQXJlYS5wcm90b3R5cGUuaXNPdXRzaWRlID0gZnVuY3Rpb24ocG9pbnQpIHtcbiAgICB2YXIgaXNPdXRzaWRlID0gKHBvaW50LnggPCB0aGlzLmFYKSB8fCAocG9pbnQueCA+IHRoaXMuYlgpIHx8IChwb2ludC55IDwgdGhpcy5hWSkgfHwgKHBvaW50LnkgPiB0aGlzLmJZKTtcblxuICAgIHJldHVybiBpc091dHNpZGU7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFyZWE7IiwiZnVuY3Rpb24gQ29ybmVyKG5hbWUsIHJvdGF0aW9uKSB7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLnJvdGF0aW9uID0gcm90YXRpb247XG5cbiAgICByZXR1cm4gdGhpcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDb3JuZXI7IiwiZnVuY3Rpb24gQ29ybmVyUG9pbnQoY29ybmVyLCBwb2ludCkge1xuICAgIHRoaXMuY29ybmVyID0gY29ybmVyO1xuICAgIHRoaXMucG9pbnQgPSBwb2ludDtcblxuICAgIHJldHVybiB0aGlzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENvcm5lclBvaW50OyIsInZhciBIZXhhZ29uID0gcmVxdWlyZShcIi4vaGV4YWdvbi5qc1wiKSxcbiAgICByYW5kb20gPSByZXF1aXJlKFwiLi4vdXRpbHMvcmFuZG9tLmpzXCIpO1xuXG5mdW5jdGlvbiBHb25pZihoZXhhZ29uKSB7XG4gICAgdGhpcy5jYWNoZUtleSA9IHJhbmRvbS5pbnRlZ2VyKE51bWJlci5NQVhfVkFMVUUpO1xuXG4gICAgdGhpcy5oZXhhZ29uID0gaGV4YWdvbjtcblxuICAgIHRoaXMubmVpZ2hib3JzID0ge1xuICAgICAgICB0b3A6IG51bGwsXG4gICAgICAgIHRvcFJpZ2h0OiBudWxsLFxuICAgICAgICBib3R0b21SaWdodDogbnVsbCxcbiAgICAgICAgYm90dG9tOiBudWxsLFxuICAgICAgICBib3R0b21MZWZ0OiBudWxsLFxuICAgICAgICB0b3BMZWZ0OiBudWxsLFxuICAgIH07XG5cbiAgICByZXR1cm4gdGhpcztcbn1cblxuR29uaWYuTmVpZ2hib3JzID0ge307XG5cbkdvbmlmLk5laWdoYm9ycy5nZXRTaGFyZWROZWlnaGJvckRpcmVjdGlvbnMgPSBmdW5jdGlvbihkaXJlY3Rpb24pIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcbiAgICAgICAgY2FzZSBIZXhhZ29uLlNpZGVzLlRvcDpcbiAgICAgICAgICAgIHJlc3VsdCA9IFt7XG4gICAgICAgICAgICAgICAgZnJvbU5laWdoYm9yOiBIZXhhZ29uLlNpZGVzLkJvdHRvbUxlZnQsXG4gICAgICAgICAgICAgICAgZnJvbUhlcmU6IEhleGFnb24uU2lkZXMuVG9wTGVmdFxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIGZyb21OZWlnaGJvcjogSGV4YWdvbi5TaWRlcy5Cb3R0b21SaWdodCxcbiAgICAgICAgICAgICAgICBmcm9tSGVyZTogSGV4YWdvbi5TaWRlcy5Ub3BSaWdodFxuICAgICAgICAgICAgfV07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLlNpZGVzLlRvcFJpZ2h0OlxuICAgICAgICAgICAgcmVzdWx0ID0gW3tcbiAgICAgICAgICAgICAgICBmcm9tTmVpZ2hib3I6IEhleGFnb24uU2lkZXMuVG9wTGVmdCxcbiAgICAgICAgICAgICAgICBmcm9tSGVyZTogSGV4YWdvbi5TaWRlcy5Ub3BcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICBmcm9tTmVpZ2hib3I6IEhleGFnb24uU2lkZXMuQm90dG9tLFxuICAgICAgICAgICAgICAgIGZyb21IZXJlOiBIZXhhZ29uLlNpZGVzLkJvdHRvbVJpZ2h0XG4gICAgICAgICAgICB9XTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQ6XG4gICAgICAgICAgICByZXN1bHQgPSBbe1xuICAgICAgICAgICAgICAgIGZyb21OZWlnaGJvcjogSGV4YWdvbi5TaWRlcy5Ub3AsXG4gICAgICAgICAgICAgICAgZnJvbUhlcmU6IEhleGFnb24uU2lkZXMuVG9wUmlnaHRcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICBmcm9tTmVpZ2hib3I6IEhleGFnb24uU2lkZXMuQm90dG9tTGVmdCxcbiAgICAgICAgICAgICAgICBmcm9tSGVyZTogSGV4YWdvbi5TaWRlcy5Cb3R0b21cbiAgICAgICAgICAgIH1dO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Cb3R0b206XG4gICAgICAgICAgICByZXN1bHQgPSBbe1xuICAgICAgICAgICAgICAgIGZyb21OZWlnaGJvcjogSGV4YWdvbi5TaWRlcy5Ub3BSaWdodCxcbiAgICAgICAgICAgICAgICBmcm9tSGVyZTogSGV4YWdvbi5TaWRlcy5Cb3R0b21SaWdodFxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIGZyb21OZWlnaGJvcjogSGV4YWdvbi5TaWRlcy5Ub3BMZWZ0LFxuICAgICAgICAgICAgICAgIGZyb21IZXJlOiBIZXhhZ29uLlNpZGVzLkJvdHRvbUxlZnRcbiAgICAgICAgICAgIH1dO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Cb3R0b21MZWZ0OlxuICAgICAgICAgICAgcmVzdWx0ID0gW3tcbiAgICAgICAgICAgICAgICBmcm9tTmVpZ2hib3I6IEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQsXG4gICAgICAgICAgICAgICAgZnJvbUhlcmU6IEhleGFnb24uU2lkZXMuQm90dG9tXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgZnJvbU5laWdoYm9yOiBIZXhhZ29uLlNpZGVzLlRvcCxcbiAgICAgICAgICAgICAgICBmcm9tSGVyZTogSGV4YWdvbi5TaWRlcy5Ub3BMZWZ0XG4gICAgICAgICAgICB9XTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wTGVmdDpcbiAgICAgICAgICAgIHJlc3VsdCA9IFt7XG4gICAgICAgICAgICAgICAgZnJvbU5laWdoYm9yOiBIZXhhZ29uLlNpZGVzLkJvdHRvbSxcbiAgICAgICAgICAgICAgICBmcm9tSGVyZTogSGV4YWdvbi5TaWRlcy5Cb3R0b21MZWZ0XG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgZnJvbU5laWdoYm9yOiBIZXhhZ29uLlNpZGVzLlRvcFJpZ2h0LFxuICAgICAgICAgICAgICAgIGZyb21IZXJlOiBIZXhhZ29uLlNpZGVzLlRvcFxuICAgICAgICAgICAgfV07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gbmVpZ2hib3Igc2lkZSBcIiArIGRpcmVjdGlvbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkdvbmlmLnByb3RvdHlwZS5nZXROZWlnaGJvcnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbmVpZ2hib3JzID0gW1xuICAgICAgICB0aGlzLm5laWdoYm9ycy50b3AsXG4gICAgICAgIHRoaXMubmVpZ2hib3JzLnRvcFJpZ2h0LFxuICAgICAgICB0aGlzLm5laWdoYm9ycy5ib3R0b21SaWdodCxcbiAgICAgICAgdGhpcy5uZWlnaGJvcnMuYm90dG9tLFxuICAgICAgICB0aGlzLm5laWdoYm9ycy5ib3R0b21MZWZ0LFxuICAgICAgICB0aGlzLm5laWdoYm9ycy50b3BMZWZ0XG4gICAgXTtcblxuICAgIHJldHVybiBuZWlnaGJvcnM7XG59O1xuXG5Hb25pZi5wcm90b3R5cGUuZ2V0TmVpZ2hib3IgPSBmdW5jdGlvbihkaXJlY3Rpb24pIHtcbiAgICB2YXIgcmVzdWx0O1xuXG4gICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcbiAgICAgICAgY2FzZSBIZXhhZ29uLlNpZGVzLlRvcDpcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMubmVpZ2hib3JzLnRvcDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wUmlnaHQ6XG4gICAgICAgICAgICByZXN1bHQgPSB0aGlzLm5laWdoYm9ycy50b3BSaWdodDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQ6XG4gICAgICAgICAgICByZXN1bHQgPSB0aGlzLm5laWdoYm9ycy5ib3R0b21SaWdodDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tOlxuICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5uZWlnaGJvcnMuYm90dG9tO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Cb3R0b21MZWZ0OlxuICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5uZWlnaGJvcnMuYm90dG9tTGVmdDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wTGVmdDpcbiAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMubmVpZ2hib3JzLnRvcExlZnQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gbmVpZ2hib3Igc2lkZSBcIiArIGRpcmVjdGlvbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkdvbmlmLnByb3RvdHlwZS5zZXROZWlnaGJvciA9IGZ1bmN0aW9uKGRpcmVjdGlvbiwgbmVpZ2hib3IpIHtcbiAgICBzd2l0Y2ggKGRpcmVjdGlvbikge1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wOlxuICAgICAgICAgICAgdGhpcy5uZWlnaGJvcnMudG9wID0gbmVpZ2hib3I7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLlNpZGVzLlRvcFJpZ2h0OlxuICAgICAgICAgICAgdGhpcy5uZWlnaGJvcnMudG9wUmlnaHQgPSBuZWlnaGJvcjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQ6XG4gICAgICAgICAgICB0aGlzLm5laWdoYm9ycy5ib3R0b21SaWdodCA9IG5laWdoYm9yO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Cb3R0b206XG4gICAgICAgICAgICB0aGlzLm5laWdoYm9ycy5ib3R0b20gPSBuZWlnaGJvcjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tTGVmdDpcbiAgICAgICAgICAgIHRoaXMubmVpZ2hib3JzLmJvdHRvbUxlZnQgPSBuZWlnaGJvcjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wTGVmdDpcbiAgICAgICAgICAgIHRoaXMubmVpZ2hib3JzLnRvcExlZnQgPSBuZWlnaGJvcjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBkaXJlY3Rpb24gXCIgKyBkaXJlY3Rpb24pO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR29uaWY7IiwidmFyIENvcm5lciA9IHJlcXVpcmUoXCIuL2Nvcm5lci5qc1wiKSxcbiAgICBDb3JuZXJQb2ludCA9IHJlcXVpcmUoXCIuL2Nvcm5lcnBvaW50LmpzXCIpLFxuICAgIFNpZGUgPSByZXF1aXJlKFwiLi9zaWRlLmpzXCIpLFxuICAgIExpbmUgPSByZXF1aXJlKFwiLi9saW5lLmpzXCIpLFxuICAgIFNpZGVMaW5lID0gcmVxdWlyZShcIi4vc2lkZWxpbmUuanNcIik7XG5cbnZhciBOVU1CRVJfT0ZfU0lERVMgPSA2O1xuXG5mdW5jdGlvbiBIZXhhZ29uKCkge1xuICAgIHRoaXMucG9pbnRzID0ge1xuICAgICAgICB0b3BMZWZ0OiBudWxsLFxuICAgICAgICB0b3BSaWdodDogbnVsbCxcbiAgICAgICAgcmlnaHQ6IG51bGwsXG4gICAgICAgIGJvdHRvbVJpZ2h0OiBudWxsLFxuICAgICAgICBib3R0b21MZWZ0OiBudWxsLFxuICAgICAgICBsZWZ0OiBudWxsLFxuICAgIH07XG5cbiAgICB0aGlzLmxpbmVzID0ge1xuICAgICAgICB0b3A6IG51bGwsXG4gICAgICAgIHRvcFJpZ2h0OiBudWxsLFxuICAgICAgICBib3R0b21SaWdodDogbnVsbCxcbiAgICAgICAgYm90dG9tOiBudWxsLFxuICAgICAgICBib3R0b21MZWZ0OiBudWxsLFxuICAgICAgICB0b3BMZWZ0OiBudWxsLFxuICAgIH07XG59XG5cbkhleGFnb24uQ29ybmVycyA9IHtcbiAgICBUb3BMZWZ0OiBuZXcgQ29ybmVyKFwidG9wIGxlZnRcIiwgMTIwKSxcbiAgICBUb3BSaWdodDogbmV3IENvcm5lcihcInRvcCByaWdodFwiLCA2MCksXG4gICAgUmlnaHQ6IG5ldyBDb3JuZXIoXCJyaWdodFwiLCAwKSxcbiAgICBCb3R0b21SaWdodDogbmV3IENvcm5lcihcImJvdHRvbSByaWdodFwiLCAzMDApLFxuICAgIEJvdHRvbUxlZnQ6IG5ldyBDb3JuZXIoXCJib3R0b20gbGVmdFwiLCAyNDApLFxuICAgIExlZnQ6IG5ldyBDb3JuZXIoXCJsZWZ0XCIsIDE4MCksXG59O1xuXG5PYmplY3Qua2V5cyhIZXhhZ29uLkNvcm5lcnMpLmZvckVhY2goZnVuY3Rpb24oY29ybmVyS2V5KSB7XG4gICAgdmFyIGNvcm5lciA9IEhleGFnb24uQ29ybmVyc1tjb3JuZXJLZXldO1xuXG4gICAgY29ybmVyLnJhZCA9ICgoKGNvcm5lci5yb3RhdGlvbiArIDYwKSAvIDE4MCkgJSAzNjApICogTWF0aC5QSTtcbn0pO1xuXG5IZXhhZ29uLkNvcm5lcnMubmV4dCA9IGZ1bmN0aW9uKHN0YXJ0KSB7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIHN3aXRjaCAoc3RhcnQpIHtcbiAgICAgICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuVG9wTGVmdDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uQ29ybmVycy5Ub3BSaWdodDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5Ub3BSaWdodDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uQ29ybmVycy5SaWdodDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5SaWdodDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uQ29ybmVycy5Cb3R0b21SaWdodDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5Cb3R0b21SaWdodDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uQ29ybmVycy5Cb3R0b21MZWZ0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLkJvdHRvbUxlZnQ6XG4gICAgICAgICAgICByZXN1bHQgPSBIZXhhZ29uLkNvcm5lcnMuTGVmdDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5MZWZ0OlxuICAgICAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5Db3JuZXJzLlRvcExlZnQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gc3RhcnQgY29ybmVyIFwiICsgc3RhcnQpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5IZXhhZ29uLkNvcm5lcnMub3Bwb3NpdGUgPSBmdW5jdGlvbihzdGFydCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBzd2l0Y2ggKHN0YXJ0KSB7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLlRvcExlZnQ6XG4gICAgICAgICAgICByZXN1bHQgPSBIZXhhZ29uLkNvcm5lcnMuQm90dG9tUmlnaHQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuVG9wUmlnaHQ6XG4gICAgICAgICAgICByZXN1bHQgPSBIZXhhZ29uLkNvcm5lcnMuQm90dG9tTGVmdDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5SaWdodDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uQ29ybmVycy5MZWZ0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLkJvdHRvbVJpZ2h0OlxuICAgICAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5Db3JuZXJzLlRvcExlZnQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuQm90dG9tTGVmdDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uQ29ybmVycy5Ub3BSaWdodDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5MZWZ0OlxuICAgICAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5Db3JuZXJzLlJpZ2h0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHN0YXJ0IGNvcm5lciBcIiArIHN0YXJ0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuSGV4YWdvbi5Db3JuZXJzLmNvbm5lY3RpbmcgPSBmdW5jdGlvbihzdGFydCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBzd2l0Y2ggKHN0YXJ0KSB7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLlRvcExlZnQ6XG4gICAgICAgICAgICByZXN1bHQgPSBbXG4gICAgICAgICAgICAgICAgSGV4YWdvbi5Db3JuZXJzLlJpZ2h0LFxuICAgICAgICAgICAgICAgIEhleGFnb24uQ29ybmVycy5Cb3R0b21MZWZ0XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLlRvcFJpZ2h0OlxuICAgICAgICAgICAgcmVzdWx0ID0gW1xuICAgICAgICAgICAgICAgIEhleGFnb24uQ29ybmVycy5Cb3R0b21SaWdodCxcbiAgICAgICAgICAgICAgICBIZXhhZ29uLkNvcm5lcnMuTGVmdFxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5SaWdodDpcbiAgICAgICAgICAgIHJlc3VsdCA9IFtcbiAgICAgICAgICAgICAgICBIZXhhZ29uLkNvcm5lcnMuQm90dG9tTGVmdCxcbiAgICAgICAgICAgICAgICBIZXhhZ29uLkNvcm5lcnMuVG9wTGVmdFxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5Cb3R0b21SaWdodDpcbiAgICAgICAgICAgIHJlc3VsdCA9IFtcbiAgICAgICAgICAgICAgICBIZXhhZ29uLkNvcm5lcnMuTGVmdCxcbiAgICAgICAgICAgICAgICBIZXhhZ29uLkNvcm5lcnMuVG9wUmlnaHRcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuQm90dG9tTGVmdDpcbiAgICAgICAgICAgIHJlc3VsdCA9IFtcbiAgICAgICAgICAgICAgICBIZXhhZ29uLkNvcm5lcnMuUmlnaHQsXG4gICAgICAgICAgICAgICAgSGV4YWdvbi5Db3JuZXJzLlRvcExlZnRcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuTGVmdDpcbiAgICAgICAgICAgIHJlc3VsdCA9IFtcbiAgICAgICAgICAgICAgICBIZXhhZ29uLkNvcm5lcnMuQm90dG9tUmlnaHQsXG4gICAgICAgICAgICAgICAgSGV4YWdvbi5Db3JuZXJzLlRvcFJpZ2h0XG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHN0YXJ0IGNvcm5lciBcIiArIHN0YXJ0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuSGV4YWdvbi5TaWRlcyA9IHtcbiAgICBUb3A6IG5ldyBTaWRlKFwidG9wXCIsIEhleGFnb24uQ29ybmVycy5Ub3BMZWZ0LCBIZXhhZ29uLkNvcm5lcnMuVG9wUmlnaHQpLFxuICAgIFRvcFJpZ2h0OiBuZXcgU2lkZShcInRvcCByaWdodFwiLCBIZXhhZ29uLkNvcm5lcnMuVG9wUmlnaHQsIEhleGFnb24uQ29ybmVycy5SaWdodCksXG4gICAgQm90dG9tUmlnaHQ6IG5ldyBTaWRlKFwiYm90dG9tIHJpZ2h0XCIsIEhleGFnb24uQ29ybmVycy5SaWdodCwgSGV4YWdvbi5Db3JuZXJzLkJvdHRvbVJpZ2h0KSxcbiAgICBCb3R0b206IG5ldyBTaWRlKFwiYm90dG9tXCIsIEhleGFnb24uQ29ybmVycy5Cb3R0b21SaWdodCwgSGV4YWdvbi5Db3JuZXJzLkJvdHRvbUxlZnQpLFxuICAgIEJvdHRvbUxlZnQ6IG5ldyBTaWRlKFwiYm90dG9tIGxlZnRcIiwgSGV4YWdvbi5Db3JuZXJzLkJvdHRvbUxlZnQsIEhleGFnb24uQ29ybmVycy5MZWZ0KSxcbiAgICBUb3BMZWZ0OiBuZXcgU2lkZShcInRvcCBsZWZ0XCIsIEhleGFnb24uQ29ybmVycy5MZWZ0LCBIZXhhZ29uLkNvcm5lcnMuVG9wTGVmdCksXG59O1xuXG5IZXhhZ29uLlNpZGVzLmFsbCA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgIEhleGFnb24uU2lkZXMuVG9wLFxuICAgICAgICBIZXhhZ29uLlNpZGVzLlRvcFJpZ2h0LFxuICAgICAgICBIZXhhZ29uLlNpZGVzLkJvdHRvbVJpZ2h0LFxuICAgICAgICBIZXhhZ29uLlNpZGVzLkJvdHRvbSxcbiAgICAgICAgSGV4YWdvbi5TaWRlcy5Cb3R0b21MZWZ0LFxuICAgICAgICBIZXhhZ29uLlNpZGVzLlRvcExlZnRcbiAgICBdO1xufVxuXG5IZXhhZ29uLlNpZGVzLm5leHQgPSBmdW5jdGlvbihzdGFydCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBzd2l0Y2ggKHN0YXJ0KSB7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Ub3A6XG4gICAgICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLlRvcFJpZ2h0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Ub3BSaWdodDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLlNpZGVzLkJvdHRvbVJpZ2h0OlxuICAgICAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5TaWRlcy5Cb3R0b207XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLlNpZGVzLkJvdHRvbTpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuQm90dG9tTGVmdDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tTGVmdDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuVG9wTGVmdDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wTGVmdDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuVG9wO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHN0YXJ0IHNpZGUgXCIgKyBzdGFydCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkhleGFnb24uU2lkZXMub3Bwb3NpdGUgPSBmdW5jdGlvbihzdGFydCkge1xuICAgIHZhciByZXN1bHQ7XG5cbiAgICBzd2l0Y2ggKHN0YXJ0KSB7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Ub3A6XG4gICAgICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLkJvdHRvbTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wUmlnaHQ6XG4gICAgICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLkJvdHRvbUxlZnQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLlNpZGVzLkJvdHRvbVJpZ2h0OlxuICAgICAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5TaWRlcy5Ub3BMZWZ0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Cb3R0b206XG4gICAgICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLlRvcDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tTGVmdDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuVG9wUmlnaHQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLlNpZGVzLlRvcExlZnQ6XG4gICAgICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLkJvdHRvbVJpZ2h0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHN0YXJ0IHNpZGUgXCIgKyBzdGFydCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkhleGFnb24uU2lkZXMuZnJvbUNvcm5lciA9IGZ1bmN0aW9uKHN0YXJ0KSB7XG4gICAgdmFyIHJlc3VsdDtcblxuICAgIHN3aXRjaCAoc3RhcnQpIHtcbiAgICAgICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuVG9wTGVmdDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuVG9wO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLlRvcFJpZ2h0OlxuICAgICAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5TaWRlcy5Ub3BSaWdodDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5SaWdodDpcbiAgICAgICAgICAgIHJlc3VsdCA9IEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuQm90dG9tUmlnaHQ6XG4gICAgICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLkJvdHRvbTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5Cb3R0b21MZWZ0OlxuICAgICAgICAgICAgcmVzdWx0ID0gSGV4YWdvbi5TaWRlcy5Cb3R0b21MZWZ0O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLkxlZnQ6XG4gICAgICAgICAgICByZXN1bHQgPSBIZXhhZ29uLlNpZGVzLlRvcExlZnQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gc3RhcnQgc2lkZSBcIiArIHN0YXJ0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuSGV4YWdvbi5wcm90b3R5cGUuZ2V0TGluZVRocm91Z2hNaWRkbGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGluZSxcbiAgICAgICAgaGV4YWdvbiA9IHRoaXM7XG5cbiAgICB0aGlzLmNvcm5lclBvaW50cygpLnNsaWNlKDAsIDIpLnNvbWUoZnVuY3Rpb24gZmluZFR3b09wcG9zaW5nQ29ybmVycyhjb3JuZXJQb2ludCkge1xuICAgICAgICB2YXIgb3Bwb3NpdGVDb3JuZXIgPSAoICEhIGNvcm5lclBvaW50KSAmJiBIZXhhZ29uLkNvcm5lcnMub3Bwb3NpdGUoY29ybmVyUG9pbnQuY29ybmVyKSxcbiAgICAgICAgICAgIG9wcG9zaXRlQ29ybmVyUG9pbnQgPSAoICEhIG9wcG9zaXRlQ29ybmVyKSAmJiBoZXhhZ29uLmdldENvcm5lclBvaW50KG9wcG9zaXRlQ29ybmVyKTtcblxuICAgICAgICBsaW5lID0gb3Bwb3NpdGVDb3JuZXJQb2ludCAmJiBuZXcgTGluZShjb3JuZXJQb2ludC5wb2ludCwgb3Bwb3NpdGVDb3JuZXJQb2ludC5wb2ludCk7XG5cbiAgICAgICAgaWYgKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGxpbmUgfHwgbnVsbDtcbn1cblxuSGV4YWdvbi5wcm90b3R5cGUuZ2V0Q2VudGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxpbmVUaHJvdWdoTWlkZGxlID0gdGhpcy5nZXRMaW5lVGhyb3VnaE1pZGRsZSgpLFxuICAgICAgICBjZW50ZXIgPSBsaW5lVGhyb3VnaE1pZGRsZSAmJiBsaW5lVGhyb3VnaE1pZGRsZS5jZW50ZXIoKTtcblxuICAgIHJldHVybiBjZW50ZXIgfHwgbnVsbDtcbn07XG5cbkhleGFnb24ucHJvdG90eXBlLmdldENhY2hlS2V5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGNlbnRlciA9IHRoaXMuZ2V0Q2VudGVyKCksXG4gICAgICAgIGNlbnRlckNhY2hlS2V5ID0gY2VudGVyICYmIGNlbnRlci5jYWNoZUtleTtcblxuICAgIHJldHVybiBjZW50ZXJDYWNoZUtleSB8fCBudWxsO1xufTtcblxuSGV4YWdvbi5wcm90b3R5cGUuY29ybmVyQ291bnQgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBUT0RPOiBnZXQgYSBsaWJyYXJ5IHRoYXQgaGFzIC5jb3VudCgpXG4gICAgdmFyIGNvdW50ID0gdGhpcy5jb3JuZXJQb2ludHMoKS5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY29ybmVyUG9pbnQpIHtcbiAgICAgICAgcmV0dXJuIHByZXYgKyAoKCAhISBjb3JuZXJQb2ludCkgPyAxIDogMCk7XG4gICAgfSwgMCk7XG5cbiAgICByZXR1cm4gY291bnQ7XG59O1xuXG5IZXhhZ29uLnByb3RvdHlwZS5pc0NvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuY29ybmVyQ291bnQoKSA9PT0gTlVNQkVSX09GX1NJREVTO1xufTtcblxuSGV4YWdvbi5wcm90b3R5cGUuY29ybmVyUG9pbnRzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFt0aGlzLnBvaW50cy50b3BMZWZ0LCB0aGlzLnBvaW50cy50b3BSaWdodCwgdGhpcy5wb2ludHMucmlnaHQsIHRoaXMucG9pbnRzLmJvdHRvbVJpZ2h0LCB0aGlzLnBvaW50cy5ib3R0b21MZWZ0LCB0aGlzLnBvaW50cy5sZWZ0XTtcbn07XG5cbkhleGFnb24ucHJvdG90eXBlLmdldENvcm5lclBvaW50ID0gZnVuY3Rpb24oY29ybmVyKSB7XG4gICAgdmFyIHJlc3VsdCA9IG51bGw7XG5cbiAgICB0aGlzLmNvcm5lclBvaW50cygpLnNvbWUoZnVuY3Rpb24oY29ybmVyUG9pbnQpIHtcbiAgICAgICAgLy8gVE9ETzogZml4IGVxdWFsaXR5IGNoZWNrXG4gICAgICAgIGlmIChjb3JuZXJQb2ludC5jb3JuZXIucm90YXRpb24gPT09IGNvcm5lci5yb3RhdGlvbikge1xuICAgICAgICAgICAgcmVzdWx0ID0gY29ybmVyUG9pbnQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5IZXhhZ29uLnByb3RvdHlwZS5zZXRDb3JuZXJQb2ludCA9IGZ1bmN0aW9uKGNvcm5lciwgcG9pbnQpIHtcbiAgICB2YXIgY29ybmVyUG9pbnQgPSBuZXcgQ29ybmVyUG9pbnQoY29ybmVyLCBwb2ludCk7XG5cbiAgICBzd2l0Y2ggKGNvcm5lcikge1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5Ub3BMZWZ0OlxuICAgICAgICAgICAgdGhpcy5wb2ludHMudG9wTGVmdCA9IGNvcm5lclBvaW50O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLlRvcFJpZ2h0OlxuICAgICAgICAgICAgdGhpcy5wb2ludHMudG9wUmlnaHQgPSBjb3JuZXJQb2ludDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uQ29ybmVycy5SaWdodDpcbiAgICAgICAgICAgIHRoaXMucG9pbnRzLnJpZ2h0ID0gY29ybmVyUG9pbnQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuQm90dG9tUmlnaHQ6XG4gICAgICAgICAgICB0aGlzLnBvaW50cy5ib3R0b21SaWdodCA9IGNvcm5lclBvaW50O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5Db3JuZXJzLkJvdHRvbUxlZnQ6XG4gICAgICAgICAgICB0aGlzLnBvaW50cy5ib3R0b21MZWZ0ID0gY29ybmVyUG9pbnQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLkNvcm5lcnMuTGVmdDpcbiAgICAgICAgICAgIHRoaXMucG9pbnRzLmxlZnQgPSBjb3JuZXJQb2ludDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5rbm93biBjb3JuZXIgXCIgKyBjb3JuZXIpO1xuICAgIH1cbn07XG5cbkhleGFnb24ucHJvdG90eXBlLnNpZGVDb3VudCA9IGZ1bmN0aW9uKCkge1xuICAgIC8vIFRPRE86IGdldCBhIGxpYnJhcnkgdGhhdCBoYXMgLmNvdW50KClcbiAgICB2YXIgY291bnQgPSB0aGlzLnNpZGVMaW5lcygpLnJlZHVjZShmdW5jdGlvbihwcmV2LCBzaWRlTGluZSkge1xuICAgICAgICByZXR1cm4gcHJldiArIChzaWRlTGluZSA9PT0gdW5kZWZpbmVkID8gMCA6IDEpO1xuICAgIH0sIDApO1xuXG4gICAgcmV0dXJuIGNvdW50O1xufTtcblxuSGV4YWdvbi5wcm90b3R5cGUuc2lkZUxpbmVzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFt0aGlzLmxpbmVzLnRvcCwgdGhpcy5saW5lcy50b3BSaWdodCwgdGhpcy5saW5lcy5ib3R0b21SaWdodCwgdGhpcy5saW5lcy5ib3R0b20sIHRoaXMubGluZXMuYm90dG9tTGVmdCwgdGhpcy5saW5lcy50b3BMZWZ0XTtcbn07XG5cbkhleGFnb24ucHJvdG90eXBlLmdldFNpZGVMaW5lID0gZnVuY3Rpb24oc2lkZSkge1xuICAgIHZhciByZXN1bHQgPSBudWxsO1xuXG4gICAgdGhpcy5zaWRlTGluZXMoKS5zb21lKGZ1bmN0aW9uKHNpZGVMaW5lKSB7XG4gICAgICAgIC8vIFRPRE86IGZpeCBlcXVhbGl0eSBjaGVja1xuICAgICAgICBpZiAoc2lkZUxpbmUuc2lkZS5nZXRSb3RhdGlvbigpID09PSBzaWRlLmdldFJvdGF0aW9uKCkpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHNpZGVMaW5lO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuSGV4YWdvbi5wcm90b3R5cGUuc2V0U2lkZUxpbmUgPSBmdW5jdGlvbihzaWRlLCBsaW5lKSB7XG4gICAgdmFyIHNpZGVMaW5lID0gbmV3IFNpZGVMaW5lKHNpZGUsIGxpbmUpO1xuXG4gICAgc3dpdGNoIChzaWRlKSB7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Ub3A6XG4gICAgICAgICAgICB0aGlzLmxpbmVzLnRvcCA9IHNpZGVMaW5lO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSGV4YWdvbi5TaWRlcy5Ub3BSaWdodDpcbiAgICAgICAgICAgIHRoaXMubGluZXMudG9wUmlnaHQgPSBzaWRlTGluZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuQm90dG9tUmlnaHQ6XG4gICAgICAgICAgICB0aGlzLmxpbmVzLmJvdHRvbVJpZ2h0ID0gc2lkZUxpbmU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLlNpZGVzLkJvdHRvbTpcbiAgICAgICAgICAgIHRoaXMubGluZXMuYm90dG9tID0gc2lkZUxpbmU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBIZXhhZ29uLlNpZGVzLkJvdHRvbUxlZnQ6XG4gICAgICAgICAgICB0aGlzLmxpbmVzLmJvdHRvbUxlZnQgPSBzaWRlTGluZTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEhleGFnb24uU2lkZXMuVG9wTGVmdDpcbiAgICAgICAgICAgIHRoaXMubGluZXMudG9wTGVmdCA9IHNpZGVMaW5lO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmtub3duIHNpZGUgXCIgKyBzaWRlKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhleGFnb247IiwidmFyIFBvaW50ID0gcmVxdWlyZShcIi4vcG9pbnQuanNcIik7XG5cbmZ1bmN0aW9uIExpbmUoc3RhcnQsIGVuZCkge1xuICAgIHRoaXMuc3RhcnQgPSBzdGFydDtcbiAgICB0aGlzLmVuZCA9IGVuZDtcbiAgICB0aGlzLmNhY2hlS2V5ID0gdGhpcy5fZ2V0Q2FjaGVLZXkoKTtcbiAgICB0aGlzLl9fY2VudGVyID0gbnVsbDtcblxuICAgIHJldHVybiB0aGlzO1xufVxuXG5MaW5lLnByb3RvdHlwZS5fZ2V0Q2FjaGVLZXkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc3RhcnQgPSB0aGlzLnN0YXJ0LmNhY2hlS2V5LFxuICAgICAgICBlbmQgPSB0aGlzLmVuZC5jYWNoZUtleSxcbiAgICAgICAgcmVzdWx0O1xuXG4gICAgaWYgKHN0YXJ0IDwgZW5kKSB7XG4gICAgICAgIHJlc3VsdCA9IHN0YXJ0ICsgXCItXCIgKyBlbmQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0ID0gZW5kICsgXCItXCIgKyBzdGFydFxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5MaW5lLnByb3RvdHlwZS5fY2VudGVyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHggPSAodGhpcy5zdGFydC54ICsgdGhpcy5lbmQueCkgLyAyLFxuICAgICAgICB5ID0gKHRoaXMuc3RhcnQueSArIHRoaXMuZW5kLnkpIC8gMixcbiAgICAgICAgcmVzdWx0ID0gbmV3IFBvaW50KHgsIHkpO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbkxpbmUucHJvdG90eXBlLmNlbnRlciA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAodGhpcy5fX2NlbnRlciB8fCAodGhpcy5fX2NlbnRlciA9IHRoaXMuX2NlbnRlcigpKSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExpbmU7IiwiZnVuY3Rpb24gUG9pbnQoeCwgeSkge1xuICAgIHRoaXMueCA9IHg7XG4gICAgdGhpcy55ID0geTtcbiAgICB0aGlzLmNhY2hlS2V5ID0gdGhpcy5fZ2V0Q2FjaGVLZXkoKTtcblxuICAgIHJldHVybiB0aGlzO1xufVxuXG5Qb2ludC5wcm90b3R5cGUuX2dldENhY2hlS2V5ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHggPSB0aGlzLngudG9GaXhlZCgzKSxcbiAgICAgICAgeSA9IHRoaXMueS50b0ZpeGVkKDMpLFxuICAgICAgICByZXN1bHQgPSB4ICsgXCIsIFwiICsgeTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBvaW50OyIsImZ1bmN0aW9uIFNpZGUobmFtZSwgc3RhcnQsIGVuZCkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5zdGFydCA9IHN0YXJ0O1xuICAgIHRoaXMuZW5kID0gZW5kO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59XG5cblNpZGUucHJvdG90eXBlLmdldFJvdGF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN0YXJ0ID0gdGhpcy5zdGFydC5yb3RhdGlvbixcbiAgICAgICAgZW5kID0gdGhpcy5lbmQucm90YXRpb24sXG4gICAgICAgIHRlbXAsXG4gICAgICAgIHJvdGF0aW9uO1xuXG4gICAgaWYgKHN0YXJ0ID4gZW5kKSB7XG4gICAgICAgIHRlbXAgPSBzdGFydDtcbiAgICAgICAgc3RhcnQgPSBlbmQ7XG4gICAgICAgIGVuZCA9IHRlbXA7XG4gICAgfVxuXG4gICAgcm90YXRpb24gPSAoc3RhcnQgKyAoKGVuZCAtIHN0YXJ0KSAvIDIpKSAlIDM2MDtcblxuICAgIGlmICgoZW5kIC0gc3RhcnQpID4gMTgwKSB7XG4gICAgICAgIHJvdGF0aW9uICs9IDE4MDtcbiAgICB9XG5cbiAgICByZXR1cm4gcm90YXRpb247XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNpZGU7IiwiZnVuY3Rpb24gU2lkZUxpbmUoc2lkZSwgbGluZSkge1xuICAgIHRoaXMuc2lkZSA9IHNpZGU7XG4gICAgdGhpcy5saW5lID0gbGluZTtcblxuICAgIHJldHVybiB0aGlzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNpZGVMaW5lOyIsImZ1bmN0aW9uIGRlbGF5KGZuLCBtaWxsaXNlY29uZHMpIHtcbiAgICB2YXIgZGVsYXllciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoZm4uYmluZChudWxsKSwgbWlsbGlzZWNvbmRzKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIGRlbGF5ZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZGVsYXk7IiwidmFyIEJBU0UgPSAxMDtcblxuZnVuY3Rpb24gbGltaXRQcmVjaXNpb24obiwgZGVjaW1hbHMpIHtcbiAgICB2YXIgcG93ID0gTWF0aC5wb3coQkFTRSwgZGVjaW1hbHMpLFxuICAgICAgICByZXN1bHQgPSBNYXRoLnJvdW5kKG4gKiBwb3cpIC8gcG93O1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBsaW1pdFByZWNpc2lvbjsiLCJ2YXIgb25jZSA9IHJlcXVpcmUoXCIuL29uY2UuanNcIik7XG5cbmZ1bmN0aW9uIG1vdXNlRGV0ZWN0b3IoZm4pIHtcbiAgICAvLyBFeHBlcmltZW50YWwgY29kZSB0byBkZXRlY3QgaWYgYSBtb3VzZSBwb2ludGluZyBkZXZpY2UgaXMgdXNlZC5cbiAgICAvLyBJZiBhIG1vdXNlIGlzIGRldGVjdGVkLCBjYWxsIHRoZSBzdXBwbGllZCBmdW5jdGlvbiBvbmNlLlxuICAgIHZhciBvblRvdWNoTW92ZUV2ZW50QXJncyA9IHtcbiAgICAgICAgICAgIHRhcmdldDogbnVsbCxcbiAgICAgICAgfSxcbiAgICAgICAgb25Ub3VjaE1vdmUgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBvblRvdWNoTW92ZUV2ZW50QXJncy50YXJnZXQgPSBlLnRhcmdldDtcbiAgICAgICAgfSxcbiAgICAgICAgb25Nb3VzZU1vdmUgPSBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAvLyBJZiB0aGUgdGFyZ2V0IGlzbid0IHRoZSBzYW1lLCB0aGUgYXNzdW1wdGlvbiBpcyB0aGF0IHRoZSB0b3VjaG1vdmUgZXZlbnQgd2Fzbid0IGZpcmVkIGZpcnN0IC0gaGVuY2UgaXQncyBub3QgYSB0b3VjaCBldmVudC5cbiAgICAgICAgICAgIC8vIFRPRE86IHdvdWxkIGJlIGJldHRlciB0byB1c2UgdGhlIG1vdXNlIGV2ZW50IC54IGFuZCAueSwgaWYgbWF0Y2hpbmcgb25lcyBleGlzdCBpbiB0b3VjaG1vdmUgZXRjZXRlcmEuXG4gICAgICAgICAgICBpZiAob25Ub3VjaE1vdmVFdmVudEFyZ3MudGFyZ2V0ICE9PSBlLnRhcmdldCkge1xuICAgICAgICAgICAgICAgIG9uRGV0ZWN0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlbGVhc2UgcG9pbnRlclxuICAgICAgICAgICAgb25Ub3VjaE1vdmVFdmVudEFyZ3MudGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgfSxcbiAgICAgICAgb25EZXRlY3QgPSBvbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLCBvblRvdWNoTW92ZSk7XG4gICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIG9uTW91c2VNb3ZlKTtcbiAgICAgICAgICAgIGZuLmNhbGwobnVsbCk7XG4gICAgICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcInRvdWNobW92ZVwiLCBvblRvdWNoTW92ZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBvbk1vdXNlTW92ZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbW91c2VEZXRlY3RvcjsiLCJmdW5jdGlvbiBvbmNlKGZuKSB7XG4gICAgdmFyIGhhc1J1biA9IGZhbHNlLFxuICAgICAgICBydW5PbmNlQ2hlY2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICghaGFzUnVuKSB7XG4gICAgICAgICAgICAgICAgaGFzUnVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBmbi5jYWxsKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgcmV0dXJuIHJ1bk9uY2VDaGVjaztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBvbmNlOyIsImZ1bmN0aW9uIG9uZUF0QVRpbWVQbGVhc2UoZm4pIHtcbiAgICB2YXIgcnVubmluZyA9IGZhbHNlLFxuICAgICAgICB3cmFwcGVyID0gZnVuY3Rpb24gb25lQXRBVGltZVBsZWFzZVdyYXBwZXIoKSB7XG4gICAgICAgICAgICBpZiAocnVubmluZykge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJ1bm5pbmcgPSB0cnVlO1xuXG4gICAgICAgICAgICBmbi5jYWxsKG51bGwpO1xuXG4gICAgICAgICAgICBydW5uaW5nID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgIHJldHVybiB3cmFwcGVyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG9uZUF0QVRpbWVQbGVhc2U7IiwiZnVuY3Rpb24gd3JhcChuYW1lLCBmbikge1xuICAgIHZhciB3cmFwcGVkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZXN1bHQ7XG5cbiAgICAgICAgY29uc29sZSAmJiBjb25zb2xlLnRpbWVsaW5lICYmIGNvbnNvbGUudGltZWxpbmUobmFtZSk7XG4gICAgICAgIGNvbnNvbGUgJiYgY29uc29sZS5wcm9maWxlICYmIGNvbnNvbGUucHJvZmlsZShuYW1lKTtcblxuICAgICAgICByZXN1bHQgPSBmbi5jYWxsKG51bGwpO1xuXG4gICAgICAgIGNvbnNvbGUgJiYgY29uc29sZS50aW1lbGluZUVuZCAmJiBjb25zb2xlLnRpbWVsaW5lRW5kKCk7XG4gICAgICAgIGNvbnNvbGUgJiYgY29uc29sZS5wcm9maWxlRW5kICYmIGNvbnNvbGUucHJvZmlsZUVuZCgpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHdyYXBwZWQ7XG59XG5cbnZhciBhcGkgPSB7XG4gICAgd3JhcDogd3JhcFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFwaTsiLCJmdW5jdGlvbiBmbG9hdGluZ1BvaW50KGZyb20sIHRvKSB7XG4gICAgaWYgKHRvID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdG8gPSBmcm9tO1xuICAgICAgICBmcm9tID0gMDtcbiAgICB9XG5cbiAgICB2YXIgcm5kID0gTWF0aC5yYW5kb20oKSxcbiAgICAgICAgcmVzdWx0ID0gZnJvbSArIChybmQgKiB0byk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpbnRlZ2VyKGZyb20sIHRvKSB7XG4gICAgdmFyIGZwID0gZmxvYXRpbmdQb2ludChmcm9tLCB0byksXG4gICAgICAgIHJlc3VsdCA9IE1hdGguZmxvb3IoZnApO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxudmFyIGFwaSA9IHtcbiAgICBmbG9hdGluZ1BvaW50OiBmbG9hdGluZ1BvaW50LFxuICAgIGludGVnZXI6IGludGVnZXJcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBhcGk7IiwiZnVuY3Rpb24gcmVzaXplRGV0ZWN0b3IoZWxlbWVudCwgZm4pIHtcbiAgICAvLyBDdXJyZW50bHkgbm90IGNoZWNraW5nIGZvciBoZWlnaHQgY2hhbmdlcyBiZWNhdXNlIHRoYXQgd291bGRcbiAgICAvLyByZXNldCB0aGUgZWxlbWVudCBldmVyeSB0aW1lIHRoZSBkZXZlbG9wZXIgY29uc29sZSB3YXMgdG9nZ2xlZC5cblxuICAgIC8vIENocm9tZSBvbiBBbmRyb2lkIGFsc28gdHJpZ2dlcnMgYSByZXNpemUgd2hlbiBzY3JvbGxpbmcgZW5vdWdoIHRvXG4gICAgLy8gaGlkZSB0aGUgYWRkcmVzcyBiYXIgYW5kIG1lbnUuXG5cbiAgICAvLyBUT0RPOiByZWFkIHRoaXMgdmFsdWUgb25jZSBhZnRlciBlbGVtZW50IGhhcyBiZWVuIGRyYXduLCBvdGhlcndpc2UgdGhlIGZpcnN0XG4gICAgLy8gcmVzaXplLCBldmVuIGlmIGluIGhlaWdodCwgd2lsbCB0cmlnZ2VyIHRoZSBkcmF3aW5nLlxuICAgIHZhciBwcmV2aW91c0VsZW1lbnRXaWR0aCA9IDA7XG5cbiAgICAvLyBUT0RPOiByZW1vdmUgbGlzdGVuZXI/XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgZnVuY3Rpb24gb25SZXNpemVFdmVudExpc3RlbmVyKCkge1xuICAgICAgICBpZiAoIWVsZW1lbnQpIHtcbiAgICAgICAgICAgIGZuLmNhbGwobnVsbCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJldmlvdXNFbGVtZW50V2lkdGggIT09IGVsZW1lbnQuc2Nyb2xsV2lkdGgpIHtcbiAgICAgICAgICAgIHByZXZpb3VzRWxlbWVudFdpZHRoID0gZWxlbWVudC5zY3JvbGxXaWR0aDtcblxuICAgICAgICAgICAgZm4uY2FsbChudWxsKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlc2l6ZURldGVjdG9yOyJdfQ==
