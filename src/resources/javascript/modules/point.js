function Point(x, y) {
    this.x = x;
    this.y = y;

    return this;
}

Point.prototype.getCacheKey = function() {
    var x = this.x.toFixed(3),
        y = this.y.toFixed(3),
        result = x + ", " + y;

    return result;
};

module.exports = Point;