
var Game = require('../domain/game');
var events = require('../domain/events');

/**
 * @param game {Game}
 */
var RoundProjection = function(game)
{
    this.game = game;
};

RoundProjection.prototype.getHands = function()
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
    return this.getHands().filter(hand => {
        return !hand.hasFolded;
    });
};

RoundProjection.prototype.getPlayerHand = function(playerId)
{
    return this.getHands().filter(hand => {
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

RoundProjection.prototype.getWinner = function()
{
    return this.game.events.reduce((playerId, e) => {
        if (e instanceof events.HandWon) {
            return e.playerId;
        }
        return playerId;
    }, null);
};

RoundProjection.prototype.getPot = function()
{
    return this.game.events.reduce((pot, e) => {
        if (e instanceof events.HandWon) {
            return 0;
        }
        if (e instanceof events.RoundStarted) {
            return 0;
        }
        if (e instanceof events.BetPlaced) {
            return pot + e.amount;
        }
        return pot;
    }, 0);
};

RoundProjection.prototype.getPlayerBet = function(playerId)
{
    return this.game.events.reduce((bet, e) => {
        if (e instanceof events.BettingRoundClosed) {
            return 0;
        }
        if (e instanceof events.HandWon) {
            return 0;
        }
        if (e instanceof events.BetPlaced) {
            if (e.playerId === playerId) {
                return bet + e.amount;
            }
        }
        return bet;
    }, 0);
};

RoundProjection.prototype.bankruptedInLastRound = function()
{
    var bankrupted = {};
    this.game.events.forEach(e => {
        if (e instanceof events.HandWon) {
            bankrupted = {};
        }
        if (e instanceof events.PlayerBankrupted) {
            bankrupted[e.playerId] = true;
        }
    });

    return Object.keys(bankrupted);
};

module.exports = RoundProjection;