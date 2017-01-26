function HexEvents(canvasElement, namespacePrefix) {
    this.canvasElement = canvasElement;
    this.namespacePrefix = namespacePrefix || "hexagonif.";
}

HexEvents.prototype.getEventName = function(name) {
    return this.namespacePrefix + name;
};

HexEvents.prototype.fire = function(name, graphic, object) {
    var event = document.createEvent("HTMLEvents"),
        namespacedName = this.getEventName(name);

    event.initEvent(namespacedName, true, true);
    event.graphic = graphic;
    event.object = object;
    return this.canvasElement.dispatchEvent(event);
};

HexEvents.prototype.listen = function(name, fn) {
    var namespacedName = this.getEventName(name);

    this.canvasElement.addEventListener(namespacedName, fn);
};

HexEvents.prototype.cancel = function(name, fn) {
    var namespacedName = this.getEventName(name);

    this.canvasElement.removeEventListener(namespacedName, fn);
};

module.exports = HexEvents;