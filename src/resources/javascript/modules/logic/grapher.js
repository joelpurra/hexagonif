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
    var sidesToCheck = Hexagon.Sides.all(),
        sideCounter = 0;

    while (side = sidesToCheck.shift()) {
        var neighbor = gonif.getNeighbor(side);

        if ( !! neighbor) {
            var sharedNeighborDirections = Gonif.Neighbors.getSharedNeighborDirections(side);

            sharedNeighborDirections.forEach(function(sharedNeighborDirection) {
                var sharedNeighbor = neighbor.getNeighbor(sharedNeighborDirection.fromNeighbor);

                if (( !! sharedNeighbor) && gonif.getNeighbor(sharedNeighborDirection.fromHere) !== sharedNeighbor) {
                    gonif.setNeighbor(sharedNeighborDirection.fromHere, sharedNeighbor);
                    sharedNeighbor.setNeighbor(Hexagon.Sides.opposite(sharedNeighborDirection.fromHere), gonif);

                    // In case this one has neighbors still unknown, but already checked in the inital pass.
                    sidesToCheck.push(sharedNeighborDirection.fromHere);
                    sideCounter++
                }
            });
        }
    }
    console.log("sideCounter", sideCounter);
}

function generateGonifInDirection(area, cache, hexagonSideLength, gonif, goingTowardsDirections) {
    // Ensure array
    goingTowardsDirections = [].concat(goingTowardsDirections);

    var comingFromDirection,
        goingTowardsDirectionIndex = 0,
        goingTowardsDirection = goingTowardsDirections[goingTowardsDirectionIndex],
        startPoint = gonif.hexagon.getCornerPoint(goingTowardsDirection.end).point,
        neighbor;

    do {
        comingFromDirection = Hexagon.Sides.opposite(goingTowardsDirection);
        startPoint = gonif.hexagon.getCornerPoint(goingTowardsDirection.end).point;
        neighbor = getOrGenerateGonif(cache, hexagonSideLength, startPoint, comingFromDirection);

        gonif.setNeighbor(goingTowardsDirection, neighbor);
        neighbor.setNeighbor(comingFromDirection, gonif);
        addNeighbors(neighbor);

        goingTowardsDirectionIndex = (goingTowardsDirectionIndex + 1) % goingTowardsDirections.length;
        goingTowardsDirection = goingTowardsDirections[goingTowardsDirectionIndex];
        gonif = neighbor;
    } while (area.isInside(startPoint))
}

function addAreaLines(cache, areaWithPadding) {
    var p1 = new Point(areaWithPadding.aX, areaWithPadding.aY),
        p2 = new Point(areaWithPadding.aX, areaWithPadding.bY),
        p3 = new Point(areaWithPadding.bX, areaWithPadding.aY),
        p4 = new Point(areaWithPadding.bX, areaWithPadding.bY),
        l1 = new Line(p1, p2),
        l2 = new Line(p1, p3),
        l3 = new Line(p2, p4),
        l4 = new Line(p3, p4);

    [l1, l2, l3, l4].forEach(function(line) {
            cache.lines[line.cacheKey] = line;
        });
}

function generateGraph(area, cache, hexagonSideLength) {
    var areaWithoutPadding = new Area(new Point(0, 0), area),
        areaWithPadding = new Area(new Point(0 + hexagonSideLength, 0 + hexagonSideLength), new Point(area.x - hexagonSideLength, area.y - hexagonSideLength)),
        areaWithMorePadding = new Area(new Point(0 + 2 * hexagonSideLength, 0 + 2 * hexagonSideLength), new Point(area.x - 2 * hexagonSideLength, area.y - 2 * hexagonSideLength)),
        // areaWithPadding = new Area(new Point(0 - hexagonSideLength, 0 - hexagonSideLength), new Point(area.x + hexagonSideLength, area.y + hexagonSideLength)),
        startPoint = new Point(area.x / 2, area.y / 2),
        // startPoint = new Point((areaWithPadding.aX + areaWithPadding.bX) / 2, (areaWithPadding.aY + areaWithPadding.bY) / 2);
        // startPoint = new Point(hexagonSideLength + areaWithPadding.aX + random.integer(areaWithPadding.bX - hexagonSideLength) - hexagonSideLength, hexagonSideLength + areaWithPadding.aY + random.integer(areaWithPadding.bY - hexagonSideLength)),
        // startPoint = new Point(random.integer(area.x), random.integer(area.y)),
        point = startPoint,
        startGonif = getOrGenerateGonif(cache, hexagonSideLength, point, Hexagon.Sides.Bottom),
        gonif = startGonif;

    generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, [Hexagon.Sides.BottomRight, Hexagon.Sides.TopRight]);
    generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, [Hexagon.Sides.BottomLeft, Hexagon.Sides.TopLeft]);
    // generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.BottomRight);
    // generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.TopLeft);

    do {
        generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.Top);
        generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.Bottom);
        gonif = gonif.getNeighbor(Hexagon.Sides.BottomRight) || gonif.getNeighbor(Hexagon.Sides.TopRight);
    } while ( !! gonif);

    gonif = startGonif.getNeighbor(Hexagon.Sides.BottomLeft) || startGonif.getNeighbor(Hexagon.Sides.TopLeft);

    if ( !! gonif) {
        do {
            generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.Top);
            generateGonifInDirection(areaWithPadding, cache, hexagonSideLength, gonif, Hexagon.Sides.Bottom);
            gonif = gonif.getNeighbor(Hexagon.Sides.BottomLeft) || gonif.getNeighbor(Hexagon.Sides.TopLeft);
        } while ( !! gonif);
    }

    addAreaLines(cache, areaWithoutPadding);
    addAreaLines(cache, areaWithPadding);
    addAreaLines(cache, areaWithMorePadding);

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