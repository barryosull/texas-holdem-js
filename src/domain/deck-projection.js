
var Game = require('./game');
var Deck = require('./deck');
var events = require('./events');

/**
 * @param game {Game}
 */
var DeckProjection = function(game)
{
    this.game = game;
};

DeckProjection.prototype.getCards = function(number)
{
    var seed = 0;
    var carsdDealt = 0;

    this.game.events.forEach(e => {
        if (e instanceof events.RoundStarted) {
            seed = e.deckSeed;
            carsdDealt = 0;
        }
        if (e instanceof events.HandDealt) {
            carsdDealt += 2;
        }
        if (e instanceof events.FlopDealt) {
            carsdDealt += 3;
        }
        if (e instanceof events.TurnDealt) {
            carsdDealt += 1;
        }
        if (e instanceof events.RiverDealt) {
            carsdDealt += 1;
        }
    });

    var deck = Deck.makeNew(seed).burnCards(carsdDealt);

    return deck.getCards(number);
};

module.exports = DeckProjection;