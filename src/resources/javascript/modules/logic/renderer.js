function renderer(canvasId, canvasArea, lines) {
    var random = require("../utils/random.js"),
        Hexagon = require("../proxied/hexagon.js");

    // TODO: use hidpi-canvas-polyfill
    // https://github.com/jondavidjohn/hidpi-canvas-polyfill
    var canvasElement = document.getElementById(canvasId);
    canvasElement.width = canvasArea.x;
    canvasElement.height = canvasArea.y;

    var canvas = oCanvas.create({
        canvas: "#" + canvasId
    }),
        graphicsLookupCache = {};

    function getDefaultStrokeWidth() {
        // TODO: move to options object
        return 10;
        // return random.integer(1, 10);
    }

    function getDefaultStrokeColor() {
        // TODO: move to options object
        // return "rgba(0, 0, 0, 0.01)";
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

    function fire(name, graphic, object) {
        // TODO: custom event structure
        var event = document.createEvent('HTMLEvents');
        event.initEvent('hexagonif.' + name, true, true);
        event.graphic = graphic;
        event.object = object;
        return canvasElement.dispatchEvent(event);
    }

    function onLineMouseEnter(event) {
        lineHighlight.call(this);
    }

    function onLineMouseLeave(event) {
        lineUnhighlight.call(this);
    }

    function lineReset() {
        var lineEvent = fire("line.reset", this, this.tag);

        if (lineEvent.defaultPrevented) {
            return;
        }

        this.strokeColor = getDefaultStrokeColor();
        this.zIndex = "back";
        this.redraw();
    }

    function lineHighlight() {
        var lineEvent = fire("line.highlight", this, this.tag);

        if (lineEvent.defaultPrevented) {
            return;
        }

        this.strokeColor = getColorByLocation(this.x, this.y, true);
        this.zIndex = "front";
        this.redraw();
    }

    function lineUnhighlight(event) {
        var lineEvent = fire("line.unhighlight", this, this.tag);

        if (lineEvent.defaultPrevented) {
            return;
        }

        this.strokeColor = getColorByLocation(this.x, this.y, false);
        this.redraw();
    }

    function draw(scene, start, end, tag) {
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
            .bind("mouseenter", onLineMouseEnter)
            .bind("mouseleave", onLineMouseLeave);

        return line;
    }

    var sceneGrid = "grid";

    canvas.scenes.create(sceneGrid, function canvasScenesCreate() {
        var scene = this;

        // Object.keys(nodes).sort().reduce(function(start, end) {
        //     draw(scene, nodes[start], nodes[end], node);

        //     return end;
        // });

        Object.keys(lines).forEach(function linesForEachCreateGraphic(cacheKey) {
            var line = lines[cacheKey];

            var graphic = draw(scene, line.start, line.end, line);

            graphicsLookupCache[cacheKey] = graphic;
        });
    });

    canvas.scenes.load(sceneGrid);

    function highlightLine(line) {
        var cacheKey = line.getCacheKey(),
            selected = graphicsLookupCache[cacheKey];

        lineHighlight.call(selected);
    }

    function resetLine(line) {
        var cacheKey = line.getCacheKey(),
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
        var cacheKey = line.getCacheKey(),
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