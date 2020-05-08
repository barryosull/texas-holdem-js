
const RoundProjection = require('./round-projection');
const Pot = require('../domain/pot');
const NextPlayerToActService = require('../domain/next-player-to-act-service');

/**
 * @param eventStream {EventStream}
 */
function RoundQueryable(eventStream)
{
    this.projection = new RoundProjection(eventStream);
}

RoundQueryable.prototype.getHands = function()
{
    return this.projection.getHands();
};

/**
 * @returns {Hand[]}
 */
RoundQueryable.prototype.getPlayerHands = function(players)
{
    let hands = this.projection.getHands();

    return hands.filter(hand => {
        return players.indexOf(hand.playerId) !== -1;
    });
};

RoundQueryable.prototype.getPlayerHand = function(playerId)
{
    return this.getHands().filter(hand => {
        return hand.playerId === playerId;
    }).pop();
};

/**
 * @return {String[]}
 */
RoundQueryable.prototype.getCommunityCards = function()
{
    return this.projection.getCommunityCards();
};

RoundQueryable.prototype.getNextAction = function()
{
    return this.projection.getNextAction();
};

RoundQueryable.prototype.getWinners = function()
{
    return this.projection.getWinners();
};

RoundQueryable.prototype.getPlayerBet = function(playerId)
{
    let playersToBets = this.projection.getPlayersToBetsInBettingRound();
    return playersToBets[playerId] || 0;
};

RoundQueryable.prototype.getNextPlayerToAct = function()
{
    let lastActivePlayer = this.projection.getLastActivePlayer() || this.projection.getDealer();
    let playersInRound = this.projection.getPlayersPlayingInRound();
    let playersThatFolded = this.projection.getPlayersThatFolded();
    let playersThatActed = this.projection.getPlayersThatActed();
    let playersWithChips = this.projection.getPlayersWithChips();
    let playersToAmountBet = this.projection.getPlayersToBetsInRound();

    return NextPlayerToActService.selectPlayer(
        lastActivePlayer,
        playersInRound,
        playersThatFolded,
        playersThatActed,
        playersWithChips,
        playersToAmountBet
    );
};

RoundQueryable.prototype.getAmountToPlay = function(playerId)
{
    if (!playerId) {
        return null;
    }
    let playersToBetsInBettingRound = this.projection.getPlayersToBetsInBettingRound();

    let playersBet = playersToBetsInBettingRound[playerId] || 0;
    let maxBet = Math.max(...Object.values(playersToBetsInBettingRound));

    return maxBet - playersBet;
};

RoundQueryable.prototype.getDealer = function()
{
    return this.projection.getRoundStarted().smallBlind;
};

RoundQueryable.prototype.getSmallBlindPlayer = function()
{
    return this.projection.getRoundStarted().smallBlind;
};

RoundQueryable.prototype.getBigBlindPlayer = function()
{
    return this.projection.getRoundStarted().bigBlind;
};

RoundQueryable.prototype.getPots = function()
{
    let playerBets = new PlayerBets(
        this.projection.getPlayersToBetsInRound(),
        this.projection.getPlayersThatFolded()
    );

    let pots = [];

    while (playerBets.hasBets()) {

        let pot = playerBets.makePotFromMinAmountBet();
        playerBets = playerBets.reduceBetsByMinBet();

        pots.push(pot);
    }

    return pots;
};

function PlayerBets(playersToBets, playerThatFolded)
{
    this.playersToBets = playersToBets;
    this.playerThatFolded = playerThatFolded;
}

PlayerBets.prototype.hasBets = function()
{
    return Object.values(this.playersToBets).length !== 0;
};

PlayerBets.prototype.getMinBet = function()
{
    let playerThatFolded = this.playerThatFolded;
    let activePlayerBets = Object.keys(this.playersToBets).reduce((activePlayerBets, playerId) => {
        if (playerThatFolded.indexOf(playerId) === -1) {
            activePlayerBets[playerId] = this.playersToBets[playerId];
        }
        return activePlayerBets;
    }, {});

    return Object.values(activePlayerBets).reduce((min, amount) => {
        min = (min !== null && min < amount) ? min : amount;
        return min;
    }, null);
};

PlayerBets.prototype.reduceBetsByMinBet = function()
{
    let minBet = this.getMinBet();

    let playersToBets = Object.keys(this.playersToBets).reduce((nextPotPlayersToBets, playerId) => {
        nextPotPlayersToBets[playerId] = Math.max(this.playersToBets[playerId] - minBet, 0);
        if (nextPotPlayersToBets[playerId] === 0) {
            delete nextPotPlayersToBets[playerId];
        }
        return nextPotPlayersToBets;
    }, {});

    return new PlayerBets(playersToBets, this.playerThatFolded);
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

module.exports = RoundQueryable;