var propertyInvalidatingCacheProxy = require("../utils/property-invalidating-cache-proxy.js"),
    Point = require("../objects/point.js"),
    invalidatingCacheMap = {
        "x": "getCacheKey",
        "y": "getCacheKey",
    },
    CachedPoint = propertyInvalidatingCacheProxy(Point, invalidatingCacheMap);

module.exports = CachedPoint;