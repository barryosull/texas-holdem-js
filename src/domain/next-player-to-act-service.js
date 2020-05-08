
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

    if (!this.hasActedOnce(playerId)) {
        return true;
    }

    if (this.hasBetMinAmountToPlay(playerId)) {
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