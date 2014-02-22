var Point = require("./point.js");

function Line(start, end) {
    this.start = start;
    this.end = end;

    return this;
}

Line.prototype.getCacheKey = function() {
    var start = this.start.getCacheKey(20),
        end = this.end.getCacheKey(20),
        result;

    if (start < end) {
        result = start + "-" + end;
    } else {
        result = end + "-" + start
    }

    return result;
};

module.exports = Line;