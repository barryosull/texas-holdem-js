
var Game = require('../domain/game');
var ChipsProjection = require('./chips-projection');

/**
 * @param game {Game}
 */
function ChipsQueryable(game)
{
    this.projection = new ChipsProjection(game);
}

ChipsQueryable.prototype.getPlayerChips = function(playerId)
{
    if (!playerId) {
        return null;
    }

    var playersToChips = this.projection.getPlayersToChips();

    return playersToChips[playerId];
};

ChipsQueryable.prototype.getNumberOfPlayersWithChips = function()
{
    var playersToChips = this.projection.getPlayersToChips();

    return Object.values(playersToChips).filter(chips => {
        return chips > 0;
    }).length;
};

module.exports = ChipsQueryable;