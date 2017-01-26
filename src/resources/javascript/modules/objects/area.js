function Area(start, end) {
    this.start = start;
    this.end = end;

    if (this.start.x <= this.end.x) {
        this.aX = this.start.x;
        this.bX = this.end.x;
    } else {
        this.aX = this.end.x;
        this.bX = this.start.x;
    }

    if (this.start.y <= this.end.y) {
        this.aY = this.start.y;
        this.bY = this.end.y;
    } else {
        this.aY = this.end.y;
        this.bY = this.start.y;
    }

    return this;
}

Area.prototype.isInside = function(point) {
    return !this.isOutside(point);
};

Area.prototype.isOutside = function(point) {
    var isOutside = (point.x < this.aX) || (point.x > this.bX) || (point.y < this.aY) || (point.y > this.bY);

    return isOutside;
};

module.exports = Area;
