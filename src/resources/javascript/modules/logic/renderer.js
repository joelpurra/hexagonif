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