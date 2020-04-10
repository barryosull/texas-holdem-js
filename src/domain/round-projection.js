
var Game = require('./game');
var events = require('./events');
var pokerTools = require('poker-tools');

/**
 * @param game {Game}
 */
var RoundProjection = function(game)
{
    this.game = game;
};

RoundProjection.prototype.hands = function()
{
    var hands = {};
    this.game.events.forEach(e => {
        if (e instanceof events.HandDealt) {
            hands[e.playerId] = {
                playerId: e.playerId,
                cards: e.cards,
                hasFolded: false
            };
        }
        if (e instanceof events.HandFolded) {
            hands[e.playerId].hasFolded = true;
        }
    });

    var activePlayers = this.game.seats.getActivePlayers();

    return Object.values(hands).filter(hand => {
        return activePlayers.indexOf(hand.playerId) !== -1;
    });
};

RoundProjection.prototype.activeHands = function()
{
    return this.hands().filter(hand => {
        return !hand.hasFolded;
    });
};

RoundProjection.prototype.getPlayerHand = function(playerId)
{
    return this.hands().filter(hand => {
        return hand.playerId === playerId;
    }).pop();
};

RoundProjection.prototype.getCommunityCards = function()
{
    var flop = [], turn = null, river = null;
    this.game.events.forEach(e => {
        if (e instanceof events.FlopDealt) {
            flop = e.cards;
        }
        if (e instanceof events.TurnDealt) {
            turn = e.card;
        }
        if (e instanceof events.RiverDealt) {
            river = e.card;
        }
        if (e instanceof events.RoundStarted) {
            flop = [], turn = null, river = null;
        }
    });

    var cards = flop.concat([turn, river]);

    return cards.filter(card => {
        return card != null;
    });
};

RoundProjection.prototype.chooseWinningHand = function()
{
    var hands = this.activeHands();
    var communityCards = this.getCommunityCards();

    var pokerToolsHands = hands.map(hand => {
        return pokerTools.CardGroup.fromString(
            PokerToolsAdapter.convertToPokerToolsString(hand.cards)
        );
    });
    var board = pokerTools.CardGroup.fromString(
        PokerToolsAdapter.convertToPokerToolsString(communityCards)
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

module.exports = RoundProjection;