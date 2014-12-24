# Rainbird Neo4j

Thin wrapper around the [Neo4j Transactional Cypher HTTP REST][REST] endpoint,
(`/db/data/transaction/commit`) that adds the ability to perform client side
substitutions in queries and returns results in a slightly saner fashion.

## Installation

```bash
npm install --save rainbird-neo4j
```

## Sample Usage

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

## Function `query`

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

**Note:** Invalid Cypher queries will not cause the callback to return with
`err`, instead an empty `results` object will be sent. See below for more
details.

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
            }
        },
        {
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

## Function `buildStatement`

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
var statement = neo4j.buildStatement(template, substitutions, parameters);
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

## Licence

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
