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

    var linePrototype = canvas.display.line({
        cap: "round",
        strokeWidth: random.integer(1, 10),
        strokeColor: "rgba(0, 0, 0, 0.1)",
    });

    function lineHighlight(event) {
        this.strokeColor = "rgba(255, 0, 0, 0.7)";
        this.zIndex = "front";
        this.redraw();
    }

    function lineUnhighlight(event) {
        this.strokeColor = "rgba(255, 0, 0, 0.3)";
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