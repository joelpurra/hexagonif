var Point = require("./point.js");

function Line(start, end) {
    this.start = start;
    this.end = end;
    this.__getCacheKey = null;
    this.__center = null;

    return this;
}

Line.prototype._getCacheKey = function() {
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

Line.prototype.getCacheKey = function() {
    return (this.__getCacheKey || (this.__getCacheKey = this._getCacheKey()));
};

Line.prototype._center = function() {
    var x = (this.start.x + this.end.x) / 2,
        y = (this.start.y + this.end.y) / 2,
        result = new Point(x, y);

    return result;
};

Line.prototype.center = function() {
    return (this.__center || (this.__center = this._center()));
};

module.exports = Line;