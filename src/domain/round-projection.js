
var Game = require('./game');
var events = require('./events');
var WinnerCalculator = require('./winner-calculator');

/**
 * @param game {Game}
 */
var RoundProjection = function(game)
{
    this.game = game;
};

RoundProjection.prototype.getActiveHands = function()
{
    let hands = this.game.events.project('domain/round.getActiveHands', (hands, e) => {
        if (e instanceof events.RoundStarted) {
            hands = {};
        }
        if (e instanceof events.HandDealt) {
            hands[e.playerId] = {
                playerId: e.playerId,
                cards: e.cards,
            };
        }
        if (e instanceof events.HandFolded) {
            delete hands[e.playerId];
        }
        return hands;
    }, {});

    return Object.values(hands);
};

RoundProjection.prototype.getPlayerHand = function(playerId)
{
    return this.getActiveHands().filter(hand => {
        return hand.playerId === playerId;
    }).pop();
};

RoundProjection.prototype.getCommunityCards = function()
{
    return this.game.events.project('domain/round.getCommunityCards', (cards, e) => {
        if (e instanceof events.FlopDealt) {
            cards = e.cards;
        }
        if (e instanceof events.TurnDealt) {
            cards.push(e.card);
        }
        if (e instanceof events.RiverDealt) {
            cards.push(e.card);
        }
        if (e instanceof events.RoundStarted) {
            cards = [];
        }
        return cards;
    }, []);
};

RoundProjection.prototype.chooseWinningHand = function()
{
    var hands = this.getActiveHands();
    var communityCards = this.getCommunityCards();

    return WinnerCalculator.findWinner(hands, communityCards);
};

RoundProjection.prototype.getWinner = function()
{
    return this.game.events.project('domain/round.getWinner', (playerId, e) => {
        if (e instanceof events.HandWon) {
            return e.playerId;
        }
        return playerId;
    }, null);
};

RoundProjection.prototype.getWinnerByDefaultHand = function()
{
    var activeHands = this.getActiveHands();
    if (activeHands.length > 1) {
        return null;
    }
    return activeHands[0];
};

RoundProjection.prototype.getPot = function()
{
    return this.game.events.project('app/round.getPot', (pot, e) => {
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

RoundProjection.prototype.getPlayersBankruptedInRound = function()
{
    let playersToChips = this.game.events.project('domain/round.getPlayersBankruptedInRound', (playersToChips, e) => {

        if (e instanceof events.PlayerGivenChips) {
            playersToChips[e.playerId] = playersToChips[e.playerId] || 0;
            playersToChips[e.playerId] += e.amount;
        }
        if (e instanceof events.BetPlaced) {
            playersToChips[e.playerId] -= e.amount;
        }
        if (e instanceof events.PlayerBankrupted) {
            delete playersToChips[e.playerId];
        }
        return playersToChips;
    }, {});

    return Object.keys(playersToChips).reduce((bankruptPlayers, playerId) => {
        if (playersToChips[playerId] === 0) {
            bankruptPlayers.push(playerId);
        }
        return bankruptPlayers;
    }, []);
};

module.exports = RoundProjection;