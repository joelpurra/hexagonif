var Point = require("../objects/point.js"),
    Line = require("../objects/line.js"),
    Hexagon = require("../objects/hexagon.js"),
    limitPrecision = require("../utils/limit-precision.js"),
    random = require("../utils/random.js"),

    maxDepth = 500;

function generateGraph(area, hexagons, nodes, lines, hexagonSideLength, startPoint, startCorner, depth) {
    function getOrGenerateHexagon(startPoint, startCorner, depth) {
        if (depth > maxDepth) {
            throw new Error("The max grapher depth of " + maxDepth + " was reached.");
        }

        if ((startPoint.x < 0 - hexagonSideLength) || (startPoint.x > area.x + hexagonSideLength) || (startPoint.y < 0 - hexagonSideLength) || (startPoint.y > area.y + hexagonSideLength)) {
            return null;
        }

        var hexagon = new Hexagon();

        var point = startPoint,
            corner = startCorner;

        do {
            // Points and corners
            {
                var pointCacheKey = point.cacheKey,
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

                var lineCacheKey = line.cacheKey,
                    cachedLine = lines[lineCacheKey];

                if (cachedLine === undefined) {
                    lines[lineCacheKey] = line;
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
                cachedHexagon = hexagons[hexagonCacheKey];

            if (cachedHexagon !== undefined) {
                if (cachedHexagon.isComplete()) {
                    return cachedHexagon;
                }

                hexagon = cachedHexagon;
            } else {
                hexagons[hexagonCacheKey] = hexagon;
            }

            // Wrote out .forEach loops over arrays to avoid too many function calls on the stack.
            // Makes debugging the stack prettier, if nothing else.
            {
                var cornerPoints = hexagon.cornerPoints();

                for (var i = 0; i < cornerPoints.length; i++) {
                    var cornerPoint = cornerPoints[i],
                        connecting = Hexagon.Corners.connecting(cornerPoint.corner);

                    for (var j = 0; j < connecting.length; j++) {
                        var connected = connecting[j];

                        getOrGenerateHexagon(cornerPoint.point, connected, depth + 1);
                    }
                }
            }
        }

        return hexagon;
    }

    var graph = getOrGenerateHexagon(startPoint, startCorner, depth);

    return graph;
}

function grapher(canvasArea, hexagonSideLength) {
    var hexagons = {},
        nodes = {},
        lines = {},
        startInCanvas = new Point(random.integer(canvasArea.x), random.integer(canvasArea.y))
        graph = generateGraph(canvasArea, hexagons, nodes, lines, hexagonSideLength, startInCanvas, Hexagon.Corners.BottomLeft, 0),
        api = {
            hexagons: hexagons,
            nodes: nodes,
            lines: lines,
            graph: graph,
        };

    return api;
}

module.exports = grapher;