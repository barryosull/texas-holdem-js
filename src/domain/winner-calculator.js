
var pokerTools = require('poker-tools');
var Hand = require('./hand');


var WinnerCalculator = {};

/**
 * @param hands {Hand[]}
 * @param communityCards {CommunityCards}
 * @returns {*}
 */
WinnerCalculator.findWinner = function(hands, communityCards)
{
    var pokerToolsHands = hands.map(hand => {
        return pokerTools.CardGroup.fromString(
            PokerToolsAdapter.convertToPokerToolsString(hand.cards)
        );
    });
    var board = pokerTools.CardGroup.fromString(
        PokerToolsAdapter.convertToPokerToolsString(communityCards.cards)
    );

    const result = pokerTools.OddsCalculator.calculateWinner(pokerToolsHands, board);

    var winnerIndex = result[0][0].index;

    return hands[winnerIndex];
};

var PokerToolsAdapter = {};

PokerToolsAdapter.convertToPokerToolsString = function(cards)
{
    var convertedCards = cards.map(card => {
        var parts = card.split('_of_');
        var number = parts[0];
        if (number === "10") {
            number = "T";
        }
        if (PokerToolsAdapter.isFaceCard(number)) {
            number = number.charAt(0);
        }

        var suit = parts[1].charAt(0);
        return number.toUpperCase().concat(suit);
    });

    return convertedCards.join("");
};

PokerToolsAdapter.isFaceCard = function(number)
{
    return number.length > 2;
};

module.exports = WinnerCalculator;

