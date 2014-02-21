(function() {
    "use strict";

    // Based on http://ocanvas.org/demos/2

    // TODO: use hidpi-canvas-polyfill
    // https://github.com/jondavidjohn/hidpi-canvas-polyfill
    var canvasElement = document.getElementById("hexagonif");
    canvasElement.width = 800;
    canvasElement.height = 1200;

    var canvas = oCanvas.create({
        canvas: "#hexagonif"
    });

    var hexagonSideLength = 100;

    var linePrototype = canvas.display.line({
        cap: "round",
        stroke: "5px radial-gradient(center, center, 50% width, rgba(0,0,0,0.1), rgba(0,0,0,0.3))",
    });

    function Point(x, y) {
        this.x = x;
        this.y = y;

        return this;
    }

    function draw(start, end) {
        var line = linePrototype.clone({
            start: {
                x: start.x,
                y: start.y
            },
            end: {
                x: end.x,
                y: end.y
            }
        });

        canvas.addChild(line);

        line
            .bind("mouseenter", function(event) {
                this.stroke = "10px #f0f";
                this.zIndex = "front";
                this.redraw();
            })
            .bind("mouseleave", function(event) {
                this.stroke = "5px #ff0";
                this.redraw();
            });
    }

    function drawHexagonsLines(start, depth, size) {
        var angle,
            end;

        if (start.x > size.x || start.y > size.y) {
            return;
        }

        if (depth % 2) {
            end = new Point(start.x + hexagonSideLength, start.y);

            angle = (120 / 180) * Math.PI;
            draw(start, new Point(start.x + hexagonSideLength * Math.cos(angle), start.y + hexagonSideLength * Math.sin(angle)));
        } else {
            angle = (60 / 180) * Math.PI;

            end = new Point(start.x + hexagonSideLength * Math.cos(angle), start.y + hexagonSideLength * Math.sin(angle));
        }

        draw(start, end);

        drawHexagonsLines(end, depth + 1, size);
    }

    var size = new Point(canvasElement.width, canvasElement.height);

    drawHexagonsLines(new Point(0, 0), 0, size);
    drawHexagonsLines(new Point(hexagonSideLength - 45, -hexagonSideLength), 1, size);
}());