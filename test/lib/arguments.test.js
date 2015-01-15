var expect = require('chai').expect;
var parser = require('../../lib/argumentParser.js');

describe('When parsing arguments', function() {
    var callback;
    var statements;

    beforeEach(function(done) {
        callback = function() {};
        statements = [{ 'statement': 'query', 'parameters': {} }];
        done();
    });

    describe('for query', function() {
        it('should handle the two argument form', function(done) {
            var args = parser.parseQueryArguments('query', callback);

            expect(args).to.have.property('statements');
            expect(args).to.have.property('callback');
            expect(args).to.not.have.property('transactionID');

            expect(args.statements).to.eql(statements);
            expect(args.callback).to.eql(callback);

            done();
        });

        it('should handle the three argument form with transaction ID',
            function(done) {
                var args = parser.parseQueryArguments('query', 3, callback);

                expect(args).to.have.property('statements');
                expect(args).to.have.property('callback');
                expect(args).to.have.property('transactionID', 3);

                expect(args.statements).to.eql(statements);
                expect(args.callback).to.eql(callback);

                done();
            }
        );

        it('should handle the three arguments form with parameters',
            function(done) {
                var parameters = { 'foo': 'bar'};
                statements[0].parameters = parameters;

                var args = parser.parseQueryArguments('query', parameters,
                    callback);

                expect(args).to.have.property('statements');
                expect(args).to.have.property('callback');
                expect(args).to.not.have.property('transactionID');

                expect(args.statements).to.eql(statements);
                expect(args.callback).to.eql(callback);

                done();
            }
        );

        it('should handle the four argument form', function(done) {
            var parameters = { 'foo': 'bar'};
            statements[0].parameters = parameters;

            var args = parser.parseQueryArguments('query', parameters, 4,
                callback);

            expect(args).to.have.property('statements');
            expect(args).to.have.property('callback');
            expect(args).to.have.property('transactionID', 4);

            expect(args.statements).to.eql(statements);
            expect(args.callback).to.eql(callback);

            done();
        });

        it('should handle statements as arrays', function(done) {
            var args = parser.parseQueryArguments(statements, callback);

            expect(args).to.have.property('statements');
            expect(args).to.have.property('callback');
            expect(args).to.not.have.property('transactionID');

            expect(args.statements).to.eql(statements);
            expect(args.callback).to.eql(callback);

            done();
        });
    });

    describe('for buildStatement', function() {

    });
});