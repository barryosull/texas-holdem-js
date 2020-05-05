
const RoundProjection = require('./round-projection');
const Pot = require('../domain/pot');

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
    if (noFurtherMovesCanBeMade(this.projection)) {
        return;
    }

    let lastActivePlayer = this.projection.getLastActivePlayer() || this.projection.getDealer();
    let activePlayers = this.projection.getPlayersActiveInRound();
    let playersToChipCount = this.projection.getPlayersToChips(activePlayers);

    let activePlayersWithChips = activePlayers.filter(playerId => {
        return playersToChipCount[playerId] !== 0;
    });

    return getPlayerToLeftOfPlayer(lastActivePlayer, activePlayersWithChips);
};

function noFurtherMovesCanBeMade(projection)
{
    let activePlayers = projection.getPlayersActiveInRound();
    let playersToActionCount = projection.getPlayersToActionCount();
    if (!hasEveryoneActed(activePlayers, playersToActionCount)) {
        return false;
    }

    let playersToChipCount = projection.getPlayersToChips(activePlayers);
    let numberOfPlayersWithChips = getNumberOfPlayersWithChips(playersToChipCount);
    if (isStartOfBetting(playersToActionCount) && numberOfPlayersWithChips <= 1) {
        return true;
    }

    let playersToAmountBet = projection.getPlayersToBetsInBettingRound(activePlayers);
    return (everyoneHasPaidFairlyIntoThePot(playersToAmountBet, playersToChipCount));
}

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
    let playerBets = new PlayerBets(this.projection.getPlayersToBetsInRound());

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

function isStartOfBetting(playersToActionCount)
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

function everyoneHasPaidFairlyIntoThePot(playersToAmountBet, playersToChipCount)
{
    let maxBet = Math.max(...Object.values(playersToAmountBet));

    let playersThatCanBet = Object.keys(playersToAmountBet).filter(playerId => {
        return playersToAmountBet[playerId] !== maxBet && playersToChipCount[playerId] !== 0;
    });

    return playersThatCanBet.length === 0;
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