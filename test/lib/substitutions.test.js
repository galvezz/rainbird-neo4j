var expect = require('chai').expect;

var substitutions = require('../../lib/substitutions.js');

describe('Substitutions', function() {
    it('should perform any given substitutions', function(done) {
        substitutions.find('MATCH (${x}) RETURN ${x}', { 'x': 'n' },
            function(err, statement) {
                expect(statement).to.equal('MATCH (n) RETURN n');
                done();
            }
        );
    });

    it('should ignore extra definitions of substitutions', function(done) {
        substitutions.find('MATCH (${x}) RETURN ${x}', { 'x': 'n', 'y': 'z' },
            function(err, statement) {
                expect(statement).to.equal('MATCH (n) RETURN n');
                done();
            });
    });

    it('should error if an undefined substitution is used', function(done) {
        substitutions.find('MATCH (${x}) RETURN n', {},
            function(err, statement) {
                expect(err).to.be.ok();
                expect(statement).to.not.be.ok();
                done();
            }
        );
    });

    it('should error if undefined substitutions are used', function(done) {
        substitutions.find('MATCH (${x}) RETURN ${y}', {},
            function(err, statement) {
                expect(err).to.be.ok();
                expect(statement).to.not.be.ok();
                done();
            }
        );
    });
});