# Rainbird Neo4j
https://codeship.com/projects/415e09a0-71a3-0132-22e9-028f765b4235/status?branch=master

Thin wrapper around the [Neo4j Transactional Cypher HTTP][REST] REST endpoint
(specifically `/db/data/transaction/commit`) that adds the ability to perform
client side substitutions in queries and returns results in a slightly saner
fashion.

## Installation

```bash
npm install --save rainbird-neo4j
```

## Usage

### Sample Usage

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

### Function `query`

The `query` function can be called in three different ways:

```javascript
query(string, callback)
```

Where `string` is a valid Cypher query string and `callback` is a function that
takes two arguments, `err` and `results`. See below for the format of `results`.

```javascript
query(string, object, callback)
```

Where `string` is a valid Cypher query string, `object` is a _parameters object_
and `callback` is a function that takes two arguments, `err` and `results`. See
the [Neo4j documentation on parameters][parameters] for more details on the
_parameters object_. See below for the format of `results`.

```javascript
query(array, callback)
```

Where `array` is an array of _statement objects_ and `callback` is a function
that takes two arguments, `err` and `results`.

A _statement object_ is a simple object with two properties: `statement`, which
is a valid Cypher query string; and `parameters` which is a _parameters object_.
See the [Neo4j documentation on parameters][parameters] for more details on the
_parameters object_. See below for the format of `results`.

#### Results format

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

### Function `buildStatement`

The `buildStatement` function is a synchronous helper function that will
construct a valid _statement object_. It also allows for the use of client side
parameters. Client side parameters, or _substitutions_, are simply a convenience
mechanism that allow complex query strings to be reused within the code by use of
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
buildStatement(string)
buildStatement(string, substitutions)
buildStatement(string, substitutions, parameters)
buildStatement(array)
buildStatement(array, substitutions)
buildStatement(array, substitutions, parameters)
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

The output from `buildStatement` should be added to an array and passed to
`query(array, callback)`.

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

## v0.1.2

  *  [Fix] Errors are now correctly returned from Neo4j

## v0.1.1

  * [Misc] Lock down version numbers of package dependencies

## v0.1.0

  *  [Fix] Fixed the mapping behaviour when returning more than one variable so
           that all variables are mapped into the same object rather than
           multiple objects being returned.

## v0.0.4

  *  [Fix] `buildStatement` no longer needs Neo4J to be initialised

## v0.0.3

  *  [Fix] `escapeIdentifier` no longer needs Neo4J to be initialised

## v0.0.2

  *  [New] Add `escapeIdentifier` function

## v0.0.1

  *  [New] Initial release

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
