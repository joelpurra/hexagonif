function floatingPoint(from, to) {
    if (to === undefined) {
        to = from;
        from = 0;
    }

    var rnd = Math.random(),
        result = from + (rnd * to);

    return result;
}

function integer(from, to) {
    var fp = floatingPoint(from, to),
        result = Math.floor(fp);

    return result;
}

var api = {
    floatingPoint: floatingPoint,
    integer: integer,
};

module.exports = api;
