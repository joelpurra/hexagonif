(function() {
    "use strict";

    var Point = require("./modules/point.js"),
        Line = require("./modules/line.js"),
        Hexagon = require("./modules/hexagon.js"),
        profiling = require("./modules/profiling.js");

    var BASE = 10;

    function renderer(canvasId, canvasArea, lines) {
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
            //stroke: "5px radial-gradient(center, center, 50% width, rgba(0,0,0,0.1), rgba(0,0,0,0.3))",
            stroke: "5px rgba(0,0,0,0.1)",
        });

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

        var sceneGrid = "grid";

        canvas.scenes.create(sceneGrid, function() {
            var scene = this;

            // Object.keys(nodes).sort().reduce(function(start, end) {
            //     draw(scene, nodes[start], nodes[end]);

            //     return end;
            // });

            Object.keys(lines).sort().forEach(function(cacheKey) {
                var line = lines[cacheKey];

                draw(scene, line.start, line.end);
            });
        });

        canvas.scenes.load(sceneGrid);
    }

    function grapher(canvasArea, hexagonSideLength) {
        function limitPrecision(n, decimals) {
            var pow = Math.pow(BASE, decimals),
                result = Math.round(n * pow) / pow;

            return result;
        }

        var countdown = 100;

        function getOrGenerateHexagon(area, hexagons, nodes, lines, hexagonSideLength, startPoint, startCorner, depth) {
            if (depth > countdown) {
                // || !countdown
                return null
            }
            // countdown--;

            var hexHash = startPoint.getCacheKey();

            if (hexagons[hexHash] !== undefined) {
                return hexagons[hexHash];
            }

            if (startPoint.x < 0 - hexagonSideLength || startPoint.x > canvasArea.x + hexagonSideLength || startPoint.y < 0 - hexagonSideLength || startPoint.y > canvasArea.y + hexagonSideLength) {
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
            graph = getOrGenerateHexagon(canvasArea, hexagons, nodes, lines, hexagonSideLength, new Point(300, 300), Hexagon.Corners.BottomLeft, 0);

        return lines;
    }

    function run() {
        var canvasArea = new Point(800, 1200),
            hexagonSideLength = 100,
            profiledGrapher = profiling.wrap("grapher", function() {
                return grapher(canvasArea, hexagonSideLength);
            }),
            lines = profiledGrapher(),
            profiledRenderer = profiling.wrap("renderer", function() {
                return renderer("hexagonif", canvasArea, lines);
            });

        profiledRenderer();
    }

    run();
}());