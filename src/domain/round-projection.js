
var Game = require('./game');
var events = require('./events');
var Hand = require('./hand');
var Pot = require('./pot');
var CommunityCards = require('./community-cards');
var WinnerCalculator = require('./winner-calculator');

/**
 * @param game {Game}
 */
var RoundProjection = function(game)
{
    this.game = game;
};

/**
 * @returns {Hand[]}
 */
RoundProjection.prototype.getActiveHands = function()
{
    let hands = this.game.events.project('domain/round.getActiveHands', (hands, e) => {
        if (e instanceof events.RoundStarted) {
            hands = {};
        }
        if (e instanceof events.HandDealt) {
            hands[e.playerId] = new Hand(e.playerId, e.cards);
        }
        if (e instanceof events.HandFolded) {
            delete hands[e.playerId];
        }
        return hands;
    }, {});

    return Object.values(hands);
};

/**
 * @returns {Hand[]}
 */
RoundProjection.prototype.getPlayerHands = function(players)
{
    let hands = this.getActiveHands();

    return hands.filter(hand => {
        return players.indexOf(hand.playerId) !== -1;
    });
};

RoundProjection.prototype.getPlayerHand = function(playerId)
{
    return this.getActiveHands().filter(hand => {
        return hand.playerId === playerId;
    }).pop();
};

/**
 * @returns {CommunityCards}
 */
RoundProjection.prototype.getCommunityCards = function()
{
    let cards = this.game.events.project('domain/round.getCommunityCards', (cards, e) => {
        if (e instanceof events.RoundStarted) {
            cards = [];
        }
        if (e instanceof events.FlopDealt) {
            cards = e.cards.slice();
        }
        if (e instanceof events.TurnDealt) {
            cards.push(e.card);
        }
        if (e instanceof events.RiverDealt) {
            cards.push(e.card);
        }
        return cards;
    }, []);

    return new CommunityCards(cards);
};

RoundProjection.prototype.chooseWinningHand = function(pot)
{
    let players = pot.players;
    let hands = this.getPlayerHands(players);
    let communityCards = this.getCommunityCards();
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

RoundProjection.prototype.getPots = function()
{
    let playersToBets = getPlayersToBets.call(this);

    let pots = [];

    while (Object.values(playersToBets).length !== 0) {

        let minBet = getMinBet(playersToBets);
        let pot = makePotFromMinAmountBet(playersToBets, minBet);

        pots.push(pot);

        playersToBets = reduceByMinBetAndRemove(playersToBets, minBet);
    }

    return pots;
};

function getPlayersToBets()
{
    return this.game.events.project('domain/round.getPots', (playersToBets, e) => {
        if (e instanceof events.HandWon) {
            playersToBets = {};
        }
        if (e instanceof events.RoundStarted) {
            playersToBets = {};
        }
        if (e instanceof events.BetPlaced) {
            playersToBets[e.playerId] = playersToBets[e.playerId] || 0;
            playersToBets[e.playerId] += e.amount;
        }
        return playersToBets;
    }, {});
}

function getMinBet(playersToBets)
{
    return Object.values(playersToBets).reduce((min, amount) => {
        min = (min !== null && min < amount) ? min : amount;
        return min;
    }, null);
}

function reduceByMinBetAndRemove(playersToBets, minBet)
{
    return Object.keys(playersToBets).reduce((nextPotPlayersToBets, playerId) => {
        nextPotPlayersToBets[playerId] = playersToBets[playerId] - minBet;
        if (nextPotPlayersToBets[playerId] === 0) {
            delete nextPotPlayersToBets[playerId];
        }
        return nextPotPlayersToBets;
    }, {});
}

function makePotFromMinAmountBet(playersToBets, minBet)
{
    let amount = minBet * Object.values(playersToBets).length;
    let players = Object.keys(playersToBets).reduce((players, playerId) => {
        players.push(playerId);
        return players;
    }, []);

    return new Pot(amount, players);
}

module.exports = RoundProjection;