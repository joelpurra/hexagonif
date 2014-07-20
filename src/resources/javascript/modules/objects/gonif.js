var Hexagon = require("./hexagon.js"),
    random = require("../utils/random.js");

function Gonif(hexagon) {
    this.cacheKey = random.integer(Number.MAX_VALUE);

    this.hexagon = hexagon;

    this.neighbors = {
        top: null,
        topRight: null,
        bottomRight: null,
        bottom: null,
        bottomLeft: null,
        topLeft: null,
    };

    return this;
}

Gonif.Neighbors = {};

Gonif.Neighbors.getSharedNeighborDirections = function(direction) {
    var result;

    switch (direction) {
        case Hexagon.Sides.Top:
            result = [{
                fromNeighbor: Hexagon.Sides.BottomLeft,
                fromHere: Hexagon.Sides.TopLeft
            }, {
                fromNeighbor: Hexagon.Sides.BottomRight,
                fromHere: Hexagon.Sides.TopRight
            }];
            break;
        case Hexagon.Sides.TopRight:
            result = [{
                fromNeighbor: Hexagon.Sides.TopLeft,
                fromHere: Hexagon.Sides.Top
            }, {
                fromNeighbor: Hexagon.Sides.Bottom,
                fromHere: Hexagon.Sides.BottomRight
            }];
            break;
        case Hexagon.Sides.BottomRight:
            result = [{
                fromNeighbor: Hexagon.Sides.Top,
                fromHere: Hexagon.Sides.TopRight
            }, {
                fromNeighbor: Hexagon.Sides.BottomLeft,
                fromHere: Hexagon.Sides.Bottom
            }];
            break;
        case Hexagon.Sides.Bottom:
            result = [{
                fromNeighbor: Hexagon.Sides.TopRight,
                fromHere: Hexagon.Sides.BottomRight
            }, {
                fromNeighbor: Hexagon.Sides.TopLeft,
                fromHere: Hexagon.Sides.BottomLeft
            }];
            break;
        case Hexagon.Sides.BottomLeft:
            result = [{
                fromNeighbor: Hexagon.Sides.BottomRight,
                fromHere: Hexagon.Sides.Bottom
            }, {
                fromNeighbor: Hexagon.Sides.Top,
                fromHere: Hexagon.Sides.TopLeft
            }];
            break;
        case Hexagon.Sides.TopLeft:
            result = [{
                fromNeighbor: Hexagon.Sides.Bottom,
                fromHere: Hexagon.Sides.BottomLeft
            }, {
                fromNeighbor: Hexagon.Sides.TopRight,
                fromHere: Hexagon.Sides.Top
            }];
            break;
        default:
            throw new Error("Unknown neighbor side " + direction);
    }

    return result;
};

Gonif.prototype.getNeighbors = function() {
    var neighbors = [
        this.neighbors.top,
        this.neighbors.topRight,
        this.neighbors.bottomRight,
        this.neighbors.bottom,
        this.neighbors.bottomLeft,
        this.neighbors.topLeft
    ];

    return neighbors;
};

Gonif.prototype.getNeighbor = function(direction) {
    var result;

    switch (direction) {
        case Hexagon.Sides.Top:
            result = this.neighbors.top;
            break;
        case Hexagon.Sides.TopRight:
            result = this.neighbors.topRight;
            break;
        case Hexagon.Sides.BottomRight:
            result = this.neighbors.bottomRight;
            break;
        case Hexagon.Sides.Bottom:
            result = this.neighbors.bottom;
            break;
        case Hexagon.Sides.BottomLeft:
            result = this.neighbors.bottomLeft;
            break;
        case Hexagon.Sides.TopLeft:
            result = this.neighbors.topLeft;
            break;
        default:
            throw new Error("Unknown neighbor side " + direction);
    }

    return result;
};

Gonif.prototype.setNeighbor = function(direction, neighbor) {
    switch (direction) {
        case Hexagon.Sides.Top:
            this.neighbors.top = neighbor;
            break;
        case Hexagon.Sides.TopRight:
            this.neighbors.topRight = neighbor;
            break;
        case Hexagon.Sides.BottomRight:
            this.neighbors.bottomRight = neighbor;
            break;
        case Hexagon.Sides.Bottom:
            this.neighbors.bottom = neighbor;
            break;
        case Hexagon.Sides.BottomLeft:
            this.neighbors.bottomLeft = neighbor;
            break;
        case Hexagon.Sides.TopLeft:
            this.neighbors.topLeft = neighbor;
            break;
        default:
            throw new Error("Unknown direction " + direction);
    }
};

module.exports = Gonif;