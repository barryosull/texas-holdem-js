/**
 * @param cards {string[]}
 * @constructor
 */
function CommunityCards(cards)
{
    if (cards.length !== 5) {
        throw "Not enough cards to make a full community cards set. 5 required, " + cards.length + " found.";
    }
    this.cards = cards;
}
module.exports = CommunityCards;