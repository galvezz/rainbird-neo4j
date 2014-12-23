var expect = require('chai').expect;
var Neo4j = require('../neo4j.js');

describe('Neo4j wrapper', function() {

    var db;

    before(function(done) {
        /* jshint sub: true */
        db = new Neo4j(process.env['NEO4J_TEST_URL'] || 'http://localhost:7474');
        /* jshint sub: false */

        db.query('MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r', done);
    });

    it('Should run a simple query with no parameters', function(done) {
        db.query('CREATE (n)', function(err, results) {
            expect(err).to.not.be.ok();
            expect(results).to.be.an('array');
            expect(results).to.have.length(1);
            expect(results[0]).to.have.property('columns');
            expect(results[0]).to.have.property('data');

            expect(results[0].columns).to.be.an('array');
            expect(results[0].columns).have.length(0);

            expect(results[0].data).to.be.an('array');
            expect(results[0].data).to.have.length(0);

            done();
        });
    });

    it('Should run a single query with parameters', function(done) {
        db.query(
            'CREATE (n {value: {value}}) return n', { 'value': 'param'},
            function(err, results) {
                expect(err).to.not.be.ok();
                expect(results).to.be.an('array');
                expect(results).to.have.length(1);
                expect(results[0]).to.have.property('columns');
                expect(results[0]).to.have.property('data');

                expect(results[0].columns).to.be.an('array');
                expect(results[0].columns).have.length(1);
                expect(results[0].columns[0]).to.equal('n');
                expect(results[0].data).to.be.an('array');
                expect(results[0].data).to.have.length(1);
                expect(results[0].data[0]).to.have.property('row');

                var rows = results[0].data[0].row;

                expect(rows).to.be.an('array');
                expect(rows).to.have.length(1);
                expect(rows[0]).to.have.property('value', 'param');

                done();
            }
        );
    });

    it('Should run a batch of queries', function(done) {
        var queries = [
            { 'statement': 'CREATE(:Foo)', 'parameters': {} },
            { 'statement': 'CREATE(:Bar)', 'parameters': {} },
            {
                'statement': 'CREATE (s:Test)-[r:Test]->(s:Test) RETURN r',
                'parameters': {}
            }

        ];

        db.query(queries, function(err, results) {
            expect(err).to.not.be.ok();
            expect(results).to.be.an('array');
            expect(results).to.have.length(3);
            expect(results[0]).to.have.property('columns');
            expect(results[0]).to.have.property('data');

            expect(results[0].columns).to.be.an('array');
            expect(results[0].columns).have.length(0);
            expect(results[0].data).to.be.an('array');
            expect(results[0].data).to.have.length(0);

            expect(results[1].columns).to.be.an('array');
            expect(results[1].columns).have.length(0);
            expect(results[1].data).to.be.an('array');
            expect(results[1].data).to.have.length(0);

            expect(results[2].columns).to.be.an('array');
            expect(results[2].columns).have.length(1);
            expect(results[2].columns[0]).to.equal('r');
            expect(results[2].data).to.be.an('array');
            expect(results[2].data).to.have.length(1);
            expect(results[2].data[0]).to.have.property('row');

            var rows = results[2].data[0].row;

            expect(rows).to.be.an('array');
            expect(rows).to.have.length(1);
            expect(rows[0]).to.be.empty();

            done();
        });
    });

    it('Should fail quietly with bad queries', function(done) {
        db.query('Duff query', {}, function(err, results) {
            expect(err).to.not.be.ok();
            expect(results).to.be.an('array');
            expect(results).to.have.length(0);
            done();
        });
    });

    it('Should pass errors through', function(done) {
        var error = new Neo4j('does not exist');
        error.query('barf and die', {}, function(err, results) {
            expect(err).to.be.ok();
            expect(results).to.not.be.ok();
            done();
        });

    });
});