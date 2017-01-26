var Corner = require("./corner.js"),
    CornerPoint = require("./cornerpoint.js"),
    Side = require("./side.js"),
    Line = require("./line.js"),
    SideLine = require("./sideline.js");

var NUMBER_OF_SIDES = 6;

function Hexagon() {
    this.points = {
        topLeft: null,
        topRight: null,
        right: null,
        bottomRight: null,
        bottomLeft: null,
        left: null,
    };

    this.lines = {
        top: null,
        topRight: null,
        bottomRight: null,
        bottom: null,
        bottomLeft: null,
        topLeft: null,
    };
}

Hexagon.Corners = {
    TopLeft: new Corner("top left", 120),
    TopRight: new Corner("top right", 60),
    Right: new Corner("right", 0),
    BottomRight: new Corner("bottom right", 300),
    BottomLeft: new Corner("bottom left", 240),
    Left: new Corner("left", 180),
};

Object.keys(Hexagon.Corners).forEach(function(cornerKey) {
    var corner = Hexagon.Corners[cornerKey];

    corner.rad = (((corner.rotation + 60) / 180) % 360) * Math.PI;
});

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
            Hexagon.Corners.BottomLeft,
        ];
        break;
    case Hexagon.Corners.TopRight:
        result = [
            Hexagon.Corners.BottomRight,
            Hexagon.Corners.Left,
        ];
        break;
    case Hexagon.Corners.Right:
        result = [
            Hexagon.Corners.BottomLeft,
            Hexagon.Corners.TopLeft,
        ];
        break;
    case Hexagon.Corners.BottomRight:
        result = [
            Hexagon.Corners.Left,
            Hexagon.Corners.TopRight,
        ];
        break;
    case Hexagon.Corners.BottomLeft:
        result = [
            Hexagon.Corners.Right,
            Hexagon.Corners.TopLeft,
        ];
        break;
    case Hexagon.Corners.Left:
        result = [
            Hexagon.Corners.BottomRight,
            Hexagon.Corners.TopRight,
        ];
        break;
    default:
        throw new Error("Unknown start corner " + start);
    }

    return result;
};

Hexagon.Sides = {
    Top: new Side("top", Hexagon.Corners.TopLeft, Hexagon.Corners.TopRight),
    TopRight: new Side("top right", Hexagon.Corners.TopRight, Hexagon.Corners.Right),
    BottomRight: new Side("bottom right", Hexagon.Corners.Right, Hexagon.Corners.BottomRight),
    Bottom: new Side("bottom", Hexagon.Corners.BottomRight, Hexagon.Corners.BottomLeft),
    BottomLeft: new Side("bottom left", Hexagon.Corners.BottomLeft, Hexagon.Corners.Left),
    TopLeft: new Side("top left", Hexagon.Corners.Left, Hexagon.Corners.TopLeft),
};

Hexagon.Sides.all = function() {
    return [
        Hexagon.Sides.Top,
        Hexagon.Sides.TopRight,
        Hexagon.Sides.BottomRight,
        Hexagon.Sides.Bottom,
        Hexagon.Sides.BottomLeft,
        Hexagon.Sides.TopLeft,
    ];
};

Hexagon.Sides.next = function(start) {
    var result;

    switch (start) {
    case Hexagon.Sides.Top:
        result = Hexagon.Sides.TopRight;
        break;
    case Hexagon.Sides.TopRight:
        result = Hexagon.Sides.BottomRight;
        break;
    case Hexagon.Sides.BottomRight:
        result = Hexagon.Sides.Bottom;
        break;
    case Hexagon.Sides.Bottom:
        result = Hexagon.Sides.BottomLeft;
        break;
    case Hexagon.Sides.BottomLeft:
        result = Hexagon.Sides.TopLeft;
        break;
    case Hexagon.Sides.TopLeft:
        result = Hexagon.Sides.Top;
        break;
    default:
        throw new Error("Unknown start side " + start);
    }

    return result;
};

Hexagon.Sides.opposite = function(start) {
    var result;

    switch (start) {
    case Hexagon.Sides.Top:
        result = Hexagon.Sides.Bottom;
        break;
    case Hexagon.Sides.TopRight:
        result = Hexagon.Sides.BottomLeft;
        break;
    case Hexagon.Sides.BottomRight:
        result = Hexagon.Sides.TopLeft;
        break;
    case Hexagon.Sides.Bottom:
        result = Hexagon.Sides.Top;
        break;
    case Hexagon.Sides.BottomLeft:
        result = Hexagon.Sides.TopRight;
        break;
    case Hexagon.Sides.TopLeft:
        result = Hexagon.Sides.BottomRight;
        break;
    default:
        throw new Error("Unknown start side " + start);
    }

    return result;
};

Hexagon.Sides.fromCorner = function(start) {
    var result;

    switch (start) {
    case Hexagon.Corners.TopLeft:
        result = Hexagon.Sides.Top;
        break;
    case Hexagon.Corners.TopRight:
        result = Hexagon.Sides.TopRight;
        break;
    case Hexagon.Corners.Right:
        result = Hexagon.Sides.BottomRight;
        break;
    case Hexagon.Corners.BottomRight:
        result = Hexagon.Sides.Bottom;
        break;
    case Hexagon.Corners.BottomLeft:
        result = Hexagon.Sides.BottomLeft;
        break;
    case Hexagon.Corners.Left:
        result = Hexagon.Sides.TopLeft;
        break;
    default:
        throw new Error("Unknown start side " + start);
    }

    return result;
};

Hexagon.prototype.getLineThroughMiddle = function() {
    var line,
        hexagon = this;

    this.cornerPoints().slice(0, 2).some(function findTwoOpposingCorners(cornerPoint) {
        var oppositeCorner = (!!cornerPoint) && Hexagon.Corners.opposite(cornerPoint.corner),
            oppositeCornerPoint = (!!oppositeCorner) && hexagon.getCornerPoint(oppositeCorner);

        line = oppositeCornerPoint && new Line(cornerPoint.point, oppositeCornerPoint.point);

        if (line) {
            return true;
        }

        return false;
    });

    return line || null;
};

Hexagon.prototype.getCenter = function() {
    var lineThroughMiddle = this.getLineThroughMiddle(),
        center = lineThroughMiddle && lineThroughMiddle.center();

    return center || null;
};

Hexagon.prototype.getCacheKey = function() {
    var center = this.getCenter(),
        centerCacheKey = center && center.cacheKey;

    return centerCacheKey || null;
};

Hexagon.prototype.cornerCount = function() {
    // TODO: get a library that has .count()
    var count = this.cornerPoints().reduce(function(prev, cornerPoint) {
        return prev + ((cornerPoint) ? 1 : 0);
    }, 0);

    return count;
};

Hexagon.prototype.isComplete = function() {
    return this.cornerCount() === NUMBER_OF_SIDES;
};

Hexagon.prototype.cornerPoints = function() {
    return [this.points.topLeft, this.points.topRight, this.points.right, this.points.bottomRight, this.points.bottomLeft, this.points.left];
};

Hexagon.prototype.getCornerPoint = function(corner) {
    var result = null;

    this.cornerPoints().some(function(cornerPoint) {
        // TODO: fix equality check
        if (cornerPoint.corner.rotation === corner.rotation) {
            result = cornerPoint;
            return true;
        }

        return false;
    });

    return result;
};

Hexagon.prototype.setCornerPoint = function(corner, point) {
    var cornerPoint = new CornerPoint(corner, point);

    switch (corner) {
    case Hexagon.Corners.TopLeft:
        this.points.topLeft = cornerPoint;
        break;
    case Hexagon.Corners.TopRight:
        this.points.topRight = cornerPoint;
        break;
    case Hexagon.Corners.Right:
        this.points.right = cornerPoint;
        break;
    case Hexagon.Corners.BottomRight:
        this.points.bottomRight = cornerPoint;
        break;
    case Hexagon.Corners.BottomLeft:
        this.points.bottomLeft = cornerPoint;
        break;
    case Hexagon.Corners.Left:
        this.points.left = cornerPoint;
        break;
    default:
        throw new Error("Unknown corner " + corner);
    }
};

Hexagon.prototype.sideCount = function() {
    // TODO: get a library that has .count()
    var count = this.sideLines().reduce(function(prev, sideLine) {
        return prev + (sideLine === undefined ? 0 : 1);
    }, 0);

    return count;
};

Hexagon.prototype.sideLines = function() {
    return [this.lines.top, this.lines.topRight, this.lines.bottomRight, this.lines.bottom, this.lines.bottomLeft, this.lines.topLeft];
};

Hexagon.prototype.getSideLine = function(side) {
    var result = null;

    this.sideLines().some(function(sideLine) {
        // TODO: fix equality check
        if (sideLine.side.getRotation() === side.getRotation()) {
            result = sideLine;
            return true;
        }

        return false;
    });

    return result;
};

Hexagon.prototype.setSideLine = function(side, line) {
    var sideLine = new SideLine(side, line);

    switch (side) {
    case Hexagon.Sides.Top:
        this.lines.top = sideLine;
        break;
    case Hexagon.Sides.TopRight:
        this.lines.topRight = sideLine;
        break;
    case Hexagon.Sides.BottomRight:
        this.lines.bottomRight = sideLine;
        break;
    case Hexagon.Sides.Bottom:
        this.lines.bottom = sideLine;
        break;
    case Hexagon.Sides.BottomLeft:
        this.lines.bottomLeft = sideLine;
        break;
    case Hexagon.Sides.TopLeft:
        this.lines.topLeft = sideLine;
        break;
    default:
        throw new Error("Unknown side " + side);
    }
};

module.exports = Hexagon;