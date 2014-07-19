var propertyInvalidatingCacheProxy = require("../utils/property-invalidating-cache-proxy.js"),
    Hexagon = require("../objects/hexagon.js"),
    pointsInvalidates = ["cornerPoints", "getCacheKey", "cornerCount"],
    linesInvalidates = ["sideLines", "sideCount"],
    pointProperties = [
        "pointsAsProperties_topLeft",
        "pointsAsProperties_topRight",
        "pointsAsProperties_right",
        "pointsAsProperties_bottomRight",
        "pointsAsProperties_bottomLeft",
        "pointsAsProperties_left"
    ],
    lineProperties = [
        "linesAsProperties_top",
        "linesAsProperties_topRight",
        "linesAsProperties_bottomRight",
        "linesAsProperties_bottom",
        "linesAsProperties_bottomLeft",
        "linesAsProperties_topLeft",

    ],
    invalidatingCacheMap = {},
    CachedHexagon;

pointProperties.forEach(function(pointProperty) {
    invalidatingCacheMap[pointProperty] = pointsInvalidates;
});

lineProperties.forEach(function(lineProperty) {
    invalidatingCacheMap[lineProperty] = linesInvalidates;
});

CachedHexagon = propertyInvalidatingCacheProxy(Hexagon, invalidatingCacheMap);

module.exports = CachedHexagon;