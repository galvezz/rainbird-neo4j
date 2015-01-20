var expect = require('chai').expect;
var rewire = require('rewire');

var Neo4j = rewire('../neo4j.js');

describe('The query function', function() {
    describe('when running as a single transaction', function() {

        var db;
        var errors = [];

        before(function(done) {
            db = new Neo4j('http://localhost:7474');
            done();
        });

        beforeEach(function(done) {
            Neo4j.__set__({
                'request': {
                    'post': function(args, callback) {
                        callback(null,
                            { 'body': { 'results': args, 'errors': errors } });
                    }
                },
                'mapResults': function(results) { return results; }
            });

            done();
        });

        it('should run a simple query with no parameters', function(done) {
            db.query('test', function(err, results) {
                expect(err).to.not.be.ok();
                expect(results).to.have.property('uri');
                expect(results).to.have.property('json');

                var json = results.json;

                expect(json).to.have.property('statements');
                expect(json.statements).to.be.an('array');
                expect(json.statements).to.have.length(1);

                var result = json.statements[0];

                expect(result).to.have.property('statement', 'test');
                expect(result).to.have.property('parameters');
                expect(result.parameters).to.be.empty();

                done();
            });
        });

        it('should run a single query with parameters', function(done) {
            db.query('test', { 'param': 'value' }, function(err, results) {
                expect(err).to.not.be.ok();
                expect(results).to.have.property('uri');
                expect(results).to.have.property('json');

                var json = results.json;

                expect(json).to.have.property('statements');
                expect(json.statements).to.be.an('array');
                expect(json.statements).to.have.length(1);

                var result = json.statements[0];

                expect(result).to.have.property('statement', 'test');
                expect(result).to.have.property('parameters');
                expect(result.parameters).to.have.property('param', 'value');

                done();
            });
        });

        it('should run a batch of queries', function(done) {
            var statements = [
                { 'statement': 'test1', 'parameters': { 'param1': 'value1' } },
                { 'statement': 'test2', 'parameters': { 'param2': 'value2' } }
            ];

            db.query(statements, function(err, results) {
                expect(err).to.not.be.ok();
                expect(results).to.have.property('uri');
                expect(results).to.have.property('json');

                var json = results.json;

                expect(json).to.have.property('statements');
                expect(json.statements).to.be.an('array');
                expect(json.statements).to.have.length(2);

                var result = json.statements[0];

                expect(result).to.have.property('statement', 'test1');
                expect(result).to.have.property('parameters');
                expect(result.parameters).to.have.property('param1', 'value1');

                result = json.statements[1];

                expect(result).to.have.property('statement', 'test2');
                expect(result).to.have.property('parameters');
                expect(result.parameters).to.have.property('param2', 'value2');

                done();
            });
        });

        it('should pass errors from Neo4j through', function(done) {
            errors = [
                {
                    'code': 'Error code 1',
                    'message': 'Error message 1'
                },
                {
                    'code': 'Error code 2',
                    'message': 'Error message 2'
                }
            ];

            db.query('test', function(err, results, info) {
                expect(err).to.have.property('message');
                expect(info).to.have.property('statements');
                expect(info).to.have.property('errors');

                expect(info.errors).to.be.an('array');
                expect(info.errors).to.have.length(2);

                expect(results).to.be.an('array');
                expect(results).to.be.empty();

                done();
            });
        });

        it('should pass errors from the request through', function(done) {
            var mock = {
                'post': function(args, callback) {
                    callback(new Error('Error'));
                }
            };

            Neo4j.__set__('request', mock);

            db.query('test', function(err, results, info) {
                expect(err).to.have.property('message', 'Error');
                expect(info).to.have.property('statements');
                expect(info).to.have.property('errors');

                expect(info.errors).to.be.an('array');
                expect(info.errors).to.be.empty();
                expect(info.errors).to.be.empty();

                expect(results).to.be.an('array');
                expect(results).to.be.empty();

                done();
            });
        });

        it('should pass errors from the parser through', function(done) {
            db.query('${error}', function(err, results, info) {
                expect(err).to.have.property('message');
                expect(info).to.have.property('statements');
                expect(info).to.have.property('errors');

                expect(info.errors).to.be.an('array');
                expect(info.errors).to.be.empty();

                expect(results).to.be.an('array');
                expect(results).to.be.empty();

                done();
            });
        });
    });

    describe('when running in a larger transaction', function() {
        var db;
        var errors = [];
        var uri = 'http://localhost/db/data/transaction/1/commit';

        before(function(done) {
            db = new Neo4j('http://localhost:7474');
            done();
        });

        beforeEach(function(done) {
            Neo4j.__set__({
                'request': {
                    'post': function(args, callback) {
                        callback(null,
                            {
                                'body': {
                                    'commit': uri,
                                    'results': args,
                                    'errors': errors,
                                    'transaction': {
                                        'expires': 'expiry'
                                    }
                                }
                            }
                        );
                    }
                },
                'mapResults': function(results) { return results; }
            });

            done();
        });

        it('should set the transaction details', function(done) {
            db.query(1, 'test', function(err, results, info) {
                expect(err).to.not.be.ok();
                expect(results).to.have.property('uri');
                expect(results).to.have.property('json');

                var json = results.json;

                expect(json).to.have.property('statements');
                expect(json.statements).to.be.an('array');
                expect(json.statements).to.have.length(1);

                var result = json.statements[0];

                expect(result).to.have.property('statement', 'test');
                expect(result).to.have.property('parameters');
                expect(result.parameters).to.be.empty();

                expect(info).to.have.property('transactionID', 1);
                expect(info).to.have.property('timeout', 'expiry');

                done();
            });
        });
    });
});