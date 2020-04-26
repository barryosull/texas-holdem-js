
var Game = require('./game');
var events = require('./events');
var Hand = require('./hand');
var Pot = require('./pot');
var CommunityCards = require('./community-cards');

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

/**
 * @param playerId
 * @returns {Hand}
 */
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

RoundProjection.prototype.getPot = function()
{
    return this.game.events.project('app/round.getPot', (pot, e) => {
        if (e instanceof events.PotWon) {
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
    let playerBets = getPlayerBets.call(this);

    let pots = [];

    while (playerBets.hasBets()) {

        let pot = playerBets.makePotFromMinAmountBet();
        playerBets = playerBets.reduceBetsByMinBet();

        pots.push(pot);
    }

    return pots;
};

function getPlayerBets()
{
    let playersToBets = this.game.events.project('domain/round.getPots', (playersToBets, e) => {
        if (e instanceof events.RoundStarted) {
            playersToBets = {};
        }
        if (e instanceof events.BetPlaced) {
            playersToBets[e.playerId] = playersToBets[e.playerId] || 0;
            playersToBets[e.playerId] += e.amount;
        }
        if (e instanceof events.PotWon) {
            playersToBets = {};
        }
        return playersToBets;
    }, {});

    return new PlayerBets(playersToBets);
}

function PlayerBets(playersToBets)
{
    this.playersToBets = playersToBets;
}

PlayerBets.prototype.hasBets = function()
{
    return Object.values(this.playersToBets).length !== 0;
};

PlayerBets.prototype.getMinBet = function()
{
    return Object.values(this.playersToBets).reduce((min, amount) => {
        min = (min !== null && min < amount) ? min : amount;
        return min;
    }, null);
};

PlayerBets.prototype.reduceBetsByMinBet = function()
{
    let minBet = this.getMinBet();

    let playersToBets = Object.keys(this.playersToBets).reduce((nextPotPlayersToBets, playerId) => {
        nextPotPlayersToBets[playerId] = this.playersToBets[playerId] - minBet;
        if (nextPotPlayersToBets[playerId] === 0) {
            delete nextPotPlayersToBets[playerId];
        }
        return nextPotPlayersToBets;
    }, {});

    return new PlayerBets(playersToBets);
};

PlayerBets.prototype.makePotFromMinAmountBet = function()
{
    let minBet = this.getMinBet();

    let amount = minBet * Object.values(this.playersToBets).length;
    let players = Object.keys(this.playersToBets).reduce((players, playerId) => {
        players.push(playerId);
        return players;
    }, []);

    return new Pot(amount, players);
};

module.exports = RoundProjection;