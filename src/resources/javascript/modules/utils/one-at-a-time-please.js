function oneAtATimePlease(fn) {
    var running = false,
        wrapper = function oneAtATimePleaseWrapper() {
            if (running) {
                return;
            }
            running = true;

            fn.call(null);

            running = false;
        };

    return wrapper;
}

module.exports = oneAtATimePlease;