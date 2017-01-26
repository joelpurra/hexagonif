function noop() {}

function asyncExecute(fn) {
    setTimeout(function() {
        fn.call(null);
    }, 0);
}

function assertFunction(fn) {
    if (typeof (fn) !== "function") {
        throw new Error("Not a function");
    }
}

function AsyncQueue(done) {
    assertFunction(done);

    this.done = done || null;
    this.queue = [];
    this.parallel = 0;
    this.limit = 1;
}

AsyncQueue.prototype.add = function(fn) {
    assertFunction(fn);

    this.queue.push(fn);

    this.consume();
};

AsyncQueue.prototype.consume = function() {
    if (this.parallel < this.limit) {
        this.parallel++;
        var fn = this.queue.shift();

        if (fn) {
            asyncExecute(function() {
                fn.call(null);
                this.parallel--;

                this.consume();
            }.bind(this));
        } else {
            var done = this.done;
            this.done = null;

            done && asyncExecute(done);
        }
    }
};

module.exports = AsyncQueue;