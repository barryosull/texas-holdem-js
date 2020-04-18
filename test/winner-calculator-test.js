
var WinnerCalculator = require('../src/domain/winner-calculator');
var Hand = require('../src/domain/hand');
var assert = require('assert');

describe('Find the clear winner in a round of texas holdem', () => {

    it('figures out who the winner is', () => {

        var handA = new Hand('a', ['10_of_spades', 'ace_of_diamonds']);
        var handB = new Hand('b', ['queen_of_clubs', 'jack_of_spades']);

        var cards = [ '2_of_diamonds', '10_of_diamonds', 'king_of_hearts', '8_of_diamonds', 'jack_of_diamonds'];

        var winner = WinnerCalculator.findWinner([handA, handB], cards);

        assert.equal(handA, winner);
    });
});