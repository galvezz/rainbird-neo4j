var expect = require('chai').expect;
var rewire = require('rewire');

var Neo4j = rewire('../neo4j.js');

describe('The resetTimeout function', function() {
    var db;
    var errors = [];
    var uri = 'http://localhost/db/data/transaction/1/commit';

    before(function(done) {
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

        db = new Neo4j('http://localhost:7474');

        done();
    });

    it('should run a an empty query', function(done) {
        db.resetTimeout(1, function(err, results) {
            expect(err).to.not.be.ok();
            expect(results).to.have.property('uri');
            expect(results).to.have.property('json');

            var json = results.json;

            expect(json).to.have.property('statements');
            expect(json.statements).to.be.an('array');
            expect(json.statements).to.have.length(0);

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

        db.resetTimeout(1, function(err, results, info) {
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

        db.resetTimeout(1, function(err, results, info) {
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
});