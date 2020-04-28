
var Game = require('../domain/game');
var PlayersProjection = require('./players-projection');

/**
 * @param game {Game}
 */
var PlayersQueryable = function(game)
{
    this.projection = new PlayersProjection(game);
};

PlayersQueryable.prototype.getPlayerName = function(playerId)
{
    var playerIdToNames = this.projection.getPlayersToNames();

    return playerIdToNames[playerId] || "";
};

module.exports = PlayersProjection;