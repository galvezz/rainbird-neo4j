var expect = require('chai').expect;
var rewire = require('rewire');

var Neo4j = rewire('../neo4j.js');

describe('The commit function', function() {

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

    it('should allow commit with no query', function(done) {
        db.commit(1, function(err, results, info) {
            expect(err).to.not.be.ok();
            expect(results).to.have.property('uri');
            expect(results).to.have.property('json');

            var json = results.json;

            expect(json).to.have.property('statements');
            expect(json.statements).to.be.an('array');
            expect(json.statements).to.have.length(0);

            expect(info).to.have.property('transactionID', 1);
            expect(info).to.have.property('timeout', 'expiry');

            done();
        });
    });

    it('should run a query on commit with no parameters', function(done) {
        db.commit(1, 'test', function(err, results, info) {
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

    it('should run a single query on commit with parameters', function(done) {
        db.commit(1, 'test', { 'param': 'value' }, function(err, results, info) {
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

            expect(info).to.have.property('transactionID', 1);
            expect(info).to.have.property('timeout', 'expiry');

            done();
        });
    });

    it('should run a batch of queries on commit', function(done) {
        var statements = [
            { 'statement': 'test1', 'parameters': { 'param1': 'value1' } },
            { 'statement': 'test2', 'parameters': { 'param2': 'value2' } }
        ];

        db.commit(1, statements, function(err, results, info) {
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

            expect(info).to.have.property('transactionID', 1);
            expect(info).to.have.property('timeout', 'expiry');

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

        db.commit(1, 'test', function(err, results, info) {
            expect(err).to.have.property('message');
            expect(info).to.have.property('statements');
            expect(info).to.have.property('errors');

            expect(info.errors).to.be.an('array');
            expect(info.errors).to.have.length(2);

            expect(results).to.be.an('array');
            expect(results).to.be.empty();

            expect(info).to.have.property('transactionID', 1);
            expect(info).to.have.property('timeout', 'expiry');

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

        db.commit(1, 'test', function(err, results, info) {
            expect(err).to.have.property('message', 'Error');
            expect(info).to.have.property('statements');
            expect(info).to.have.property('errors');

            expect(info.errors).to.be.an('array');
            expect(info.errors).to.be.empty();
            expect(info.errors).to.be.empty();

            expect(results).to.be.an('array');
            expect(results).to.be.empty();

            expect(info).to.not.have.property('transactionID');
            expect(info).to.not.have.property('timeout');

            done();
        });
    });

    it('should pass errors from the parser through', function(done) {
        db.commit(1, '${error}', function(err, results, info) {
            expect(err).to.have.property('message');
            expect(info).to.have.property('statements');
            expect(info).to.have.property('errors');

            expect(info.errors).to.be.an('array');
            expect(info.errors).to.be.empty();

            expect(results).to.be.an('array');
            expect(results).to.be.empty();

            expect(info).to.not.have.property('transactionID');
            expect(info).to.not.have.property('timeout');

            done();
        });
    });

    it('should error if no transaction ID is provided', function(done) {
        db.commit('test', function(err, results, info) {
            expect(err).to.be.ok();

            expect(info).to.not.have.property('transactionID');
            expect(info).to.not.have.property('timeout');

            done();
        });
    });
});