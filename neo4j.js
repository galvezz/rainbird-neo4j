var request = require('request');
var parser = require('./lib/argumentParser.js');

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

// To run a query you can either provide a Cypher statement as a string and
// an optional parameters object along with a callback, or you can provide
// an array of statement objects. Each statement object should contain a
// statement property, which will be the Cypher statement, and a parameters
// object. The callback is passed any errors, and the results of the query or
// queries.
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
// Calls to `query` are wrapped in a transaction so if a single query fails in
// a list of queries then all the queries will be rolled back.

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

// In order to simplify building statement objects the `buildStatement` function
// is provided. It will take a string, or an array of strings, an object
// containing client side substitutions and an object containing server side
// parameters. In the case where the query is presented as an array of strings
// the array is simply concatenated together with newlines.
//
// Client side substitutions work in a similar fashion to the server side
// parameters except they are denoted using `${var}` rather than `{var}`, and
// they confer no performance gains - they simply act as a convenience that
// allows for greater parametrisation than vanilla Neo4J queries. The function
// returns a valid statement object that can be used in a list with `query`.

// For example, the following code:
//
// ```
// var template = `MATCH (:${foo} {value: {value}})`;
// var substitutions = { 'foo': 'Baz'};
// var parameters = { 'value': 'bar' };
// var statement = Neo4j.buildStatement(template, substitutions, parameters);
// ```
//
// Will yield the following object for `statement`:
//
// ```
// {
//     statement: "MATCH(:Baz {value: {value}})",
//     parameters: { value: "bar" }
// }
// ```

// If only one object is given it is assumed to be a parameters object

function buildStatement() {
    var args = parser.parseBuildStatementArguments(arguments);
    var statement = args.statement;

    for (var substitution in args.substitutions) {
        /* istanbul ignore else  */
        if (args.substitutions.hasOwnProperty(substitution)) {
            var regex = new RegExp('\\$\\{' + substitution + '}', 'g');
            statement =
                statement.replace(regex, args.substitutions[substitution]);
        }
    }

    var matches = statement.match(/\$\{[^}]*?}/g);

    if (matches) {
        var message = 'Error, unmatched parameter';
        message += matches.length > 1 ? 's: ' : ': ';
        message += matches.join(', ');
        throw new Error(message);
    }

    return { 'statement': statement, 'parameters': args.parameters };
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

function escapeIdentifier(string) {
    var result = string.replace(/`/g, '``');
    return '`' + result + '`';
}

module.exports = Neo4j;
module.exports.buildStatement = buildStatement;
module.exports.escapeIdentifier = escapeIdentifier;

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