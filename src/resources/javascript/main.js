(function() {
    "use strict";

    // Based on http://ocanvas.org/demos/2

    // TODO: use hidpi-canvas-polyfill
    // https://github.com/jondavidjohn/hidpi-canvas-polyfill
    var canvasElement = document.getElementById("hexagonif");
    canvasElement.width = 800;
    canvasElement.height = 1200;

    var canvasArea = new Point(canvasElement.width, canvasElement.height);

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

    Point.prototype.getCacheKey = function() {
        var x = this.x.toFixed(20),
            y = this.y.toFixed(20),
            result = x + ", " + y;

        return result;
    };

    function Line(start, end) {
        this.start = start;
        this.end = end;

        return this;
    }

    Line.prototype.getCacheKey = function() {
        var start = this.start.getCacheKey(20),
            end = this.end.getCacheKey(20),
            result = start + "-" + end;

        return result;
    };

    var Corner = function(name, rotation) {
        this.name = name;
        this.rotation = rotation;

        return this;
    }

        function Hexagon(topLeft) {
            this.topLeft = topLeft || null;
            this.topRight = null;
            this.right = null;
            this.bottomRight = null;
            this.bottomLeft = null;
            this.left = null;
        }

    Hexagon.Corners = {
        TopLeft: new Corner("top left", 120),
        TopRight: new Corner("topRight", 60),
        Right: new Corner("right", 0),
        BottomRight: new Corner("bottom right", 300),
        BottomLeft: new Corner("bottom left", 240),
        Left: new Corner("left", 180)
    };

    Hexagon.Corners.next = function(start) {
        switch (start) {
            case Hexagon.Corners.TopLeft:
                return Hexagon.Corners.TopRight;

            case Hexagon.Corners.TopRight:
                return Hexagon.Corners.Right;

            case Hexagon.Corners.Right:
                return Hexagon.Corners.BottomRight;

            case Hexagon.Corners.BottomRight:
                return Hexagon.Corners.BottomLeft;

            case Hexagon.Corners.BottomLeft:
                return Hexagon.Corners.Left;

            case Hexagon.Corners.Left:
                return Hexagon.Corners.TopLeft;
        }

        throw new Error("Unknown start corner " + start);
    };

    Hexagon.prototype.getCacheKey = function() {
        return this.topLeft.getCacheKey();
    };

    Hexagon.prototype.nodes = function() {
        return [this.topLeft, this.topRight, this.right, this.bottomRight, this.bottomLeft, this.left];
    };

    Hexagon.prototype.setCornerPoint = function(corner, point) {
        switch (corner) {
            case Hexagon.Corners.TopLeft:
                this.topLeft = point;
                break;
            case Hexagon.Corners.TopRight:
                this.topRight = point;
                break;
            case Hexagon.Corners.Right:
                this.right = point;
                break;
            case Hexagon.Corners.BottomRight:
                this.bottomRight = point;
                break;
            case Hexagon.Corners.BottomLeft:
                this.bottomLeft = point;
                break;
            case Hexagon.Corners.Left:
                this.left = point;
                break;
            default:
                throw new Error("Unknown corner " + corner);
        }
    };

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

    function drawHexagonsLines(start, depth, area) {
        var angle,
            end;

        if (start.x > area.x || start.y > area.y) {
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

        drawHexagonsLines(end, depth + 1, area);
    }

    function getOrGenerateHexagon(area, hexagons, nodes, lines, side, startPoint, startCorner) {
        var hexHash = startPoint.getCacheKey();

        if (hexagons[hexHash] !== undefined) {
            return hexagons[hexHash];
        }

        var hexagon = new Hexagon();

        var point = startPoint,
            corner = startCorner;

        do {
            var cachedPoint = nodes[point.getCacheKey()];

            if (!cachedPoint) {
                nodes[point.getCacheKey()] = point;
            } else {
                point = cachedPoint;
            }

            hexagon.setCornerPoint(corner, point);

            var nextCorner = Hexagon.Corners.next(corner);
            var angle = ((nextCorner.rotation - startCorner.rotation) / 180) * Math.PI;
            var nextPoint = new Point(point.x + hexagonSideLength * Math.cos(angle), point.y + hexagonSideLength * Math.sin(angle));

            var line = new Line(point, nextPoint);

            var cachedLine = lines[line.getCacheKey()];

            if (!cachedLine) {
                lines[line.getCacheKey()] = line;
            } else {
                line = cachedLine;
            }

            point = nextPoint;
            corner = nextCorner;

            // TODO: fix equality check
        } while (corner.rotation !== startCorner.rotation)

        hexagons[hexHash] = hexagon;

        return hexagon;
    }

    var hexagons = [],
        nodes = [],
        lines = [],
        hexagon = getOrGenerateHexagon(canvasArea, hexagons, nodes, lines, hexagonSideLength, new Point(300, 300), Hexagon.Corners.TopLeft);

    console.log("hexagons", hexagons, "nodes", nodes, "lines", lines, "hexagon", hexagon);

    // Object.keys(nodes).sort().reduce(function(start, end) {
    //     draw(nodes[start], nodes[end]);

    //     return end;
    // });
    Object.keys(lines).sort().forEach(function(cacheKey) {
        var line = lines[cacheKey];

        draw(line.start, line.end);
    });

    // drawHexagonsLines(new Point(0, 0), 0, canvasArea);
    // drawHexagonsLines(new Point(hexagonSideLength - 45, -hexagonSideLength), 1, canvasArea);
}());