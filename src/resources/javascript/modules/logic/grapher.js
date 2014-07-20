var Point = require("../objects/point.js"),
    Line = require("../objects/line.js"),
    Hexagon = require("../objects/hexagon.js"),
    Gonif = require("../objects/gonif.js"),
    Area = require("../objects/area.js"),
    limitPrecision = require("../utils/limit-precision.js"),
    random = require("../utils/random.js");

function getOrGenerateHexagon(cache, hexagonSideLength, startPoint, startCorner) {
    var hexagon = new Hexagon();

    var point = startPoint,
        corner = startCorner;

    do {
        // Points and corners
        {
            var pointCacheKey = point.cacheKey,
                cachedPoint = cache.nodes[pointCacheKey];

            if (cachedPoint === undefined) {
                cache.nodes[pointCacheKey] = point;
            } else {
                point = cachedPoint;
            }

            hexagon.setCornerPoint(corner, point);

            var nextCorner = Hexagon.Corners.next(corner);
            var x = limitPrecision(point.x - (hexagonSideLength * Math.cos(corner.rad)), 5),
                y = limitPrecision(point.y + (hexagonSideLength * Math.sin(corner.rad)), 5);
            var nextPoint = new Point(x, y);
        }

        // Lines and sides
        {
            var line = new Line(point, nextPoint);

            var lineCacheKey = line.cacheKey,
                cachedLine = cache.lines[lineCacheKey];

            if (cachedLine === undefined) {
                cache.lines[lineCacheKey] = line;
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
            cachedHexagon = cache.hexagons[hexagonCacheKey];

        if (cachedHexagon !== undefined) {
            if (cachedHexagon.isComplete()) {
                return cachedHexagon;
            }

            hexagon = cachedHexagon;
        } else {
            cache.hexagons[hexagonCacheKey] = hexagon;
        }
    }

    return hexagon;
}

function gonifExists(cache, gonif) {
    return !!cache.gonifs[gonif.cacheKey];
}

function getOrGenerateGonif(cache, hexagonSideLength, startPoint, startSide) {
    var startCorner = startSide.start,
        hexagon = getOrGenerateHexagon(cache, hexagonSideLength, startPoint, startCorner),
        gonif = new Gonif(hexagon);

    if (gonifExists(cache, gonif)) {
        throw new Error("Gonif generation collision.");
    }

    cache.gonifs[gonif.cacheKey] = gonif;

    return gonif;
}

function addNeighbors(gonif) {
    var startSide = Hexagon.Sides.Top,
        side = startSide;

    do {
        var neighbor = gonif.getNeighbor(side);

        if ( !! neighbor) {
            var sharedNeighborDirections = Gonif.Neighbors.getSharedNeighborDirections(side);

            sharedNeighborDirections.forEach(function(sharedNeighborDirection) {
                var sharedNeighbor = neighbor.getNeighbor(sharedNeighborDirection.fromNeighbor);

                if ( !! sharedNeighbor) {
                    gonif.setNeighbor(sharedNeighborDirection.fromYou, sharedNeighbor);
                }
            });
        }

        side = Hexagon.Sides.next(side);

        // TODO: fix equality check
    } while (side.name !== startSide.name)
}

function generateGonifInDirection(area, cache, hexagonSideLength, gonif, goingTowardsDirection) {
    var comingFromDirection = Hexagon.Sides.opposite(goingTowardsDirection),
        startPoint = gonif.hexagon.getCornerPoint(goingTowardsDirection.end).point,
        neighbor;

    while (area.isInside(startPoint)) {
        startPoint = gonif.hexagon.getCornerPoint(goingTowardsDirection.end).point;
        neighbor = getOrGenerateGonif(cache, hexagonSideLength, startPoint, comingFromDirection);
        gonif.setNeighbor(goingTowardsDirection, neighbor);
        neighbor.setNeighbor(comingFromDirection, gonif);
        addNeighbors(neighbor);
        gonif = neighbor;
    }
}

function generateGraph(area, cache, hexagonSideLength) {
    var areaWithPadding = new Area(new Point(0 - hexagonSideLength, 0 - hexagonSideLength), new Point(area.x + hexagonSideLength, area.y + hexagonSideLength)),
        startPoint = new Point(random.integer(area.x), random.integer(area.y)),
        point = startPoint,
        startGonif = getOrGenerateGonif(cache, hexagonSideLength, point, Hexagon.Sides.Bottom),
        gonif = startGonif;

    if (startGonif === null) {
        startGonif = gonif;
    }

    // generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, startGonif, Hexagon.Sides.Top);
    // generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, startGonif, Hexagon.Sides.TopRight);
    generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, startGonif, Hexagon.Sides.BottomRight);
    // generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, startGonif, Hexagon.Sides.Bottom);
    // generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, startGonif, Hexagon.Sides.BottomLeft);
    generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, startGonif, Hexagon.Sides.TopLeft);

    console.log({
        hexagons: Object.keys(cache.hexagons).length,
        nodes: Object.keys(cache.nodes).length,
        lines: Object.keys(cache.lines).length,
        gonifs: Object.keys(cache.gonifs).length,
    }, cache)

    return startGonif;
}

function grapher(canvasArea, hexagonSideLength) {
    var cache = {
        hexagons: {},
        nodes: {},
        lines: {},
        gonifs: {},
    },
        start = generateGraph(canvasArea, cache, hexagonSideLength),
        graph = {
            hexagons: cache.hexagons,
            nodes: cache.nodes,
            lines: cache.lines,
            gonifs: cache.gonifs,
            start: start,
        };

    return graph;
}

module.exports = grapher;