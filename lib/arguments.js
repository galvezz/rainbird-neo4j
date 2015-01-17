var async = require('async');

// This module will arguments used by the various functions in `neo4j.js`. The
// logic works on the following assumptions:
//
// * An `integer` is a transaction ID
// * A `string` argument is a query string
// * An `array` is either a set of _statements_ or an array of query strings
// * An `object` is either a parameters object or a substitutions object
// * A `function`is always a callback
//
// Further we can always assume:
//
// * The transaction ID, if present, will be first
// * The callback will always be last
// * The parameters object, if present, will be the last `object` in the
//   parameter list
// * The `array` will either be an array of query string if it contains strings,
//   otherwise it is an array of statements.
//
// The following rules are applied in series, and any matching items are
// removed from the list being checked.

// * If the first item in `input` is a number, it's the transaction ID.

function setTransactionID(input, output, callback) {
    if (!isNaN(input[0])) {
        output.transactionID = input.shift();
    }

    callback();
}

// * If the first item in `input` is a string, it's the query string.

function setQueryString(input, output, callback) {
    if (typeof input[0] === 'string' || input[0] instanceof String) {
        output.query = input.shift();
    }

    callback();
}

// * If the last item in `input` is a function, it's the callback.

function setCallback(input, output, callback) {
    if (typeof(input[input.length - 1]) === 'function') {
        output.callback = input.pop();
    }

    callback();
}

// * If the last item in `input` is an object, it's the parameters object.

function setParameters(input, output, callback) {
    if (input.length > 0 && !Array.isArray(input[input.length - 1])) {
        output.parameters = input.pop();
    }

    callback();
}

// * If the last item in `input` is an object, it's the substitutions object.

function setSubstitutions(input, output, callback) {
    if (input.length > 0 && !Array.isArray(input[input.length - 1])) {
        output.substitutions = input.pop();
    }

    callback();
}

// * If the first item in `input` is an array of strings we can build into a
// query string.

function setQueryArray(input, output, callback) {
    function string(value) {
        return typeof value === 'string' || value instanceof String;
    }

    if (Array.isArray(input[0]) && input[0].some(string)) {
        output.query = input[0].reduce(function(previous, current) {
            if (typeof previous === 'string' || previous instanceof String) {
                return previous + '\n' + current;
            }
        });
        input.shift();
    }

    callback();
}

// * If the first item in `input` is an array create a statements object

function setStatements(input, output, callback) {
    if (Array.isArray(input[0])) {
        output.statements = input.shift();
    } else if (output.query) {
        output.statements =
            [{ 'statement': output.query, 'parameters': output.parameters }];
    }

    callback();
}

// The `parse` function will pass the callback an object that has one or more of
// the following parameters set:
//
// * `transactionID` - the transaction ID
// * `query` - the original query string, if present, or the query string
//    constructed from the array of query strings
// * `callback` - the callback
// * `parameters` - the parameters object, defaults to the empty object
// * `substitutions` - the substitutions object, defaults to the empty object
// * `statements` - an array of statement objects, defaults to an empty
//    statement

function parse(input, callback) {
    input = Array.prototype.slice.call(input);
    var output = {
        'query': '',
        'parameters': {},
        'substitutions': {},
        'statements': []
    };

    async.series([
        function(callback) { setTransactionID(input, output, callback); },
        function(callback) { setQueryString(input, output, callback); },
        function(callback) { setCallback(input, output, callback); },
        function(callback) { setParameters(input, output, callback); },
        function(callback) { setSubstitutions(input, output, callback); },
        function(callback) { setQueryArray(input, output, callback); },
        function(callback) { setStatements(input, output, callback); }
    ], function() {
        callback(output);
    });
}

module.exports.parse = parse;

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