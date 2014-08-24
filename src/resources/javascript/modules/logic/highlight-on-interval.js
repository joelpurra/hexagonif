var MAX_AUTO_HIGHLIGHT_DELAY = 10,
    random = require("../utils/random.js");

function HighlightOnInterval(scene, graphObjectsTool, hexEvent) {
    this.scene = scene;
    this.graphObjectsTool = graphObjectsTool;
    this.hexEvent = hexEvent;

    this.isHighlighterStarted = false;
    this.highlightCounter = 0,
    this.highlightCounterInterval = null;
    this.isAutomatedHighlight = false,
    this.highlightInterval = null;

    this.highlightMilliseconds = 1000;
    this.unhighlightAfterMilliseconds = 500;

    this.boundListeners = {
        hexagonifLineHighlightEventListener: this.hexagonifLineHighlightEventListener.bind(this),
        hexagonifLineUnhighlightEventListener: this.hexagonifLineUnhighlightEventListener.bind(this),
        highlightCounterDecreaser: this.highlightCounterDecreaser.bind(this),
        highlightSomethingThatIfNothingHasHappened: this.highlightSomethingThatIfNothingHasHappened.bind(this),

    };
}

HighlightOnInterval.prototype.highlightCounterDecreaser = function() {
    this.highlightCounter = Math.max(0, this.highlightCounter - 1);
}

HighlightOnInterval.prototype.resetRandomLine = function() {
    var line = this.graphObjectsTool.getRandomLine();

    this.scene.resetLine(line);
}

HighlightOnInterval.prototype.highlightRandomLine = function() {
    var line = this.graphObjectsTool.getRandomLine();

    this.isAutomatedHighlight = true;
    this.scene.highlightLine(line);
    this.isAutomatedHighlight = false;

    setTimeout(function unhighlightSameRandomLine() {
        this.scene.unhighlightLine(line);
    }.bind(this), this.unhighlightAfterMilliseconds);
}

HighlightOnInterval.prototype.highlightRandomHexagon = function() {
    var hexagon;

    do {
        hexagon = this.graphObjectsTool.getRandomHexagon();
    } while (!hexagon.isComplete())

    this.isAutomatedHighlight = true;
    this.scene.highlightHexagon(hexagon);
    this.isAutomatedHighlight = false;

    setTimeout(function unhighlightSameRandomHexagon() {
        this.scene.unhighlightHexagon(hexagon);
    }.bind(this), this.unhighlightAfterMilliseconds);
}

HighlightOnInterval.prototype.highlightSomethingThatIfNothingHasHappened = function() {
    var rnd = random.integer(10);

    if (this.highlightCounter === 0) {
        if (rnd < 2) {
            this.resetRandomLine();
        } else if (rnd < 9) {
            this.highlightRandomLine();
        } else {
            this.highlightRandomHexagon();
        }
    }
}

HighlightOnInterval.prototype.hexagonifLineHighlightEventListener = function() {
    if (!this.isAutomatedHighlight) {
        this.highlightCounter = Math.min(Number.MAX_VALUE - 1, this.highlightCounter + 1, MAX_AUTO_HIGHLIGHT_DELAY);
    }
}

HighlightOnInterval.prototype.hexagonifLineUnhighlightEventListener = function() {
    // Something
}

HighlightOnInterval.prototype.isStarted = function() {
    return this.isHighlighterStarted == true;
}

HighlightOnInterval.prototype.start = function() {
    if (this.isStarted()) {
        throw new Error("Was started.")
    }

    this.isHighlighterStarted = true;

    this.hexEvent.listen("line.highlight", this.boundListeners.hexagonifLineHighlightEventListener);
    this.hexEvent.listen("line.unhighlight", this.boundListeners.hexagonifLineUnhighlightEventListener);

    this.highlightCounterInterval = setInterval(this.boundListeners.highlightCounterDecreaser, this.highlightMilliseconds);
    this.highlightInterval = setInterval(this.boundListeners.highlightSomethingThatIfNothingHasHappened, this.highlightMilliseconds);
}

HighlightOnInterval.prototype.stop = function() {
    if (!this.isStarted()) {
        throw new Error("Was not started.")
    }

    this.hexEvent.cancel("line.highlight", this.boundListeners.hexagonifLineHighlightEventListener);
    this.hexEvent.cancel("line.unhighlight", this.boundListeners.hexagonifLineUnhighlightEventListener);

    clearInterval(this.highlightCounterInterval);
    clearInterval(this.highlightInterval);

    this.isHighlighterStarted = false;
}

module.exports = HighlightOnInterval;