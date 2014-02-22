function wrap(name, fn) {
    var wrapped = function() {
        var result;

        console.timeline(name);
        console.profile(name);

        result = fn.call(null);

        console.timelineEnd();
        console.profileEnd();

        return result;
    }

    return wrapped;
}

var api = {
    wrap: wrap
}

module.exports = api;