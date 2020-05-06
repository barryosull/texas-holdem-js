
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
    if (noFurtherActionsCanBeMade(this.projection)) {
        return;
    }

    let lastActivePlayer = this.projection.getLastActivePlayer() || this.projection.getDealer();
    let activeInRoundPlayers = this.projection.getPlayersActiveInRound();
    let activePlayersWithChips = getActivePlayersWithChips(this.projection);

    return getPlayerToLeftOfPlayer(lastActivePlayer, activePlayersWithChips, activeInRoundPlayers);
};

function noFurtherActionsCanBeMade(projection)
{
    let playersThatCanAct = getActivePlayersWithChips(projection);
    let playersToActionCount = projection.getPlayersToActionCount();

    if (waitingForPlayerToAct(playersThatCanAct, playersToActionCount)) {
        return false;
    }

    let playersToChipCount = projection.getPlayersToChips(playersThatCanAct);
    let playersToAmountBet = projection.getPlayersToBetsInBettingRound(playersThatCanAct);
    return (everyoneHasPaidFairlyIntoThePot(playersToAmountBet, playersToChipCount));
}

function getActivePlayersWithChips(projection)
{
    let activePlayers = projection.getPlayersActiveInRound();
    let playersToChipCount = projection.getPlayersToChips(activePlayers);
    let playersWithChips = getPlayersWithChips(playersToChipCount);

    return activePlayers.filter(playerId => {
        return playersWithChips.indexOf(playerId) !== -1;
    });
}

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
        this.projection.getPlayersActiveInRound()
    );

    let pots = [];

    while (playerBets.hasBets()) {

        let pot = playerBets.makePotFromMinAmountBet();
        playerBets = playerBets.reduceBetsByMinBet();

        pots.push(pot);
    }

    return pots;
};

function getPlayersWithChips(playersToChipCount)
{
    return Object.keys(playersToChipCount).filter(playerId => {
        return playersToChipCount[playerId] > 0;
    });
}

function waitingForPlayerToAct(activePlayers, playersToActionCount)
{
    return !activePlayers.reduce((hasActed, playerId) => {
        return hasActed && playersToActionCount[playerId] > 0;
    }, true);
}

function everyoneHasPaidFairlyIntoThePot(playersToAmountBet, playersToChipCount)
{
    let maxBet = Math.max(...Object.values(playersToAmountBet));

    let playersThatCanBet = Object.keys(playersToAmountBet).filter(playerId => {
        return playersToAmountBet[playerId] !== maxBet && playersToChipCount[playerId] !== 0;
    });

    return playersThatCanBet.length === 0;
}

function getPlayerToLeftOfPlayer(previousPlayerId, activePlayersWithChips, activeInRoundPlayers)
{
    let playerList = activeInRoundPlayers.filter(playerId => {
        return activePlayersWithChips.indexOf(playerId) !== -1 || playerId === previousPlayerId;
    });
    let currPlayerIndex = playerList.indexOf(previousPlayerId);
    let nextPlayerIndex = ((currPlayerIndex + 1) % playerList.length);
    return playerList[nextPlayerIndex];
}

function PlayerBets(playersToBets, activePlayers)
{
    this.playersToBets = playersToBets;
    this.activePlayers = activePlayers;
}

PlayerBets.prototype.hasBets = function()
{
    return Object.values(this.playersToBets).length !== 0;
};

PlayerBets.prototype.getMinBet = function()
{
    let activePlayers = this.activePlayers;
    let activePlayerBets = Object.keys(this.playersToBets).reduce((activePlayerBets, playerId) => {
        if (activePlayers.indexOf(playerId) !== -1) {
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

    return new PlayerBets(playersToBets, this.activePlayers);
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