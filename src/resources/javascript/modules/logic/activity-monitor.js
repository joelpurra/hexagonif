// TODO: use HexEvent?
// var HexEvent = require("./events.js");
var activityEventName = "user.activity",
    inactivityEventName = "user.inactivity";

function ActivityMonitor(hexEvent, limit) {
    this.hexEvent = hexEvent;
    this.limitMilliseconds = limit || 60 * 1000;

    this.checkingIntervalMilliseconds = Math.floor(this.limitMilliseconds / 2);
    this.latestActivityTimestamp = null;
    this.activityInterval = null;
    this.isMonitorStarted = false;
    this.isUserIsActive = false;
}

ActivityMonitor.prototype.getTimestamp = function() {
    return new Date().valueOf();
};

ActivityMonitor.prototype.resetActivityInterval = function() {
    this.latestActivityTimestamp = this.getTimestamp();
};

ActivityMonitor.prototype.startActivityInterval = function() {
    this.activityInterval = setInterval(this.checkActivityInterval.bind(this), this.checkingIntervalMilliseconds);
};

ActivityMonitor.prototype.stopActivityInterval = function() {
    clearInterval(this.activityInterval);

    this.activityInterval = null;
};

ActivityMonitor.prototype.checkActivityInterval = function() {
    if (Math.abs(this.getTimestamp() - this.latestActivityTimestamp) > this.limitMilliseconds) {
        this.inactivityDetected();
    }
};

ActivityMonitor.prototype.activityDetected = function() {
    this.isUserIsActive = true;
    this.resetActivityInterval();

    if (this.activityInterval === null) {
        this.startActivityInterval();
    }

    this.hexEvent.fire(activityEventName);
};

ActivityMonitor.prototype.inactivityDetected = function() {
    this.stopActivityInterval();
    this.isUserIsActive = false;

    this.hexEvent.fire(inactivityEventName);
};

ActivityMonitor.prototype.isStarted = function() {
    return this.isMonitorStarted === true;
};

ActivityMonitor.prototype.isUserIsActive = function() {
    return this.isUserIsActive === true;
};

ActivityMonitor.prototype.start = function() {
    if (this.isStarted()) {
        throw new Error("Was already started.");
    }

    this.resetActivityInterval();
    this.startActivityInterval();

    // TODO: use hexagonif triggered events?
    document.addEventListener("mousemove", this.activityDetected.bind(this));
};

ActivityMonitor.prototype.stop = function() {
    if (this.isStarted()) {
        throw new Error("Was not started.");
    }

    document.removeEventListener("mousemove", this.activityDetected.bind(this));

    this.stopActivityInterval();
};

module.exports = ActivityMonitor;
