var expect = require('chai').expect;
var Neo4j = require('../neo4j.js');

describe('Neo4j wrapper, when querying the database', function() {
    var db;

    before(function(done) {
        /* jshint sub: true */
        db =
            new Neo4j(process.env['NEO4J_TEST_URL'] || 'http://localhost:7474');
        /* jshint sub: false */
        done();
    });

    beforeEach(function(done) {
        db.query('MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r', function() {
            done();
        });
    });

    it('should perform a transaction over multiple statements', function(done) {
        var transactionID;
        db.begin('CREATE (:A)', function(err, results, info) {
            transactionID = info.transactionID;
            db.query(transactionID, 'CREATE (:B)', function() {
                db.commit(transactionID, 'CREATE (:C)', function() {
                    db.query('MATCH (n) RETURN n',
                        function(err, results) {
                            expect(err).to.not.be.ok();
                            expect(results).to.have.length(1);
                            expect(results[0]).to.have.length(3);
                            done();
                        }
                    );
                });
            });
        });
    });

    it('should rollback transactions', function(done) {
        var transactionID;
        db.begin(function(err, results, info) {
            transactionID = info.transactionID;
            db.query(transactionID, 'CREATE (:A)', function() {
                db.rollback(transactionID, function() {
                    db.query('MATCH (n) RETURN n',
                        function(err, results) {
                            expect(err).to.not.be.ok();
                            expect(results).to.have.length(1);
                            expect(results[0]).to.have.length(0);
                            done();
                        }
                    );
                });
            });
        });
    });

    it('should allow simultaneous transactions', function(done) {
        var txn1;
        var txn2;

        db.begin(function(err, results, info) {
            txn1 = info.transactionID;
            db.begin(function(err, results, info) {
                txn2 = info.transactionID;
                db.rollback(txn1, function() {
                    db.rollback(txn2, function() {
                        done();
                    });
                });
            });
        });
    });
});