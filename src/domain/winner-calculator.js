
const pokerTools = require('poker-tools');
const Hand = require('./hand');


let WinnerCalculator = {};

/**
 * @param hands {Hand[]}
 * @param communityCards {CommunityCards}
 * @returns {*}
 */
WinnerCalculator.findWinner = function(hands, communityCards)
{
    let pokerToolsHands = hands.map(hand => {
        return pokerTools.CardGroup.fromString(
            PokerToolsAdapter.convertToPokerToolsString(hand.cards)
        );
    });
    let board = pokerTools.CardGroup.fromString(
        PokerToolsAdapter.convertToPokerToolsString(communityCards.cards)
    );

    const result = pokerTools.OddsCalculator.calculateWinner(pokerToolsHands, board);

    var winnerIndex = result[0][0].index;

    return hands[winnerIndex];
};

/**
 * @param hand {Hand}
 * @param cards {String[]}
 * @returns {string}
 */
WinnerCalculator.getHandTitle = function(hand, cards)
{
    let pokerToolsHands = [hand].map(hand => {
        return pokerTools.CardGroup.fromString(
            PokerToolsAdapter.convertToPokerToolsString(hand.cards)
        );
    });

    let board = pokerTools.CardGroup.fromString(
        PokerToolsAdapter.convertToPokerToolsString(cards)
    );

    let result = pokerTools.OddsCalculator.calculateWinner(pokerToolsHands, board);

    let rank = parseInt(result[0][0].handrank.rank);

    let rankToTitle = {
        1: "high card",
        2: "pair",
        3: "two pair",
        4: "three of a kind",
        5: "straight",
        6: 'flush',
        7: "full house",
        8: "four of a kind",
        9: "straight flush",
    };

    return rankToTitle[rank];
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

