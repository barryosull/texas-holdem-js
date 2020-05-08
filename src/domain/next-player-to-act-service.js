
let NextPlayerToActService = {};

NextPlayerToActService.selectPlayer = function(
    lastPlayerToAct,
    playersWithChips,
    playersToActionCount,
    activeInRoundPlayers,
    playersToChipCount,
    playersToAmountBet
)
{
    if (noFurtherActionsCanBeMade(playersWithChips, playersToActionCount, playersToChipCount, playersToAmountBet)) {
        return;
    }

    return getPlayerToLeftOfPlayer(lastPlayerToAct, playersWithChips, activeInRoundPlayers);
};

function noFurtherActionsCanBeMade(playersWithChips, playersToActionCount, playersToChipCount, playersToAmountBet)
{
    if (waitingForPlayerToAct(playersWithChips, playersToActionCount)) {
        return false;
    }
    return (everyoneHasPaidFairlyIntoThePot(playersToAmountBet, playersToChipCount));
}

function getPlayerToLeftOfPlayer(lastActivePlayer, activePlayersWithChips, activeInRoundPlayers)
{
    let playerList = activeInRoundPlayers.filter(playerId => {
        return activePlayersWithChips.indexOf(playerId) !== -1 || playerId === lastActivePlayer;
    });
    let currPlayerIndex = playerList.indexOf(lastActivePlayer);
    let nextPlayerIndex = ((currPlayerIndex + 1) % playerList.length);
    return playerList[nextPlayerIndex];
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

NextPlayerToActService.selectPlayerImproved = function(
    lastPlayerToAct,
    playersWithChips,
    playersToActionCount,
    activeInRoundPlayers,
    playersToChipCount,
    playersToAmountBet
)
{
    let indexOfLastPlayer = activeInRoundPlayers.indexOf(lastPlayerToAct);

    let queryable = new CanPlayerActQueryable(
        playersWithChips,
        playersToActionCount,
        activeInRoundPlayers,
        playersToChipCount,
        playersToAmountBet
    );

    for (let i = 0; i < activeInRoundPlayers.length; i++) {
        let offset = (i + indexOfLastPlayer + 1) % activeInRoundPlayers.length;
        if (queryable.canPlayerAct(activeInRoundPlayers[offset])) {
            return activeInRoundPlayers[offset];
        }
    }
    return;
};

function CanPlayerActQueryable(
    playersWithChips,
    playersToActionCount,
    activeInRoundPlayers,
    playersToChipCount,
    playersToAmountBet
)
{
    this.playersToActionCount = playersToActionCount;
    this.activeInRoundPlayers = activeInRoundPlayers;
    this.playersToChipCount = playersToChipCount;
    this.playersToAmountBet = playersToAmountBet;
}

CanPlayerActQueryable.prototype.canPlayerAct = function(playerId)
{
    if (!this.doesPlayerHaveChips(playerId)) {
        return false;
    }

    if (this.hasPlayerFolded(playerId)) {
        return false;
    }

    if (this.hasBetMinAmountToPlay(playerId)) {
        return false;
    }

    if (!this.hasActedOnce(playerId)) {
        return false;
    }

    return true;
};

CanPlayerActQueryable.prototype.doesPlayerHaveChips = function(playerId)
{
    return this.playersToChipCount[playerId] !== undefined && this.playersToChipCount[playerId] > 0;
};

CanPlayerActQueryable.prototype.hasPlayerFolded = function(playerId)
{
    return this.activeInRoundPlayers.indexOf(playerId) === -1;
};

CanPlayerActQueryable.prototype.hasBetMinAmountToPlay = function(playerId)
{
    let maxBet = Math.max(...Object.values(this.playersToAmountBet));

    return this.playersToAmountBet[playerId] === maxBet;
};

CanPlayerActQueryable.prototype.hasActedOnce = function(playerId)
{
    return this.playersToActionCount[playerId] !== undefined && this.playersToActionCount[playerId] > 0;
};

module.exports = NextPlayerToActService;