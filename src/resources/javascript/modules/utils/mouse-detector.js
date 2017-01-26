var once = require("./once.js");

function mouseDetector(fn) {
    // Experimental code to detect if a mouse pointing device is used.
    // If a mouse is detected, call the supplied function once.
    var onTouchMoveEventArgs = {
            target: null,
        },
        onTouchMove = function(e) {
            onTouchMoveEventArgs.target = e.target;
        },
        onMouseMove = function(e) {
            // If the target isn't the same, the assumption is that the touchmove event wasn't fired first - hence it's not a touch event.
            // TODO: would be better to use the mouse event .x and .y, if matching ones exist in touchmove etcetera.
            if (onTouchMoveEventArgs.target !== e.target) {
                onDetect();
            }

            // Release pointer
            onTouchMoveEventArgs.target = null;
        },
        onDetect = once(function() {
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("mousemove", onMouseMove);
            fn.call(null);
        });

    document.addEventListener("touchmove", onTouchMove);
    document.addEventListener("mousemove", onMouseMove);
}

module.exports = mouseDetector;
