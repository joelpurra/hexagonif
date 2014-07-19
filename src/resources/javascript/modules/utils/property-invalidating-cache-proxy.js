function generateProxiedGetter(propName) {
    function proxiedGetter() {
        return this.subject[propName];
    }

    return proxiedGetter;
}

function generateProxiedSetter(propName) {
    function proxiedSetter(val) {
        this.subject[propName] = val;
    }

    return proxiedSetter;
}

function generateCacheInvalidatingProxiedSetter(propName, invalidates) {
    function cacheInvalidatingProxiedSetter(val) {
        invalidates.forEach(function(invalidate) {
            var cachedPropertyOrFunctionValue = this.cache[invalidate];

            if (cachedPropertyOrFunctionValue) {
                cachedPropertyOrFunctionValue.isCached = false;
                cachedPropertyOrFunctionValue.value = undefined;
            }
        });

        proxiedSetter.apply(this, arguments);
    }

    // Make sure it's an array
    invalidates = [].concat(invalidates);

    var proxiedSetter = generateProxiedSetter(propName);

    return cacheInvalidatingProxiedSetter;
}

function generateCacheInvalidatingProperty(proxyPrototype, propName, invalidates) {
    Object.defineProperty(proxyPrototype, propName, {
        get: generateProxiedGetter(propName),
        set: generateCacheInvalidatingProxiedSetter(propName, invalidates)
    });
}

function generateCachedPropertyOrFunction(proxyPrototype, clazzPrototype, propName) {
    function cachedFunctionCall() {
        var cachedPropertyOrFunctionValue = (this.cache[propName] || (this.cache[propName] = {})),
            result;

        if (!cachedPropertyOrFunctionValue.isCached) {
            // TODO: try-catch?
            // TODO: throw new Error("Should it be this or this.subject? Recursive calls?")
            result = this.subject[propName].apply(this, arguments);
            // result = this.subject[propName].apply(this.subject, arguments);

            cachedPropertyOrFunctionValue.value = result;
            cachedPropertyOrFunctionValue.isCached = true;
        }

        return cachedPropertyOrFunctionValue.value;
    }

    var propType = typeof clazzPrototype[propName];

    // TODO: also cache properties invalidated.
    if (propType !== "function") {
        throw new Error("Invalidation currently only works on functions, but " + propName + " is " + propType);
    }

    proxyPrototype[propName] = cachedFunctionCall;
}

function getProxyPrototype(clazz, proxyCacheInvalidationMap) {
    // Object.getPrototypeOf()?
    var clazzPrototype = clazz.prototype,
        clazzKeys = Object.keys(clazzPrototype),
        proxyPropertyKeys = Object.keys(proxyCacheInvalidationMap),
        invalidationKeys = Object.keys(proxyPropertyKeys.reduce(function(invalidatesFlattened, proxyPropertyKey) {
            // Allow for arrays of invalidation properties.
            var invalidationKeysArray = [].concat(proxyCacheInvalidationMap[proxyPropertyKey]);

            invalidationKeysArray.forEach(function(invalidationKey) {
                invalidatesFlattened[invalidationKey] = true;
            });

            return invalidatesFlattened;
        }, {})),
        unproxiedKeys = clazzKeys.filter(function(clazzKey) {
            return (proxyPropertyKeys.indexOf(clazzKey) !== -1 && !invalidationKeys.indexOf(clazzKey) !== -1);
        }),
        proxyPrototype = unproxiedKeys.reduce(function(unproxiedProxyPrototype, unproxiedKey) {
            unproxiedProxyPrototype[unproxiedKey] = clazzPrototype[unproxiedKey];

            return unproxiedProxyPrototype;
        }, {});

    proxyPropertyKeys.forEach(function(proxyPropertyKey) {
        generateCacheInvalidatingProperty(proxyPrototype, proxyPropertyKey, proxyCacheInvalidationMap[proxyPropertyKey]);
    });

    invalidationKeys.forEach(function(invalidatesKey) {
        generateCachedPropertyOrFunction(proxyPrototype, clazzPrototype, invalidatesKey);
    });

    return proxyPrototype;
}

function generate(clazz, proxyCacheInvalidationMap) {
    function CachingProxy() {
        this.cache = {};
        this.subject = clazz.prototype.constructor.apply(Object.create(clazz.prototype), arguments);

        return this;
    }

    CachingProxy.prototype = getProxyPrototype(clazz, proxyCacheInvalidationMap);

    return CachingProxy;
}

module.exports = generate;