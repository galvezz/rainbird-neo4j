// `rainbird-neo4j` supports the ability to perform client side substitutions,
// that is replace placeholders in Cypher with other text. Client side
// substitutions work in a similar way to parameters, except they can exist
// anywhere in the query string, and are denoted using `${var}` rather than
// `{var}`.

function find(query, substitutions, callback) {
    for (var substitution in substitutions) {
        /* istanbul ignore else  */
        if (substitutions.hasOwnProperty(substitution)) {
            var regex = new RegExp('\\$\\{' + substitution + '}', 'g');
            query = query.replace(regex, substitutions[substitution]);
        }
    }

    var matches = query.match(/\$\{[^}]*?}/g);

    if (matches) {
        var message = 'Error, unmatched parameter';
        message += matches.length > 1 ? 's: ' : ': ';
        message += matches.join(', ');
        return callback(new Error(message));
    }


    callback(null, query);
}

module.exports.find = find;