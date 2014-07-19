var propertyInvalidatingCacheProxy = require("../utils/property-invalidating-cache-proxy.js"),
    Line = require("../objects/line.js"),
    invalidatingCacheMap = {
        "start": ["getCacheKey", "center"],
        "end": ["getCacheKey", "center"],
    },
    CachedLine = propertyInvalidatingCacheProxy(Line, invalidatingCacheMap);

module.exports = CachedLine;