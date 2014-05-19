var Point = require("../objects/point.js"),
    Line = require("../objects/line.js"),
    Hexagon = require("../objects/hexagon.js"),
    limitPrecision = require("../utils/limit-precision.js"),
    random = require("../utils/random.js");

function grapher(canvasArea, hexagonSideLength) {
    var countdown = 1000;

    function getOrGenerateHexagon(area, hexagons, nodes, lines, hexagonSideLength, startPoint, startCorner, depth) {
        if (depth > countdown) {
            // || !countdown
            return null
        }
        // countdown--;

        if ((startPoint.x < 0 - hexagonSideLength) || (startPoint.x > canvasArea.x + hexagonSideLength) || (startPoint.y < 0 - hexagonSideLength) || (startPoint.y > canvasArea.y + hexagonSideLength)) {
            return null;
        }

        var hexagon = new Hexagon();

        var point = startPoint,
            corner = startCorner;

        do {
            // Points and corners
            {
                var pointCacheKey = point.getCacheKey(),
                    cachedPoint = nodes[pointCacheKey];

                if (cachedPoint === undefined) {
                    nodes[pointCacheKey] = point;
                } else {
                    point = cachedPoint;
                }

                hexagon.setCornerPoint(corner, point);

                var nextCorner = Hexagon.Corners.next(corner);
                var angle = (nextCorner.rotation / 180) * Math.PI;
                var x = limitPrecision(point.x + hexagonSideLength * Math.cos(angle), 5),
                    y = limitPrecision(point.y + hexagonSideLength * Math.sin(angle), 5);
                var nextPoint = new Point(x, y);
            }

            // Lines and sides
            {
                var line = new Line(point, nextPoint);

                var lineCacheKey = line.getCacheKey(),
                    cachedLine = lines[lineCacheKey];

                if (cachedLine === undefined) {
                    lines[lineCacheKey] = line;
                } else {
                    //throw new Error("Line already exists " + line.getCacheKey())
                    line = cachedLine;
                }

                var side = Hexagon.Sides.fromCorner(corner);

                hexagon.setSideLine(side, line);
            }

            point = nextPoint;
            corner = nextCorner;

            // TODO: fix equality check
        } while (corner.rotation !== startCorner.rotation)


        // TODO: base cache key on location index, so this check can be done much earlier
        var hexagonCacheKey = hexagon.getCacheKey(),
            cachedHexagon = hexagons[hexagonCacheKey];

        if (cachedHexagon !== undefined) {
            if (cachedHexagon.isComplete()) {
                return cachedHexagon;
            }

            hexagon = cachedHexagon;
        } else {
            hexagons[hexagonCacheKey] = hexagon;
        }

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
        startInCanvas = new Point(random.integer(canvasArea.x), random.integer(canvasArea.y))
        graph = getOrGenerateHexagon(canvasArea, hexagons, nodes, lines, hexagonSideLength, startInCanvas, Hexagon.Corners.BottomLeft, 0),
        api = {
            hexagons: hexagons,
            nodes: nodes,
            lines: lines,
            graph: graph,
        };

    return api;
}

module.exports = grapher;