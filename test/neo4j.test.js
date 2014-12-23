var expect = require('chai').expect;
var rewire = require('rewire');

var Neo4j = rewire('../neo4j.js');

describe('Neo4j wrapper (with mock request)', function() {

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

    it('Should run a simple query with no parameters', function(done) {
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

    it('Should run a single query with parameters', function(done) {
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

    it('Should run a batch of queries', function(done) {
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

    it('Should pass errors through', function(done) {
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