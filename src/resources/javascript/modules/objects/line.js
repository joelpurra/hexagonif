var Point = require("../proxied/point.js");

function Line(start, end) {
    this.start = start;
    this.end = end;

    return this;
}

Line.prototype.getCacheKey = function() {
    var start = this.start.getCacheKey(),
        end = this.end.getCacheKey(),
        result;

    if (start < end) {
        result = start + "-" + end;
    } else {
        result = end + "-" + start
    }

    return result;
};

Line.prototype.center = function() {
    var x = (this.start.x + this.end.x) / 2,
        y = (this.start.y + this.end.y) / 2,
        result = new Point(x, y);

    return result;
};

module.exports = Line;