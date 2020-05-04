
const Deck = require('./deck');
const events = require('./events');

/**
 * @param eventStream {EventStream}
 */
function DeckProjection(eventStream)
{
    this.eventStream = eventStream;
}

DeckProjection.prototype.getCards = function(number)
{
    let deckState = this.eventStream.project('domain/deck.getCards', (deckState, e) => {
        if (e instanceof events.RoundStarted) {
            deckState.seed = e.deckSeed;
            deckState.cardsDealt = 0;
        }
        if (e instanceof events.HandDealt) {
            deckState.cardsDealt += 2;
        }
        if (e instanceof events.FlopDealt) {
            deckState.cardsDealt += 3;
        }
        if (e instanceof events.TurnDealt) {
            deckState.cardsDealt += 1;
        }
        if (e instanceof events.RiverDealt) {
            deckState.cardsDealt += 1;
        }
        return deckState;
    }, {
        cardsDealt: 0,
        seed: 0
    },);

    let deck = Deck.makeNew(deckState.seed).burnCards(deckState.cardsDealt);

    return deck.getCards(number);
};

module.exports = DeckProjection;