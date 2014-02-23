var BASE = 10;

function limitPrecision(n, decimals) {
    var pow = Math.pow(BASE, decimals),
        result = Math.round(n * pow) / pow;

    return result;
}

module.exports = limitPrecision;