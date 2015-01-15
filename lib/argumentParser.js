// `query` can be called in the following fashions:
//
// ```
// query(statement, parameters, callback)
// query(statement, callback)
// query(statement, parameters, transactionID, callback)
// query(statement, transactionID, callback)
// ```
//
// where:
// * `statement` can be a `string` or an `array` or statement objects
// * `parameters` is an `object`
// * `transactionID` is an `integer`
// * `callback` is a `function`
//
// The arguments are returned as named parameters in an object

function parseQueryArguments() {
    var args = {};
    var parameters = {};

    if (arguments.length === 2) {
        args.callback = arguments[1];
    } else if (arguments.length === 3) {
        if (isNaN(arguments[1])) {
            parameters = arguments[1];
        } else {
            args.transactionID = arguments[1];
        }
        args.callback = arguments[2];
    } else {
        parameters = arguments[1];
        args.transactionID = arguments[2];
        args.callback = arguments[3];
    }

    if (Array.isArray(arguments[0])) {
        args.statements = arguments[0];
    } else {
        args.statements = [
            { 'statement': arguments[0], 'parameters': parameters }
        ];
    }

    return args;
}

function parseBuildStatementArguments() {

}

module.exports.parseQueryArguments = parseQueryArguments;
module.exports.parseBuildStatementArguments = parseBuildStatementArguments;