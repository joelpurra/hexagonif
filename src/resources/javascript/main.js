(function() {
    "use strict";

    var BASE = 10;

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
        var x = this.x.toFixed(3),
            y = this.y.toFixed(3),
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
            result;

        if (start < end) {
            result = start + "-" + end;
        } else {
            result = end + "-" + start
        }

        return result;
    };

    function Corner(name, rotation) {
        this.name = name;
        this.rotation = rotation;

        return this;
    }

    function CornerPoint(corner, point) {
        this.corner = corner;
        this.point = point;

        return this;
    }

    function Hexagon() {
        this.topLeft = null;
        this.topRight = null;
        this.right = null;
        this.bottomRight = null;
        this.bottomLeft = null;
        this.left = null;
    }

    Hexagon.Corners = {
        TopLeft: new Corner("top left", 120),
        TopRight: new Corner("top right", 60),
        Right: new Corner("right", 0),
        BottomRight: new Corner("bottom right", 300),
        BottomLeft: new Corner("bottom left", 240),
        Left: new Corner("left", 180)
    };

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

    Hexagon.prototype.getCacheKey = function() {
        // TODO: return just the top left corner?
        return this.topLeft.getCacheKey();
    };

    Hexagon.prototype.cornerPoints = function() {
        return [this.topLeft, this.topRight, this.right, this.bottomRight, this.bottomLeft, this.left];
    };

    Hexagon.prototype.setCornerPoint = function(corner, point) {
        var cornerPoint = new CornerPoint(corner, point);

        switch (corner) {
            case Hexagon.Corners.TopLeft:
                this.topLeft = cornerPoint;
                break;
            case Hexagon.Corners.TopRight:
                this.topRight = cornerPoint;
                break;
            case Hexagon.Corners.Right:
                this.right = cornerPoint;
                break;
            case Hexagon.Corners.BottomRight:
                this.bottomRight = cornerPoint;
                break;
            case Hexagon.Corners.BottomLeft:
                this.bottomLeft = cornerPoint;
                break;
            case Hexagon.Corners.Left:
                this.left = cornerPoint;
                break;
            default:
                throw new Error("Unknown corner " + corner);
        }
    };

    function lineHighlight(event) {
        this.stroke = "10px #f0f";
        this.zIndex = "front";
        this.redraw();
    }

    function lineUnhighlight(event) {
        this.stroke = "5px #ff0";
        this.redraw();
    }

    function draw(scene, start, end) {
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

        scene.add(line);

        line
            .bind("mouseenter", lineHighlight)
            .bind("mouseleave", lineUnhighlight);
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

    function limitPrecision(n, decimals) {
        var pow = Math.pow(BASE, decimals),
            result = Math.round(n * pow) / pow;

        return result;
    }

    var countdown = 100;

    function getOrGenerateHexagon(area, hexagons, nodes, lines, hexagonSideLength, startPoint, startCorner, depth) {
        if (depth > countdown) {
            // || !countdown
            //console.log("END", "COUNTDOWN", area, hexagons, nodes, lines, hexagonSideLength, startPoint, startCorner)
            return null
        }
        // countdown--;

        //console.log("CON", "COUNTDOWN", area, hexagons, nodes, lines, hexagonSideLength, startPoint, startCorner)

        var hexHash = startPoint.getCacheKey();

        if (hexagons[hexHash] !== undefined) {
            //console.log("END", "HEX", area, hexagons, nodes, lines, hexagonSideLength, startPoint, startCorner)
            return hexagons[hexHash];
        }

        if (startPoint.x < 0 - hexagonSideLength || startPoint.x > canvasArea.x + hexagonSideLength || startPoint.y < 0 - hexagonSideLength || startPoint.y > canvasArea.y + hexagonSideLength) {
            //console.log("countdown", countdown, "startPoint", startPoint)
            return null;
        }

        var hexagon = new Hexagon();

        hexagons[hexHash] = hexagon;

        var point = startPoint,
            corner = startCorner;

        do {
            var cachedPoint = nodes[point.getCacheKey()];

            if (cachedPoint === undefined) {
                nodes[point.getCacheKey()] = point;
            } else {
                point = cachedPoint;
            }

            hexagon.setCornerPoint(corner, point);

            var nextCorner = Hexagon.Corners.next(corner);
            //var angle = ((nextCorner.rotation - startCorner.rotation) / 180) * Math.PI;
            var angle = (nextCorner.rotation / 180) * Math.PI;
            var x = limitPrecision(point.x + hexagonSideLength * Math.cos(angle), 5),
                y = limitPrecision(point.y + hexagonSideLength * Math.sin(angle), 5);
            var nextPoint = new Point(x, y);

            var line = new Line(point, nextPoint);

            var cachedLine = lines[line.getCacheKey()];

            if (cachedLine === undefined) {
                lines[line.getCacheKey()] = line;
            } else {
                //throw new Error("Line already exists " + line)
                //line = cachedLine;
            }

            point = nextPoint;
            corner = nextCorner;

            // TODO: fix equality check
        } while (corner.rotation !== startCorner.rotation)


        hexagon.cornerPoints().forEach(function(cornerPoint) {
            var connecting = Hexagon.Corners.connecting(cornerPoint.corner);

            connecting.forEach(function(connected) {
                getOrGenerateHexagon(area, hexagons, nodes, lines, hexagonSideLength, cornerPoint.point, connected, depth + 1);
            });
        });

        return hexagon;
    }

    var hexagons = [],
        nodes = [],
        lines = [],
        hexagon = getOrGenerateHexagon(canvasArea, hexagons, nodes, lines, hexagonSideLength, new Point(300, 300), Hexagon.Corners.BottomLeft, 0);

    //console.log("hexagons", hexagons, "nodes", nodes, "lines", lines, "hexagon", hexagon);

    var sceneGrid = "grid";

    canvas.scenes.create(sceneGrid, function() {
        var scene = this;
        // Object.keys(nodes).sort().reduce(function(start, end) {
        //     draw(nodes[start], nodes[end]);

        //     return end;
        // });
        Object.keys(lines).sort().forEach(function(cacheKey) {
            var line = lines[cacheKey];

            draw(scene, line.start, line.end);
        });
    });
    canvas.scenes.load(sceneGrid);

    // drawHexagonsLines(new Point(0, 0), 0, canvasArea);
    // drawHexagonsLines(new Point(hexagonSideLength - 45, -hexagonSideLength), 1, canvasArea);
}());