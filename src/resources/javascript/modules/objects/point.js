function Point(x, y) {
    this.x = x;
    this.y = y;
    this.cacheKey = this._getCacheKey();

    return this;
}

Point.prototype._getCacheKey = function() {
    var x = this.x.toFixed(3),
        y = this.y.toFixed(3),
        result = x + ", " + y;

    return result;
};

module.exports = Point;