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
//             statement: 'MATCH (n {id: {id} }) RETURN (n)',
//             parameters: { `id`: 123 }
//         },
//         {
//             statement: 'MATCH (n {id: {id} }) RETURN (n)',
//             parameters: { `id`: 124 }
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
        statements = [{ statement: statement, parameters: parameters }];
    }

    var uri = neo4j + '/db/data/transaction/commit';

    request.post(
        { uri: uri, json: { statements: statements } },
        function(err, results) {
            var data = results && results.body ? results.body.results :
                undefined;
            callback(err, data);
        }
    );
};

module.exports = Neo4j;