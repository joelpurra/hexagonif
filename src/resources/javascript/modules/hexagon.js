var Corner = require("./corner.js"),
    CornerPoint = require("./cornerpoint.js");

function Hexagon() {
    this.topLeft = null;
    this.topRight = null;
    this.right = null;
    this.bottomRight = null;
    this.bottomLeft = null;
    this.left = null;
}

Hexagon.Corners = {
    TopLeft: new Corner("top left", 120),
    TopRight: new Corner("top right", 60),
    Right: new Corner("right", 0),
    BottomRight: new Corner("bottom right", 300),
    BottomLeft: new Corner("bottom left", 240),
    Left: new Corner("left", 180)
};

Hexagon.Corners.next = function(start) {
    var result;

    switch (start) {
        case Hexagon.Corners.TopLeft:
            result = Hexagon.Corners.TopRight;
            break;
        case Hexagon.Corners.TopRight:
            result = Hexagon.Corners.Right;
            break;
        case Hexagon.Corners.Right:
            result = Hexagon.Corners.BottomRight;
            break;
        case Hexagon.Corners.BottomRight:
            result = Hexagon.Corners.BottomLeft;
            break;
        case Hexagon.Corners.BottomLeft:
            result = Hexagon.Corners.Left;
            break;
        case Hexagon.Corners.Left:
            result = Hexagon.Corners.TopLeft;
            break;
        default:
            throw new Error("Unknown start corner " + start);
    }

    return result;
};

Hexagon.Corners.opposite = function(start) {
    var result;

    switch (start) {
        case Hexagon.Corners.TopLeft:
            result = Hexagon.Corners.BottomRight;
            break;
        case Hexagon.Corners.TopRight:
            result = Hexagon.Corners.BottomLeft;
            break;
        case Hexagon.Corners.Right:
            result = Hexagon.Corners.Left;
            break;
        case Hexagon.Corners.BottomRight:
            result = Hexagon.Corners.TopLeft;
            break;
        case Hexagon.Corners.BottomLeft:
            result = Hexagon.Corners.TopRight;
            break;
        case Hexagon.Corners.Left:
            result = Hexagon.Corners.Right;
            break;
        default:
            throw new Error("Unknown start corner " + start);
    }

    return result;
};

Hexagon.Corners.connecting = function(start) {
    var result;

    switch (start) {
        case Hexagon.Corners.TopLeft:
            result = [
                Hexagon.Corners.Right,
                Hexagon.Corners.BottomLeft
            ];
            break;
        case Hexagon.Corners.TopRight:
            result = [
                Hexagon.Corners.BottomRight,
                Hexagon.Corners.Left
            ];
            break;
        case Hexagon.Corners.Right:
            result = [
                Hexagon.Corners.BottomLeft,
                Hexagon.Corners.TopLeft
            ];
            break;
        case Hexagon.Corners.BottomRight:
            result = [
                Hexagon.Corners.Left,
                Hexagon.Corners.TopRight
            ];
            break;
        case Hexagon.Corners.BottomLeft:
            result = [
                Hexagon.Corners.Right,
                Hexagon.Corners.TopLeft
            ];
            break;
        case Hexagon.Corners.Left:
            result = [
                Hexagon.Corners.BottomRight,
                Hexagon.Corners.TopRight
            ];
            break;
        default:
            throw new Error("Unknown start corner " + start);
    }

    return result;
};

Hexagon.prototype.getCacheKey = function() {
    // TODO: return just the top left corner?
    return this.topLeft.getCacheKey();
};

Hexagon.prototype.cornerPoints = function() {
    return [this.topLeft, this.topRight, this.right, this.bottomRight, this.bottomLeft, this.left];
};

Hexagon.prototype.setCornerPoint = function(corner, point) {
    var cornerPoint = new CornerPoint(corner, point);

    switch (corner) {
        case Hexagon.Corners.TopLeft:
            this.topLeft = cornerPoint;
            break;
        case Hexagon.Corners.TopRight:
            this.topRight = cornerPoint;
            break;
        case Hexagon.Corners.Right:
            this.right = cornerPoint;
            break;
        case Hexagon.Corners.BottomRight:
            this.bottomRight = cornerPoint;
            break;
        case Hexagon.Corners.BottomLeft:
            this.bottomLeft = cornerPoint;
            break;
        case Hexagon.Corners.Left:
            this.left = cornerPoint;
            break;
        default:
            throw new Error("Unknown corner " + corner);
    }
};

module.exports = Hexagon;