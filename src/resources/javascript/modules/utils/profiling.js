function wrap(name, fn) {
    var wrapped = function() {
        var result;

        /* eslint-disable no-console */
        if (console && console.timeline)
        {
            console.timeline(name);
        }

        if (console && console.profile)
        {
            console.profile(name);
        }

        result = fn.call(null);

        if (console && console.timelineEnd)
        {
            console.timelineEnd();
        }

        if (console && console.profileEnd)
        {
            console.profileEnd();
        }
        /* eslint-enable no-console */

        return result;
    };

    return wrapped;
}

var api = {
    wrap: wrap,
};

module.exports = api;
