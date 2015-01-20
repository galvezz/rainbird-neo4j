var expect = require('chai').expect;
var rewire = require('rewire');

var Neo4j = rewire('../neo4j.js');

describe('The rollback function', function() {

    var db;
    var errors = [];
    var uri = 'http://localhost/db/data/transaction/1/rollback';

    before(function(done) {
        Neo4j.__set__({
            'request': {
                'del': function(uri, callback) {
                    callback(null,
                        {
                            'body': {
                                'results': { 'uri': uri },
                                'errors': errors
                            }
                        }
                    );
                }
            },
            'mapResults': function(results) { return results; }
        });

        db = new Neo4j('http://localhost:7474');

        done();
    });

    it('should allow rollback', function(done) {
        db.rollback(1, function(err, results, info) {
            expect(err).to.not.be.ok();
            expect(results).to.have.property('uri');

            expect(info).to.have.property('transactionID', 1);

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

        db.rollback(1, function(err, results, info) {
            expect(err).to.have.property('message');
            expect(info).to.have.property('statements');
            expect(info).to.have.property('errors');

            expect(info.errors).to.be.an('array');
            expect(info.errors).to.have.length(2);

            expect(results).to.be.an('array');
            expect(results).to.be.empty();

            expect(info).to.have.property('transactionID', 1);

            done();
        });
    });

    it('should pass errors from the request through', function(done) {
        var mock = {
            'del': function(args, callback) {
                callback(new Error('Error'));
            }
        };

        Neo4j.__set__('request', mock);

        db.rollback(1, function(err, results, info) {
            expect(err).to.have.property('message', 'Error');
            expect(info).to.have.property('statements');
            expect(info).to.have.property('errors');

            expect(info.errors).to.be.an('array');
            expect(info.errors).to.be.empty();
            expect(info.errors).to.be.empty();

            expect(results).to.be.an('array');
            expect(results).to.be.empty();

            expect(info).to.have.property('transactionID', 1);

            done();
        });
    });

    it('should error if no transaction ID is provided', function(done) {
        db.rollback(1, function(err, results, info) {
            expect(err).to.be.ok();

            expect(info).to.have.property('transactionID', 1);
            expect(info).to.not.have.property('timeout');

            done();
        });
    });
});