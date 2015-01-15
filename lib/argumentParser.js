// `query` can be called in the following fashions:
//
// ```
// query(string, parameters, callback)
// query(string, callback)
// query(string, parameters, transactionID, callback)
// query(string, transactionID, callback)
// query(array, callback)
// query(array, transactionID, callback)
// ```
//
// where:
//
// * `string` is a query string
// * `array` is an array of statement objects
// * `parameters` is an `object`
// * `transactionID` is an `integer`
// * `callback` is a `function`
//
// The input are returned as named parameters in an object

function parseQueryArguments(input) {
    var output = {};
    var parameters = {};

    if (input.length === 2) {
        output.callback = input[1];
    } else if (input.length === 3) {
        if (isNaN(input[1])) {
            parameters = input[1];
        } else {
            output.transactionID = input[1];
        }
        output.callback = input[2];
    } else {
        parameters = input[1];
        output.transactionID = input[2];
        output.callback = input[3];
    }

    if (Array.isArray(input[0])) {
        output.statements = input[0];
    } else {
        output.statements = [
            { 'statement': input[0], 'parameters': parameters }
        ];
    }

    return output;
}
//template, substitutions, parameters

// `buildStatement` can be called in the following fashions:
//
// ```
// buildStatement(string)
// buildStatement(string, parameters)
// buildStatement(string, substitutions, parameters)
// buildStatement(array)
// buildStatement(array, parameters)
// buildStatement(array, substitutions, parameters)
// ```
//
// where:
//
// * `string` is a query string
// * `array` is an array of statement objects
// * `parameters` is an `object`
// * `substitutions` is an `object`

function parseBuildStatementArguments(input) {
    var output = {
        'statement': input[0],
        'substitutions': {},
        'parameters': {}
    };

    if (Array.isArray(input[0])) {
        output.statement = input[0].join('\n');
    }

    if (input.length === 2) {
        output.parameters = input[1];
    }

    if (input.length === 3) {
        output.substitutions = input[1];
        output.parameters = input[2];
    }

    return output;
}

module.exports.parseQueryArguments = parseQueryArguments;
module.exports.parseBuildStatementArguments = parseBuildStatementArguments;