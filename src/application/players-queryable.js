
const PlayersProjection = require('./players-projection');

/**
 * @param eventStream {EventStream}
 */
function PlayersQueryable(eventStream)
{
    this.projection = new PlayersProjection(eventStream);
}

PlayersQueryable.prototype.getPlayerName = function(playerId)
{
    let playerIdToNames = this.projection.getPlayersToNames();

    return playerIdToNames[playerId] || "";
};

module.exports = PlayersQueryable;