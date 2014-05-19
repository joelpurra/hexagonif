function wrap(name, fn) {
    var wrapped = function() {
        var result;

        console && console.timeline && console.timeline(name);
        console && console.profile && console.profile(name);

        result = fn.call(null);

        console && console.timelineEnd && console.timelineEnd();
        console && console.profileEnd && console.profileEnd();

        return result;
    }

    return wrapped;
}

var api = {
    wrap: wrap
}

module.exports = api;