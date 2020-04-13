
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

    let cardsDealt = this.game.events.reduce((cardsDealt, e) => {
        if (e instanceof events.RoundStarted) {
            seed = e.deckSeed;
            cardsDealt = 0;
        }
        if (e instanceof events.HandDealt) {
            cardsDealt += 2;
        }
        if (e instanceof events.FlopDealt) {
            cardsDealt += 3;
        }
        if (e instanceof events.TurnDealt) {
            cardsDealt += 1;
        }
        if (e instanceof events.RiverDealt) {
            cardsDealt += 1;
        }
        return cardsDealt;
    }, 0);

    var deck = Deck.makeNew(seed).burnCards(cardsDealt);

    return deck.getCards(number);
};

module.exports = DeckProjection;