function delay(fn, milliseconds) {
    var delayer = function() {
        var timeout = setTimeout(fn.bind(null), milliseconds);
    };

    return delayer;
}

module.exports = delay;