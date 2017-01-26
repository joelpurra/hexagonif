var random = require("../utils/random.js");

function GraphObjectsTool(graphObjects) {
    this.graphObjects = graphObjects;
}

GraphObjectsTool.prototype.getRandomObject = function(objects) {
    var keys = Object.keys(objects),
        count = keys.length,
        rnd = random.integer(0, count),
        key = keys[rnd],
        object = objects[key];

    return object;
};

GraphObjectsTool.prototype.getRandomHexagon = function() {
    var hexagon = this.getRandomObject(this.graphObjects.hexagons);

    return hexagon;
};

GraphObjectsTool.prototype.getRandomLine = function() {
    var line = this.getRandomObject(this.graphObjects.lines);

    return line;
};

GraphObjectsTool.prototype.getRandomNode = function() {
    var node = this.getRandomObject(this.graphObjects.nodes);

    return node;
};

module.exports = GraphObjectsTool;