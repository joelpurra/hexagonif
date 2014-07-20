function Point(x, y) {
    this.x = x;
    this.y = y;
    this.__getCacheKey = null;

    return this;
}

Point.prototype._getCacheKey = function() {
    var x = this.x.toFixed(3),
        y = this.y.toFixed(3),
        result = x + ", " + y;

    return result;
};

Point.prototype.getCacheKey = function() {
    return (this.__getCacheKey || (this.__getCacheKey = this._getCacheKey()));
};

module.exports = Point;