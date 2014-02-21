(function() {
    "use strict";

    // Based on http://ocanvas.org/demos/2

    // TODO: use hidpi-canvas-polyfill
    // https://github.com/jondavidjohn/hidpi-canvas-polyfill
    var canvasElement = document.getElementById("hexagonif");
    canvasElement.width = 500;
    canvasElement.height = 1200;

    var FPS = 60 / 3,
        initialRadius = 100,
        acceptableDifference = 0.01;

    var canvas = oCanvas.create({
        canvas: "#hexagonif",
        fps: FPS
    });

    var hexagon = canvas.display.polygon({
        radius: initialRadius,
        sides: 6,
        x: canvas.width / 2,
        y: canvas.height / 3,
        fill: "#29b"
    });

    canvas.addChild(hexagon);

    var defaultResetPeriod = FPS * 1,
        defaultResetCycles = defaultResetPeriod * 10,
        resetCycles = defaultResetCycles;

    canvas.setLoop(function() {
        if (resetCycles <= 0) {
            var adjustment = ((1 - (hexagon.radius / initialRadius)) * initialRadius) / defaultResetPeriod;

            hexagon.radius += adjustment;

            var diff = initialRadius - hexagon.radius;

            if (Math.abs(diff) < initialRadius * acceptableDifference) {
                resetCycles = defaultResetCycles;
            }
        }

        hexagon.radius *= 1 + (0.2 * (0.5 - (Math.round(Math.random()))));

        hexagon.rotation++;

        resetCycles = (resetCycles - 1) % defaultResetCycles;
    });

    canvas.timeline.start();
}());