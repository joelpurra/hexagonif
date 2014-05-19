function Side(name, start, end) {
    this.name = name;
    this.start = start;
    this.end = end;

    return this;
}

Side.prototype.getRotation = function() {
    var start = this.start.rotation,
        end = this.end.rotation,
        temp,
        rotation;

    if (start > end) {
        temp = start;
        start = end;
        end = temp;
    }

    rotation = (start + ((end - start) / 2)) % 360;

    if ((end - start) > 180) {
        rotation += 180;
    }

    return rotation;
};

module.exports = Side;