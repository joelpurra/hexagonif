function resizeDetector(element, fn) {
    // Currently not checking for height changes because that would
    // reset the element every time the developer console was toggled.

    // Chrome on Android also triggers a resize when scrolling enough to
    // hide the address bar and menu.

    // TODO: read this value once after element has been drawn, otherwise the first
    // resize, even if in height, will trigger the drawing.
    var previousElementWidth = 0;

    // TODO: remove listener?
    window.addEventListener("resize", function onResizeEventListener() {
        if (!element) {
            fn.call(null);
            return;
        }

        if (previousElementWidth !== element.scrollWidth) {
            previousElementWidth = element.scrollWidth;

            fn.call(null);
            return;
        }
    });
}

module.exports = resizeDetector;