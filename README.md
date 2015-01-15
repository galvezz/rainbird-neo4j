# Rainbird Neo4j
https://codeship.com/projects/415e09a0-71a3-0132-22e9-028f765b4235/status?branch=master

Thin wrapper around the [Neo4j Transactional Cypher HTTP][REST] REST endpoint
(specifically `/db/data/transaction/commit`) that adds the ability to perform
transactions and client side substitutions in queries. It also returns results
in a slightly saner fashion than the raw endpoint.

## Installation

```bash
npm install --save rainbird-neo4j
```

## Basic Usage

```javascript
var Neo4j = rewire('rainbird-neo4j');
var db = new Neo4j('http://localhost:7474');

db.query('MATCH (n) RETURN n', function(err, results) {
    if (err) {
        console.log(err);
    } else {
        console.log(JSON.stringify(results, null, 4));
    }
});
```

## Queries

All functions that can perform queries accept these in the same format. At its
most basic a query is just a query string. Providing a parameters object with
the query string allows for queries with parameters. See the [Neo4j
documentation on parameters][parameters] for more details on the _parameters
object_.

Multiple queries can be run from a single function call by providing them as
_statement_.

## <a name="statements"></a>Statements

_Statements_ are an array of _statement objects_ which themselves contain a
`statement` property and a `parameters` property. `statement` is any valid
Cypher statement. `parameters` is a [parameters object][parameters].

## Transactions

Queries are always run within the context of a transaction. Where transactions
are not explicitly stated then the queries will be wrapped in a _begin_ and
_commit_. Any errors will cause the transaction to _rollback_.

For transactions that span multiple function calls a call to `begin` will open
a transaction and return a transaction ID. This can then be used to run multiple
queries before `commit` or `rollback` are called. Both `begin` and `commit` can
also run queries.

Transactions time out after a period of time. The timeout is reset each time a
call is made on that transaction. An empty query can be used to reset the
timeout.

## Callback

All functions that take a callback expect it to be in the form:

```javascript
callback(err, results, info)
```

If `err` is set then `results` will be an empty array.

### Results format

Results are returned as a list containing one element per query run. Each
individual result in this list is itself a list of rows returned. Each row is
an object containing the column names as properties and the row data as objects.

For example, if you run the following query as a single statement:

```
CREATE (foo:Foo {name: 'baz'})
SET foo.type = 'String'
CREATE (bar:Bar {name: 'baz'})
SET bar.type = 'String'
RETURN foo, bar
```

Will return the result:

```json
[
    [
        {
            "foo": {
                "name": "baz",
                "type": "String"
            },
            "bar": {
                "name": "baz",
                "type": "String"
            }
        }
    ]
]
```

If you run the two following queries as separate statements:

```
CREATE (foo:Foo {name: 'baz'}) RETURN foo
CREATE (bar:Bar {name: 'baz'}) RETURN bar
```

You will get the result:

```json
[
    [
        {
            "foo": {
                "name": "baz"
            }
        }
    ],
    [
        {
            "bar": {
                "name": "baz"
            }
        }
    ]
]
```

With the more complex query:

```
CREATE ({name: 'subject'})-[:R {name: 'relationship'}]->({name: 'object'})
MATCH (s)-[r]-(o) RETURN s, r, o
```

You will get the result:

```json
[
    [],
    [
        {
            "s": { "name": "object" },
            "r": { "name": "relationship" },
            "o": { "name": "subject" }
        },
        {
            "s": { "name": "subject" },
            "r": { "name": "relationship" },
            "o": { "name": "object" }
        }
    ]
]
```

### Info Format

The `info` object will contain any extra information returned by the function
and will vary depending on the exact context.

The `statements` parameter will always be set and will contain the
[statements](statements) sent to Neo4j.

The `errors` parameter will contain an array of any errors returned by Neo4j.
Any errors will have the same index as the statement that caused it. If no
errors occurred then this list will be empty.

The `timeout` parameter is only set if `begin`, or `query` within the context of
a transaction has been called. It contains the datetime stamp when the
transaction will time out. See the [Neo4j REST][REST] documentation for more
details on the timeout.

The `transactionID` parameter is only set in the context of a transaction and
contains the current transaction ID. This is set by a call to `begin`.

## Functions

### `begin`

Begin a transaction and optionally run a query in that transaction. The returned
transaction ID should be used for all future calls involving the transaction.

```javascript
begin(callback)
begin(transactionID, queryString, callback)
begin(transactionID, queryString, parameters, callback)
begin(transactionID, statements, callback)
```

### `query`

Run a query, either as a single transaction, or part of a larger transaction.

```javascript
query(queryString, callback)
query(queryString, parameters, callback)
query(statements, callback)
```

```javascript
query(transactionID, callback)
query(transactionID, queryString, callback)
query(transactionID, queryString, parameters, callback)
query(transactionID, statements, callback)
```

The signature `query(transactionID, callback)` is provided as a convenience
function to reset the timeout on a transaction. It will pass an empty set of
statements to Neo4j and is the equivalent of
`query(transactionId, [], callback)`

### `commit`

Commit an open transaction, optionally running a query before the transaction is
closed.

```javascript
commit(transactionID, callback)
commit(transactionID, queryString, callback)
commit(transactionID, queryString, parameters, callback)
commit(transactionID, statements, callback)
```

### `rollback`

Rollback an existing transaction. `rollback` will always return an empty result
set.

```javascript
rollback(transactionID, callback)
```

## `resetTimeout`

Reset the timeout on a transaction without performing a query. Synonym for
`query(transactionID, callback)`.

```javascript
resetTimeout(transactionID, callback)
```

### `buildStatement`

The `buildStatement` function is a synchronous helper function that will
construct a valid _statement object_ for inclusion in an array of
[statements](statements). It also allows for the use of client side parameters.
Client side parameters, or _substitutions_, are simply a convenience mechanism
that allow complex query strings to be reused within the code by use of
substitutions. _Substitutions_ do not provide the performance gains that normal
parameters give as they are parsed out before being sent to Neo4j.

Substitutions are defined in the query string using the format `${var}`. The
substitution will be replaced with the value of `var` in the _substitutions
object_.

For example, the following code:

```
var template = `MATCH (:${foo} {value: {value}})`;
var substitutions = { 'foo': 'Baz'};
var parameters = { 'value': 'bar' };
var statement = Neo4j.buildStatement(template, substitutions, parameters);
```

Will yield the following object for `statement`:

```
{
    statement: "MATCH(:Baz {value: {value}})",
    parameters: { value: "bar" }
}
```

The `buildStatement` can be called in one of 6 ways:

```javascript
Neo4j.buildStatement(string)
Neo4j.buildStatement(string, parameters)
Neo4j.buildStatement(string, substitutions, parameters)
Neo4j.buildStatement(array)
Neo4j.buildStatement(array, parameters)
Neo4j.buildStatement(array, substitutions, parameters)
```

Where:

* `string` is a valid Cypher query string with any substitutions defined.
* `array` is an array of strings which will be concatenated together with
   newlines, and should form a valid Cypher query string with any substitutions
   defined.
* `substitutions` is an object containing values for all the defined
   substitutions
* `parameters` is a valid _parameters object_. See the
   [Neo4j documentation on parameters][parameters] for more details on the
   _parameters object_

The output from `buildStatement` should be added to an array to form
[statements](statements).

### Escaping Identifiers

Identifiers in Neo4j follow the following basic rules:

   * case sensitive
   * can contain underscores and alphanumeric characters ([a-zA-Z0-9_])
   * must always start with a letter. ([a-zA-Z]+[a-zA-Z0-9_]*)

More complex identifiers can be quoted using backtick (`) characters.
Backticks themselves can be escaped using a backtick. Identifiers can be easily
escaped using:

```javascript
var identifier = Neo4j.escapeIdentifier('a complex identifier`);
```

## Testing

The package can be tested using:

```bash
npm test
```

This runs the linter, unit tests and creates the `docco` documentation along
with coverage reports and `plato` reports.

To perform full functional tests that connect to a test Neo4j instance that can
be cleared down after each test run:

```bash
export NEO4J_TEST_URL=http://localhost:4747
npm run-script functional-test
```

Replace `http://localhost:4747` with the URL of your test Neo4j instant.

**Note: the functional tests clear _everything_ in the test database. Please use
a stand alone test DB for functional testing.**

### Functional testing with Docker

The best method of providing a test Neo4j instance for functional testing is by
running a throwaway instance in Docker. To run:

```bash
docker run -i -t -d --name neo4j --privileged -p 7676:7474 tpires/neo4j
```

Here the port mapping has been changed from `7676` to `7474` which allows the
Docker instance to live on the same machine as a local instance. You can adjust
`7676` to point to any port, potentially running more than one Docker instance
by providing a different name to the `docker` command.

You can now expose this to the functional tests using:

```bash
export NEO4J_TEST_URL="http:${DOCKER_IP}:7676"
npm run-script functional-test
```

The Docker instance can now be stopped and deleted if it's no longer needed.

# Release Notes

## v0.2.0

  *  [New] Transactions over multiple function calls using
           begin/commit/rollback.
  *  [New] Return the statements passed to Neo4j on completion of a query.
  * [Misc] Complete rewrite of the documentation.
  * [Misc] Internal changes to the way parameters are handled
  * [Note] This version is a breaking change. The error object passed to the
           callback no longer contains the `errors` and `statements` parameters.
           These now exist on the `info` object which is passed as the third
           parameter to the callback. All other changes are backwards
           compatible.

## v0.1.5

  *  [Fix] Fix errors coming through as the string `[object Object]`
  * [Misc] Give access to the complete error object returned by Neo4j

## v0.1.4

  *  [Fix] `query` now consistently returns an `Error` object on error.
  * [Misc] The `Error` object returned by `query` has a `statements` property
           which contains the statements being sent to Neo4j.

## v0.1.3

  *  [New] When calling `buildStatement` with only two arguments the second
           argument is assumed to be the parameters object.

## v0.1.2

  *  [Fix] Errors are now correctly returned from Neo4j.

## v0.1.1

  * [Misc] Lock down version numbers of package dependencies.

## v0.1.0

  *  [Fix] Fixed the mapping behaviour when returning more than one variable so
           that all variables are mapped into the same object rather than
           multiple objects being returned.

## v0.0.4

  *  [Fix] `buildStatement` no longer needs Neo4J to be initialised.

## v0.0.3

  *  [Fix] `escapeIdentifier` no longer needs Neo4J to be initialised.

## v0.0.2

  *  [New] Add `escapeIdentifier` function.

## v0.0.1

  *  [New] Initial release.

# Licence

Copyright (c) 2014, Rainbird Technologies <follow@rainbird.ai>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

[REST]: http://neo4j.com/docs/stable/rest-api-transactional.html
[parameters]: http://neo4j.com/docs/stable/cypher-parameters.html
