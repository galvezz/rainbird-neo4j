var request = require('request');

var neo4j;

// The Rainbird Neo4j package gives a very thin wrapper around the Neo4J REST
// API and exposes this as an object. When you instantiate a new Neo4j object 
// you need to tell it where Neo4j lives. The URI will be something along the 
// lines of `http://localhost:7474`.

function Neo4j(uri) {
    neo4j = uri;
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

    var uri = neo4j + '/db/data/transaction/commit';

    request.post(
        { 'uri': uri, 'json': { 'statements': statements } },
        function(err, results) {
            var data = results && results.body ? results.body.results :
                undefined;
            callback(err, data);
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
// var statement = neo4j.buildStatement(template, substitutions, parameters);
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

Neo4j.prototype.buildStatement = function(template, substitutions, parameters) {
    var statement = template;

    if (Array.isArray(template)) {
        statement = template.join('\n');
    }


    if (!substitutions) {
        substitutions = {};
    }

    if (!parameters) {
        parameters = {};
    }

    for (var substitution in substitutions) {
        /* istanbul ignore else  */
        if (substitutions.hasOwnProperty(substitution)) {
            var regex = new RegExp('\\$\\{' + substitution + '}', 'g');
            statement = statement.replace(regex, substitutions[substitution]);
        }
    }

    var matches = statement.match(/\$\{[^}]*?}/g);

    if (matches) {
        var message = 'Error, unmatched parameter';
        message += matches.length > 1 ? 's: ' : ': ';
        message += matches.join(', ');
        throw new Error(message);
    }

    return { 'statement': statement, 'parameters': parameters };
};

module.exports = Neo4j;