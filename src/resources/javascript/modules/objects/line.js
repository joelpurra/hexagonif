var Point = require("./point.js");

function Line(start, end) {
    this.start = start;
    this.end = end;
    this.cacheKey = this._getCacheKey();
    this.center = this._center();

    return this;
}

Line.prototype._getCacheKey = function() {
    var start = this.start.cacheKey,
        end = this.end.cacheKey,
        result;

    if (start < end) {
        result = start + "-" + end;
    } else {
        result = end + "-" + start
    }

    return result;
};

Line.prototype._center = function() {
    var x = (this.start.x + this.end.x) / 2,
        y = (this.start.y + this.end.y) / 2,
        result = new Point(x, y);

    return result;
};

module.exports = Line;