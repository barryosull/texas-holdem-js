
let NextPlayerToActService = {};

NextPlayerToActService.selectPlayer = function(
    lastPlayerToAct,
    playersInRound,
    playersThatFolded,
    playersToActionCount,
    playersToChipCount,
    playersToAmountBet
)
{
    let indexOfLastPlayerToAct = playersInRound.indexOf(lastPlayerToAct);

    let queryable = new CanPlayerActQueryable(
        playersThatFolded,
        playersToActionCount,
        playersToChipCount,
        playersToAmountBet
    );

    for (let i = 0; i < playersInRound.length; i++) {

        let offset = (i + indexOfLastPlayerToAct + 1) % playersInRound.length;
        if (queryable.canPlayerAct(playersInRound[offset])) {
            return playersInRound[offset];
        }
    }
    return;
};

function CanPlayerActQueryable(
    playersThatFolded,
    playersToActionCount,
    playersToChipCount,
    playersToAmountBet
)
{
    this.playersThatFolded = playersThatFolded;
    this.playersToActionCount = playersToActionCount;
    this.playersToChipCount = playersToChipCount;
    this.playersToAmountBet = playersToAmountBet;
}

CanPlayerActQueryable.prototype.canPlayerAct = function(playerId)
{
    if (this.hasPlayerFolded(playerId)) {
        return false;
    }
    if (!this.doesPlayerHaveChips(playerId)) {
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

CanPlayerActQueryable.prototype.hasPlayerFolded = function(playerId)
{
    return this.playersThatFolded.indexOf(playerId) !== -1;
};

CanPlayerActQueryable.prototype.doesPlayerHaveChips = function(playerId)
{
    return this.playersToChipCount[playerId] !== undefined && this.playersToChipCount[playerId] > 0;
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