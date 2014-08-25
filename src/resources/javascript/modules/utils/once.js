function once(fn) {
    var hasRun = false,
        runOnceCheck = function() {
            if (!hasRun) {
                hasRun = true;
                fn.call(null);
            }
        };

    return runOnceCheck;
}

module.exports = once;