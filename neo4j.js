var request = require('request');
var parser = require('./lib/arguments.js');

// The Rainbird Neo4j package gives a very thin wrapper around the Neo4J REST
// API and exposes this as an object. When you instantiate a new Neo4j object 
// you need to tell it where Neo4j lives. The URI will be something along the 
// lines of `http://localhost:7474`.

function Neo4j(uri) {
    this.neo4j = uri;
}

// Results from the Neo4j REST API aren't in the best format and the
// documentation on the format is sketchy. Instead we flip the results into a
// format whereby a list of results is returned, one for each query run. That,
// in turn contains a list of each row returned for the given query. Each row
// is an object where the columns are defined as properties which themselves
// are objects containing the returned data for that element.

function mapResults(results) {
    var mappedResults = [];

    try {
        results.forEach(function(result) {
            var mappedResult = [];
            result.data.forEach(function(data) {
                var mappedData = {};

                data.row.forEach(function(element, index) {
                    mappedData[result.columns[index]] = element;
                });

                mappedResult.push(mappedData);
            });

            mappedResults.push(mappedResult);
        });
    } catch (err) {
        return [];
    }

    return mappedResults;
}

// `rainbird-neo4j` supports the ability to perform client side substitutions,
// that is replace placeholders in Cypher with other text. Client side
// substitutions work in a similar way to parameters, except they can exist
// anywhere in the query string, and are denoted using `${var}` rather than
// `{var}`.

function performSubstitutions(query, substitutions) {
    for (var substitution in substitutions) {
        /* istanbul ignore else  */
        if (substitutions.hasOwnProperty(substitution)) {
            var regex = new RegExp('\\$\\{' + substitution + '}', 'g');
            query = query.replace(regex, substitutions[substitution]);
        }
    }

    return query;
}

// Substitutions are performed as part of composing statements from queries,
// substitutions and properties. The `compose` function will take a string along
// with optional `substitution` and `parameters` objects and pass a statement
// object to the callback. This statement object can then be added to an array
// and passed to Neo4j through `query`, `begin` or `commit`. If only one object
// is given it is assumed to be a parameters object
//
// For example, the following code:
//
// ```javascript
// var template = `MATCH (:${foo} {value: {value}})`;
// var substitutions = { 'foo': 'Baz'};
// var parameters = { 'value': 'bar' };
// Neo4j.compose(template, substitutions, parameters, callback);
// ```
//
// Will pass the following statement object to Neo4J:
//
// ```JSON
// [{
//    "statement": "MATCH(:Baz {value: {value}})",
//    "parameters": { "value": "bar" }
// }]
// ```

function compose() {
    parser.parse(arguments, function(args) {
        var statement = {
            'statement': performSubstitutions(args.query, args.substitutions),
            'parameters': args.parameters
        };

        var matches = statement.statement.match(/\$\{[^}]*?}/g);

        if (matches) {
            var message = 'Error, unmatched parameter';
            message += matches.length > 1 ? 's: ' : ': ';
            message += matches.join(', ');
            return args.callback(new Error(message));
        }

        args.callback(null, statement);
    });
}

// Identifiers in Neo4j follow the following basic rules:
//
//    * case sensitive
//    * can contain underscores and alphanumeric characters ([a-zA-Z0-9_])
//    * must always start with a letter. ([a-zA-Z]+[a-zA-Z0-9_]*)
//
// More complex identifiers can be quoted using backtick (`) characters.
// Backticks themselves can be escaped using a backtick. To avoid complex
// pattern matching on a string we simply assume all identifiers need to be
// quoted by escaping backticks and surrounding the string in backticks.

function escape(string) {
    var result = string.replace(/`/g, '``');
    return '`' + result + '`';
}

// To run a query you can either provide a Cypher statement as a string and
// an optional parameters object, or you can provide an array of statement
// objects. For transactions spanning queries a transaction ID must be provided.
// The last argument is a callback.
//
// Each statement object should contain a statement property, which will be the
// Cypher statement, and a parameters object. The callback is passed any errors,
// and the results of the query or queries.
//
// The following are all valid:
//
// ```
// Neo4j.query(
//     'MATCH (n) RETURN (n)',
//     function(err, results) { console.log(JSON.stringify(data); }
// );
// ```
//
// ```
// Neo4j.query(
//     'MATCH (n {id: {id} }) RETURN (n)',
//     { `id`: 123 },
//     function(err, results) { console.log(JSON.stringify(data); }
// );
// ```
//
// ```
// Neo4j.query(
//     [
//         {
//             'statement': 'MATCH (n {id: {id} }) RETURN (n)',
//             'parameters': { `id`: 123 }
//         },
//         {
//             'statement': 'MATCH (n {id: {id} }) RETURN (n)',
//             'parameters': { `id`: 124 }
//         },
//     ],
//     function(err, results) { console.log(JSON.stringify(data); }
// );
// ```
//
// The complete set of valid ways to call `query` is:
//
// ```
// query(string, callback)
// query(string, parameters, callback)
// query(string, substitutions, parameters, callback)
// query(array, callback)
// query(array, parameters, callback)
// query(array, substitutions, parameters, callback)
// query(transactionID, string, callback)
// query(transactionID, string, parameters, callback)
// query(transactionID, string, substitutions, parameters, callback)
// query(transactionID, array, callback)
// query(transactionID, array, parameters, callback)
// query(transactionID, array, substitutions, parameters, callback)
// ```
//
// where:
//
// * `string` is a query string
// * `array` is an array of query strings or statement objects
// * `parameters` is a parameters `object`
// * `substitutions` is a substitutions `object`
// * `transactionID` is an `integer`
// * `callback` is a `function`
//
// If `query` is called without a transaction ID then it is wrapped in single a
// transaction so if a single query fails in a list of queries then all the
// queries will be rolled back.

Neo4j.prototype.query = function(statement, parameters, callback) {

    var statements;

    if (callback === undefined && typeof(parameters) === 'function') {
        callback = parameters;
        parameters = {};
    }

    if (Array.isArray(statement)) {
        statements = statement;
    } else {
        statements = [{ 'statement': statement, 'parameters': parameters }];
    }

    var uri = this.neo4j + '/db/data/transaction/commit';

    request.post(
        { 'uri': uri, 'json': { 'statements': statements } },
        function(err, results) {
            if (err) {
                err.statements = statements;
                err.errors = [];
                return callback(err, []);
            }

            if (results.body.errors.length > 0) {
                var error = new Error('Error running query');
                error.errors = results.body.errors;
                error.statements = statements;
                callback(error, []);
            } else {
                callback(null, mapResults(results.body.results));
            }
        }
    );
};

Neo4j.prototype.begin = function() {
    throw new Error('Not implemented yet');
};

Neo4j.prototype.commit = function() {
    throw new Error('Not implemented yet');
};

Neo4j.prototype.rollback = function() {
    throw new Error('Not implemented yet');
};

Neo4j.prototype.resetTimeout = function(transactionID, callback) {
    query(transactionID, callback);
};

module.exports = Neo4j;
module.exports.compose = compose;
module.exports.escape = escape;

// ## License
//
// Copyright (c) 2014, RainBird Technologies <follow@rainbird.ai>
//
// Permission to use, copy, modify, and/or distribute this software for any
// purpose with or without fee is hereby granted, provided that the above
// copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED 'AS IS' AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.