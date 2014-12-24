var expect = require('chai').expect;
var Neo4j = require('../neo4j.js');

describe('Neo4j wrapper, when querying the database', function() {

    var db;

    before(function(done) {
        /* jshint sub: true */
        db = new Neo4j(process.env['NEO4J_TEST_URL'] || 'http://localhost:7474');
        /* jshint sub: false */

        db.query('MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r', done);
    });
    
    it('should run a simple query with no parameters', function(done) {
        db.query('CREATE (n)', function(err, results) {
            expect(err).to.not.be.ok();
            expect(results).to.be.an('array');
            expect(results).to.have.length(1);

            expect(results[0]).to.be.an('array');
            expect(results[0]).to.have.length(0);

            done();
        });
    });

    it('should run a single query with parameters', function(done) {
        db.query(
            'CREATE (n {value: {value}}) return n', { 'value': 'param'},
            function(err, results) {
                expect(err).to.not.be.ok();
                expect(results).to.be.an('array');
                expect(results).to.have.length(1);

                expect(results[0]).to.be.an('array');
                expect(results[0]).to.have.length(1);

                expect(results[0][0]).to.have.property('n');

                var data = results[0][0].n;

                expect(data).to.have.property('value', 'param');

                done();
            }
        );
    });

    it('should run a batch of queries', function(done) {
        var queries = [
            { 'statement': 'CREATE(:Foo)', 'parameters': {} },
            { 'statement': 'CREATE(:Bar)', 'parameters': {} },
            {
                'statement': 'CREATE (s:Foo)-[r:Foo]->(o:Foo) RETURN s, r, o',
                'parameters': {}
            }

        ];

        db.query(queries, function(err, results) {
            expect(err).to.not.be.ok();
            expect(results).to.be.an('array');
            expect(results).to.have.length(3);

            expect(results[0]).to.be.an('array');
            expect(results[0]).to.have.length(0);

            expect(results[1]).to.be.an('array');
            expect(results[1]).to.have.length(0);

            expect(results[2]).to.be.an('array');
            expect(results[2]).to.have.length(3);

            expect(results[2][0]).to.have.property('s');
            expect(results[2][0].s).to.be.empty();

            expect(results[2][1]).to.have.property('r');
            expect(results[2][1].r).to.be.empty();

            expect(results[2][2]).to.have.property('o');
            expect(results[2][2].o).to.be.empty();

            done();
        });
    });

    it('should fail quietly with bad queries', function(done) {
        db.query('Duff query', {}, function(err, results) {
            expect(err).to.not.be.ok();
            expect(results).to.be.an('array');
            expect(results).to.have.length(0);
            done();
        });
    });

    it('should pass errors through', function(done) {
        var error = new Neo4j('does not exist');
        error.query('barf and die', {}, function(err, results) {
            expect(err).to.be.ok();
            expect(results).to.be.an('array');
            expect(results).to.be.empty();
            done();
        });

    });
});