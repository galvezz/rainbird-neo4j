var expect = require('chai').expect;
var rewire = require("rewire");

var args = rewire('../../lib/arguments.js');

describe('Parsing individual elements of arguments', function() {

    var output;

    var setTransactionID = args.__get__('setTransactionID');
    var setQueryString = args.__get__('setQueryString');
    var setCallback = args.__get__('setCallback');
    var setParameters = args.__get__('setParameters');
    var setSubstitutions = args.__get__('setSubstitutions');
    var setStatements = args.__get__('setStatements');
    var setQueryArray = args.__get__('setQueryArray');

    beforeEach(function(done) {
        output = {
            'parameters': 'default',
            'substitutions': 'default',
            'statements': 'default'
        };
        done();
    });

    describe('when checking for a transaction ID', function() {
        it('should find valid transaction IDs', function(done) {
            var input = [1, 'foo', 'bar'];

            setTransactionID(input, output, function() {
                expect(input).to.have.length(2);
                expect(input[0]).to.equal('foo');
                expect(output).to.have.property('transactionID', 1);
                done();
            });
        });

        it('should ignore everything else', function(done) {
            var input = ['foo', 'bar'];

            setTransactionID(input, output, function() {
                expect(input).to.have.length(2);
                expect(input[0]).to.equal('foo');
                expect(output).to.not.have.property('transactionID');
                done();
            });
        });

        it('should ignore empty input', function(done) {
            var input = [];

            setTransactionID(input, output, function() {
                expect(output).to.not.have.property('transactionID');
                done();
            });
        });
    });

    describe('when checking for a query string', function() {
        it('should find valid query strings', function(done) {
            var input = ['foo', 1, {}];

            setQueryString(input, output, function() {
                expect(input).to.have.length(2);
                expect(input[0]).to.equal(1);
                expect(output).to.have.property('query', 'foo');
                done();
            });
        });

        it('should ignore everything else', function(done) {
            var input = [1, 'foo', 'bar'];

            setQueryString(input, output, function() {
                expect(input).to.have.length(3);
                expect(input[0]).to.equal(1);
                expect(output).to.not.have.property('query');
                done();
            });
        });

        it('should ignore empty input', function(done) {
            var input = [];

            setQueryString(input, output, function() {
                expect(output).to.not.have.property('query');
                done();
            });
        });
    });

    describe('when checking for callbacks', function() {
        it('should find valid callbacks', function(done) {
            var callback = function() {};
            var input = [1, 'foo', callback];

            setCallback(input, output, function() {
                expect(input).to.have.length(2);
                expect(input[1]).to.equal('foo');
                expect(output).to.have.property('callback', callback);
                done();
            });
        });

        it('should ignore everything else', function(done) {
            var input = [1, 'foo', 'bar'];

            setCallback(input, output, function() {
                expect(input).to.have.length(3);
                expect(input[2]).to.equal('bar');
                expect(output).to.not.have.property('callback');
                done();
            });
        });

        it('should ignore empty input', function(done) {
            var input = [];

            setCallback(input, output, function() {
                expect(output).to.not.have.property('callback');
                done();
            });
        });
    });

    describe('when checking for parameters objects', function() {
        it('should find valid parameters objects', function(done) {
            var parameters = { 'foo': 'bar' };
            var input = [1, 'foo', parameters];

            setParameters(input, output, function() {
                expect(input).to.have.length(2);
                expect(input[1]).to.equal('foo');
                expect(output).to.have.property('parameters', parameters);
                done();
            });
        });

        it('should ignore everything else', function(done) {
            var input = [1, 'foo', []];

            setParameters(input, output, function() {
                expect(input).to.have.length(3);
                expect(input[2]).to.eql([]);
                expect(output).to.have.property('parameters', 'default');
                done();
            });
        });

        it('should ignore empty input', function(done) {
            var input = [];

            setParameters(input, output, function() {
                expect(output).to.have.property('parameters', 'default');
                done();
            });
        });
    });

    describe('when checking for substitutions objects', function() {
        it('should find valid substitutions objects', function(done) {
            var substitutions = { 'foo': 'bar' };
            var input = [1, 'foo', substitutions];

            setSubstitutions(input, output, function() {
                expect(input).to.have.length(2);
                expect(input[1]).to.equal('foo');
                expect(output).to.have.property('substitutions', substitutions);
                done();
            });
        });

        it('should ignore everything else', function(done) {
            var input = [1, 'foo', []];

            setSubstitutions(input, output, function() {
                expect(input).to.have.length(3);
                expect(input[2]).to.eql([]);
                expect(output).to.have.property('substitutions', 'default');
                done();
            });
        });

        it('should ignore empty input', function(done) {
            var input = [];

            setSubstitutions(input, output, function() {
                expect(output).to.have.property('substitutions', 'default');
                done();
            });
        });
    });

    describe('when checking for statements', function() {
        it('should find valid statements', function(done) {
            var statements = [];
            var input = [statements, 'foo', 'bar'];

            setStatements(input, output, function() {
                expect(input).to.have.length(2);
                expect(input[0]).to.equal('foo');
                expect(output).to.have.property('statements', statements);
                done();
            });
        });

        it('should build a statement object if needed', function(done) {
            var input = ['foo', 'bar'];
            output.query = 'query';

            setStatements(input, output, function() {
                expect(input).to.have.length(2);
                expect(output).to.have.property('statements');
                expect(output.statements).to.eql([
                    { 'statement': 'query', 'parameters': 'default' }
                ]);

                done();
            });
        });

        it('should ignore everything else', function(done) {
            var input = [1, 'foo', 'bar'];

            setStatements(input, output, function() {
                expect(input).to.have.length(3);
                expect(input[2]).to.equal('bar');
                expect(output).to.have.property('statements', 'default');
                done();
            });
        });

        it('should ignore empty input', function(done) {
            var input = [];

            setStatements(input, output, function() {
                expect(output).to.have.property('statements', 'default');
                done();
            });
        });
    });

    describe('when checking for a query array', function() {
        it('should find valid query arrays', function(done) {
            var input = [['match', 'return'], 'foo', 'bar'];

            setQueryArray(input, output, function() {
                expect(input).to.have.length(2);
                expect(input[0]).to.equal('foo');
                expect(output).to.have.property('query', 'match\nreturn');
                done();
            });
        });

        it('should ignore everything else', function(done) {
            var input = [1, 'foo', 'bar'];

            setQueryArray(input, output, function() {
                expect(input).to.have.length(3);
                expect(input[2]).to.equal('bar');
                expect(output).to.not.have.property('query');
                done();
            });
        });

        it('should ignore empty input', function(done) {
            var input = [];

            setQueryArray(input, output, function() {
                expect(output).to.not.have.property('query');
                done();
            });
        });
    });
});

describe('Parsing arguments', function() {
    it('should work with fn(string, fn)', function(done) {
        var callback = function() {};
        args.parse(['query', callback], function(output) {
            expect(output).to.have.property('query', 'query');
            expect(output).to.have.property('callback', callback);

            expect(output).to.have.property('parameters');
            expect(output).to.have.property('substitutions');
            expect(output).to.have.property('statements');

            expect(output.parameters).to.be.empty();
            expect(output.substitutions).to.be.empty();
            expect(output.statements).to.eql([
                { 'statement': 'query', 'parameters': {} }
            ]);

            done();
        });
    });

    it('should work with fn(array:obj, fn)', function(done) {
        var callback = function() {};
        var array = [{ 'statement': 'query'} ];
        args.parse([array, callback], function(output) {
            expect(output).to.have.property('callback', callback);

            expect(output).to.have.property('parameters');
            expect(output).to.have.property('substitutions');
            expect(output).to.have.property('statements');

            expect(output.parameters).to.be.empty();
            expect(output.substitutions).to.be.empty();
            expect(output.statements).to.eql(array);

            done();
        });
    });

    it('should work with fn(int, fn)', function(done) {
        var callback = function() {};
        args.parse([1, callback], function(output) {
            expect(output).to.have.property('transactionID', 1);
            expect(output).to.have.property('callback', callback);

            expect(output).to.have.property('parameters');
            expect(output).to.have.property('substitutions');
            expect(output).to.have.property('statements');

            expect(output.parameters).to.be.empty();
            expect(output.substitutions).to.be.empty();

            done();
        });
    });

    it('should work with fn(string, obj, fn)', function(done) {
        var callback = function() {};
        var parameters = { 'foo': 'bar' };
        args.parse(['query', parameters, callback], function(output) {
            expect(output).to.have.property('query', 'query');
            expect(output).to.have.property('callback', callback);

            expect(output).to.have.property('parameters');
            expect(output).to.have.property('substitutions');
            expect(output).to.have.property('statements');

            expect(output.parameters).to.eql(parameters);
            expect(output.substitutions).to.be.empty();
            expect(output.statements).to.eql([
                { 'statement': 'query', 'parameters': parameters }
            ]);

            done();
        });
    });

    it('should work with fn(int, array:obj, fn)', function(done) {
        var callback = function() {};
        var array = [{ 'statement': 'foo' }];
        args.parse([1, array, callback], function(output) {
            expect(output).to.have.property('transactionID', 1);
            expect(output).to.have.property('statements');
            expect(output).to.have.property('callback', callback);

            expect(output).to.have.property('parameters');
            expect(output).to.have.property('substitutions');

            expect(output.parameters).to.be.empty();
            expect(output.substitutions).to.be.empty();
            expect(output.statements).to.eql(array);

            done();
        });
    });

    it('should work with fn(int, string, fn)', function(done) {
        var callback = function() {};
        args.parse([1, 'query', callback], function(output) {
            expect(output).to.have.property('transactionID', 1);
            expect(output).to.have.property('query', 'query');
            expect(output).to.have.property('callback', callback);

            expect(output).to.have.property('parameters');
            expect(output).to.have.property('substitutions');
            expect(output).to.have.property('statements');

            expect(output.parameters).to.be.empty();
            expect(output.substitutions).to.be.empty();
            expect(output.statements).to.eql([
                { 'statement': 'query', 'parameters': {} }
            ]);

            done();
        });
    });

    it('should work with fn(int, string, obj, fn)', function(done) {
        var callback = function() {};
        var parameters = { 'foo': 'bar' };
        args.parse([1, 'query', parameters, callback], function(output) {
            expect(output).to.have.property('transactionID', 1);
            expect(output).to.have.property('query', 'query');
            expect(output).to.have.property('callback', callback);

            expect(output).to.have.property('parameters');
            expect(output).to.have.property('substitutions');
            expect(output).to.have.property('statements');

            expect(output.parameters).to.eql(parameters);
            expect(output.substitutions).to.be.empty();
            expect(output.statements).to.eql([
                { 'statement': 'query', 'parameters': parameters }
            ]);

            done();
        });
    });

    it('should work with fn(string, obj, obj, fn)', function(done) {
        var callback = function() {};
        var parameters = { 'foo': 'bar' };
        var substitutions = { 'foobar': 'baz' };
        args.parse(['query', substitutions, parameters, callback],
            function(output) {
                expect(output).to.have.property('query', 'query');
                expect(output).to.have.property('callback', callback);

                expect(output).to.have.property('parameters');
                expect(output).to.have.property('substitutions');

                expect(output.parameters).to.eql(parameters);
                expect(output.substitutions).to.eql(substitutions);

                done();
            }
        );
    });

    it('should work with fn(array:string, fn)', function(done) {
        var callback = function() {};
        args.parse([['query', 'string'], callback], function(output) {
            expect(output).to.have.property('query', 'query\nstring');
            expect(output).to.have.property('callback', callback);

            expect(output).to.have.property('parameters');
            expect(output).to.have.property('substitutions');

            expect(output.parameters).to.be.empty();
            expect(output.substitutions).to.be.empty();

            done();
        });
    });

    it('should work with fn(array, obj, fn)', function(done) {
        var callback = function() {};
        var parameters = { 'foo': 'bar' };
        args.parse([['query', 'string'], parameters, callback],
            function(output) {
                expect(output).to.have.property('query', 'query\nstring');
                expect(output).to.have.property('callback', callback);

                expect(output).to.have.property('parameters');
                expect(output).to.have.property('substitutions');

                expect(output.parameters).to.eql(parameters);
                expect(output.substitutions).to.be.empty();

                done();
            }
        );
    });

    it('should work with fn(array, obj, obj, fn)', function(done) {
        var callback = function() {};
        var parameters = { 'foo': 'bar' };
        var substitutions = { 'foobar': 'baz' };
        args.parse([['query', 'string'], substitutions, parameters, callback],
            function(output) {
                expect(output).to.have.property('query', 'query\nstring');
                expect(output).to.have.property('callback', callback);

                expect(output).to.have.property('parameters');
                expect(output).to.have.property('substitutions');

                expect(output.parameters).to.eql(parameters);
                expect(output.substitutions).to.eql(substitutions);

                done();
            }
        );
    });
});