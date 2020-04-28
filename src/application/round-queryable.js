
const RoundProjection = require('./round-projection');
var Pot = require('../domain/pot');

/**
 * @param game {Game}
 */
var RoundQueryable = function(game)
{
    this.projection = new RoundProjection(game);
};

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
    let playersToBets = this.projection.getPlayersToBets();
    return playersToBets[playerId] || 0;
};

RoundQueryable.prototype.getNextPlayerToAct = function()
{
    let playersToActionCount = this.projection.getPlayersToActionCount();
    let playersToChipCount = this.projection.getPlayersToChips();
    let numberOfPlayersWithChips = getNumberOfPlayersWithChips(playersToChipCount);

    if (nobodyHasActed(playersToActionCount) && numberOfPlayersWithChips < 2) {
        return null;
    }

    let activePlayers = this.projection.getPlayersActiveInRound();
    let playersToAmountBet = this.projection.getPlayersToBets();

    if (hasEveryoneActed(activePlayers, playersToActionCount)
        && (hasEveryoneBetTheSameAmount(playersToAmountBet) || numberOfPlayersWithChips === 0)) {
        return null;
    }

    let lastActivePlayer = this.projection.getLastActivePlayer() || this.projection.getDealer();

    return getPlayerToLeftOfPlayer(lastActivePlayer, activePlayers);
};

RoundQueryable.prototype.getAmountToPlay = function(playerId)
{
    if (!playerId) {
        return null;
    }
    let bets = this.projection.getActivePlayersToAmountsBet();

    let playersBet = bets[playerId] || 0;

    let maxBet = Object.values(bets).reduce((maxBet, bet) => {
        if (maxBet < bet) {
            maxBet = bet;
        }
        return maxBet;
    }, 0);

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
    let playerBets = new PlayerBets(this.projection.getPlayersToBets());

    let pots = [];

    while (playerBets.hasBets()) {

        let pot = playerBets.makePotFromMinAmountBet();
        playerBets = playerBets.reduceBetsByMinBet();

        pots.push(pot);
    }

    return pots;
};

function getNumberOfPlayersWithChips(playersToChipCount)
{
    let playersWithChips = Object.values(playersToChipCount).filter(chipAmount => {
        return chipAmount > 0;
    });

    return playersWithChips.length;
}

function nobodyHasActed(playersToActionCount)
{
    return Object.values(playersToActionCount).reduce((value, actionCount) => {
        return value && actionCount === 0;
    }, true);
}

function hasEveryoneActed(activePlayers, playersToActionCount)
{
    let hasActionCountForEachPlayer = Object.values(playersToActionCount).length === activePlayers.length;

    let havePlayersActedOnce = Object.values(playersToActionCount).reduce((value, actionCount) => {
        return value && actionCount > 0;
    }, true);

    return hasActionCountForEachPlayer && havePlayersActedOnce;
}

function hasEveryoneBetTheSameAmount(playersToAmountBet)
{
    let amountsBet = Object.values(playersToAmountBet);

    return amountsBet.filter((bet, index) => {
        return amountsBet.indexOf(bet) === index;
    }).length === 1;
}

function getPlayerToLeftOfPlayer(playerId, activePlayers)
{
    let currPlayerIndex = activePlayers.indexOf(playerId);
    let nextPlayerIndex = ((currPlayerIndex + 1) % activePlayers.length);
    return activePlayers[nextPlayerIndex];
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

module.exports = RoundQueryable;