
let NextPlayerToActService = {};

NextPlayerToActService.selectPlayer = function(
    lastPlayerToAct,
    playersInRound,
    playersThatFolded,
    playersThatActed,
    playersWithChips,
    playersToAmountBet
)
{
    let indexOfLastPlayerToAct = playersInRound.indexOf(lastPlayerToAct);

    let queryable = new CanPlayerActQueryable(
        playersThatFolded,
        playersThatActed,
        playersWithChips,
        playersToAmountBet
    );

    let playersThatCanAct = [];

    for (let i = 0; i < playersInRound.length; i++) {
        let offset = (i + indexOfLastPlayerToAct + 1) % playersInRound.length;
        if (queryable.canPlayerAct(playersInRound[offset])) {
            playersThatCanAct.push(playersInRound[offset]);
        }
    }

    if (playersThatActed.length === 0 && playersThatCanAct.length === 1) {
        return null;
    }

    if (playersThatCanAct.length === 0) {
        return null;
    }

    return playersThatCanAct[0];
};

function CanPlayerActQueryable(
    playersThatFolded,
    playersThatActed,
    playersWithChips,
    playersToAmountBet
)
{
    this.playersThatFolded = playersThatFolded;
    this.playersThatActed = playersThatActed;
    this.playersWithChips = playersWithChips;
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

    if (!this.hasPlayerActed(playerId)) {
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
    return this.playersWithChips.indexOf(playerId) !== -1;
};

CanPlayerActQueryable.prototype.hasBetMinAmountToPlay = function(playerId)
{
    let maxBet = Math.max(...Object.values(this.playersToAmountBet));

    return this.playersToAmountBet[playerId] === maxBet;
};

CanPlayerActQueryable.prototype.hasPlayerActed = function(playerId)
{
    return this.playersThatActed.indexOf(playerId) !== -1;
};

module.exports = NextPlayerToActService;