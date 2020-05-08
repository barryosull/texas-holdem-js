
const NextPlayerToActService = require('../domain/next-player-to-act-service');
const RoundQueryable = require('../application/round-queryable');

/**
 * @param eventStream {EventStream}
 * @constructor
 */
function NextPlayerQueryable(eventStream)
{
    this.queryable = new RoundQueryable(eventStream);
}

NextPlayerQueryable.prototype.getNextPlayer = function()
{
    let lastActivePlayer = this.queryable.getLastActivePlayer() || this.queryable.getDealer();
    let playersInRound = this.queryable.getPlayersPlayingInRound();
    let playersThatFolded = this.queryable.getPlayersThatFolded();
    let playersThatActed = this.queryable.getPlayersThatActed();
    let playersWithChips = this.queryable.getPlayersWithChips();
    let playersToAmountBet = this.queryable.getPlayersToBetsInRound();

    return NextPlayerToActService.selectPlayer(
        lastActivePlayer,
        playersInRound,
        playersThatFolded,
        playersThatActed,
        playersWithChips,
        playersToAmountBet
    );
};

module.exports = NextPlayerQueryable;