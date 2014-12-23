var expect = require('chai').expect;
var rewire = require('rewire');

var Neo4j = rewire('../neo4j.js');

describe('Neo4j wrapper', function() {
    describe('when running a query (with mock request)', function() {

        var db;

        before(function(done) {
            var mock = {
                'post': function(args, callback) {
                    callback(null, { 'body': { 'results': args } });
                }
            };

            Neo4j.__set__('request', mock);
            db = new Neo4j('http://localhost:7474');

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

        it('should pass errors through', function(done) {
            var mock = {
                'post': function(args, callback) {
                    callback('Error');
                }
            };

            Neo4j.__set__('request', mock);

            db.query('test', function(err, results) {
                expect(err).to.equal('Error');
                expect(results).to.be.undefined();

                done();
            });
        });
    });

    describe('when building a statement', function() {

        var db = new Neo4j('http://localhost:7474');

        it('should work with just a template defined', function(done) {
            var statement = db.buildStatement('MATCH (n) RETURN n');

            expect(statement).to.have.property('statement',
                'MATCH (n) RETURN n');
            expect(statement).to.have.property('parameters');
            expect(statement.parameters).to.be.empty();

            done();
        });

        it('should handle statements as arrays', function(done) {
            var statement = db.buildStatement(['MATCH (n)', 'RETURN n']);

            expect(statement).to.have.property('statement',
                'MATCH (n)\nRETURN n');
            expect(statement).to.have.property('parameters');
            expect(statement.parameters).to.be.empty();

            done();
        });

        it('should perform any given substitutions', function(done) {
            var statement = db.buildStatement('MATCH (${x}) RETURN ${x}',
                { 'x': 'n' });

            expect(statement).to.have.property('statement',
                'MATCH (n) RETURN n');
            expect(statement).to.have.property('parameters');
            expect(statement.parameters).to.be.empty();

            done();
        });

        it('should ignore extra definitions of substitutions', function(done) {
            var statement = db.buildStatement('MATCH (${x}) RETURN ${x}',
                { 'x': 'n', 'y': 'z' });

            expect(statement).to.have.property('statement',
                'MATCH (n) RETURN n');
            expect(statement).to.have.property('parameters');
            expect(statement.parameters).to.be.empty();

            done();
        });

        it('should error if an undefined substitution is used', function(done) {
            expect(function() {
                db.buildStatement('MATCH (${x}) RETURN n');
            }).to.throw(Error);
            done();
        });

        it('should error if undefined substitutions are used', function(done) {
            expect(function() {
                db.buildStatement('MATCH (${x}) RETURN ${y}');
            }).to.throw(Error);
            done();
        });

        it('should add parameter object', function(done) {
            var statement = db.buildStatement(
                'MATCH (n {value: {value}) RETURN n', {}, { 'value': 'foo' });

            expect(statement).to.have.property('statement',
                'MATCH (n {value: {value}) RETURN n');
            expect(statement).to.have.property('parameters');
            expect(statement.parameters).to.have.property('value', 'foo');
            done();
        });
    });
});