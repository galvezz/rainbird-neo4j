var expect = require('chai').expect;
var rewire = require('rewire');

var Neo4j = rewire('../neo4j.js');

describe('Neo4j wrapper', function() {
    describe('when building a statement', function() {

        it('should work with just a template defined', function(done) {
            Neo4j.compose('MATCH (n) RETURN n', function(err, statement) {
                expect(statement).to.have.property('statement',
                    'MATCH (n) RETURN n');
                expect(statement).to.have.property('parameters');
                expect(statement.parameters).to.be.empty();

                done();
            });
        });

        it('should handle statements as arrays', function(done) {
            Neo4j.compose(['MATCH (n)', 'RETURN n'], function(err, statement) {
                expect(statement).to.have.property('statement',
                    'MATCH (n)\nRETURN n');
                expect(statement).to.have.property('parameters');
                expect(statement.parameters).to.be.empty();

                done();
            });
        });

        it('should handle statements as arrays of Strings', function(done) {
            /* jshint ignore:start */
            var array = [String('MATCH (n)'), String('RETURN n')];
            /* jshint ignore:end */
            Neo4j.compose(array, function(err, statement) {
                expect(statement).to.have.property('statement',
                    'MATCH (n)\nRETURN n');
                expect(statement).to.have.property('parameters');
                expect(statement.parameters).to.be.empty();

                done();
            });
        });

        it('should perform any given substitutions', function(done) {
            Neo4j.compose('MATCH (${x}) RETURN ${x}', { 'x': 'n' }, {},
                function(err, statement) {
                    expect(statement).to.have.property('statement',
                        'MATCH (n) RETURN n');
                    expect(statement).to.have.property('parameters');
                    expect(statement.parameters).to.be.empty();

                    done();
                }
            );
        });

        it('should ignore extra definitions of substitutions', function(done) {
            Neo4j.compose('MATCH (${x}) RETURN ${x}', { 'x': 'n', 'y': 'z' },
                {}, function(err, statement) {
                    expect(statement).to.have.property('statement',
                        'MATCH (n) RETURN n');
                    expect(statement).to.have.property('parameters');
                    expect(statement.parameters).to.be.empty();

                    done();
                });
        });

        it('should error if an undefined substitution is used', function(done) {
            Neo4j.compose('MATCH (${x}) RETURN n', function(err) {
                expect(err).to.be.ok();
                done();
            });
        });

        it('should error if undefined substitutions are used', function(done) {
            Neo4j.compose('MATCH (${x}) RETURN ${y}', {}, {}, function(err) {
                    expect(err).to.be.ok();
                    done();
            });
        });

        it('should add parameter object', function(done) {
            Neo4j.compose('MATCH (n {value: {value}) RETURN n', {},
                { 'value': 'foo' }, function(err, statement) {
                    expect(statement).to.have.property('statement',
                        'MATCH (n {value: {value}) RETURN n');
                    expect(statement).to.have.property('parameters');
                    expect(statement.parameters).to.have.property('value',
                        'foo');
                    done();
                }
            );
        });

        it('should allow just parameters to be passed', function(done) {
            var parameters = { 'a': 'b' };
            Neo4j.compose('test', parameters, function(err, statement) {
                expect(statement).to.have.property('statement', 'test');
                expect(statement).to.have.property('parameters', parameters);
                done();
            });
        });
    });

    describe('when mapping results', function() {
        var mapResults = Neo4j.__get__('mapResults');

        it('should map rows to columns', function(done) {
            var data = [
                {
                    'columns': ['foo', 'bar'],
                    'data': [
                        {
                            'row': [
                                { 'type': 'String', 'value': 'one' },
                                { 'type': 'String', 'value': 'two' }
                            ]
                        }
                    ]
                }
            ];

            var results = mapResults(data);

            expect(results).to.be.an('array');
            expect(results).to.have.length(1);

            expect(results[0]).to.be.an('array');
            expect(results[0]).to.have.length(1);

            expect(results[0][0]).to.have.property('foo');
            expect(results[0][0].foo).to.have.property('type', 'String');
            expect(results[0][0].foo).to.have.property('value', 'one');

            expect(results[0][0]).to.have.property('bar');
            expect(results[0][0].bar).to.have.property('type', 'String');
            expect(results[0][0].bar).to.have.property('value', 'two');

            done();
        });

        it('should handle complex results', function(done) {
            var data = [
                {
                    'columns': ['foo'],
                    'data': [{ 'row': [{ 'type': 'String', 'value': 'one' }] }]
                },
                {
                    'columns': ['bar'],
                    'data': [{ 'row': [{ 'value': 'one' }] }]
                },
                {
                    'columns': ['baz'],
                    'data': [
                        { 'row': [{ 'type': 'String', 'value': 'one' }] },
                        { 'row': [{ 'type': 'String', 'value': 'two' }] },
                        { 'row': [{ 'value': 'three' }] }
                    ]
                }
            ];

            var results = mapResults(data);

            expect(results).to.be.an('array');
            expect(results).to.have.length(3);

            expect(results[0]).to.be.an('array');
            expect(results[0]).to.have.length(1);

            expect(results[0][0]).to.have.property('foo');
            expect(results[0][0].foo).to.have.property('type', 'String');
            expect(results[0][0].foo).to.have.property('value', 'one');

            expect(results[1]).to.be.an('array');
            expect(results[1]).to.have.length(1);

            expect(results[1][0]).to.have.property('bar');
            expect(results[1][0].bar).to.have.property('value', 'one');

            expect(results[2]).to.be.an('array');
            expect(results[2]).to.have.length(3);

            expect(results[2][0]).to.have.property('baz');
            expect(results[2][0].baz).to.have.property('type', 'String');
            expect(results[2][0].baz).to.have.property('value', 'one');

            expect(results[2][1]).to.have.property('baz');
            expect(results[2][1].baz).to.have.property('type', 'String');
            expect(results[2][1].baz).to.have.property('value', 'two');

            expect(results[2][2]).to.have.property('baz');
            expect(results[2][2].baz).to.have.property('value', 'three');

            done();
        });

        it('should return an empty array on error', function(done) {
            var results = mapResults('invalid results');

            expect(results).to.be.an('array');
            expect(results).to.be.empty();

            done();
        });
    });

    describe('when escaping identifiers', function() {

        it('Should handle complex strings', function(done) {
            expect(Neo4j.escape('a_:b c\'d')).to.equal('`a_:b c\'d`');
            done();
        });

        it('Should escape backticks', function(done) {
            expect(Neo4j.escape('a`b')).to.equal('`a``b`');
            done();
        });
    });
});