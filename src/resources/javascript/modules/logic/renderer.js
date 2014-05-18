function renderer(canvasId, canvasArea, lines) {
    var random = require("../utils/random.js");

    // TODO: use hidpi-canvas-polyfill
    // https://github.com/jondavidjohn/hidpi-canvas-polyfill
    var canvasElement = document.getElementById(canvasId);
    canvasElement.width = canvasArea.x;
    canvasElement.height = canvasArea.y;

    var canvas = oCanvas.create({
        canvas: "#" + canvasId
    });

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
        var byY = Math.floor((y / canvasArea.y) * 360),
            // TODO: move to options object
            opacity = highlight ? 0.7 : 0.3;

        return "hsla(" + byY + ", 100%, 50%, " + opacity.toFixed(3) + ")";
        // return "hsla(60, 100%, 50%, 0.3)";
    }

    var linePrototype = canvas.display.line({
        cap: "round",
        strokeWidth: getDefaultStrokeWidth(),
        strokeColor: getDefaultStrokeColor(),
    });

    function lineHighlight(event) {
        this.strokeColor = getColorByLocation(this.x, this.y, true);
        this.zIndex = "front";
        this.redraw();
    }

    function lineUnhighlight(event) {
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
            .bind("mouseenter", lineHighlight)
            .bind("mouseleave", lineUnhighlight);
    }

    var sceneGrid = "grid";

    canvas.scenes.create(sceneGrid, function() {
        var scene = this;

        // Object.keys(nodes).sort().reduce(function(start, end) {
        //     draw(scene, nodes[start], nodes[end], node);

        //     return end;
        // });

        Object.keys(lines).forEach(function(cacheKey) {
            var line = lines[cacheKey];

            draw(scene, line.start, line.end, line);
        });
    });

    canvas.scenes.load(sceneGrid);
}

module.exports = renderer;