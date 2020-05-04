
const ChipsProjection = require('./chips-projection');

/**
 * @param eventStream {EventStream}
 */
function ChipsQueryable(eventStream)
{
    this.projection = new ChipsProjection(eventStream);
}

ChipsQueryable.prototype.getPlayerChips = function(playerId)
{
    if (!playerId) {
        return null;
    }

    let playersToChips = this.projection.getPlayersToChips();

    return playersToChips[playerId];
};

ChipsQueryable.prototype.getNumberOfPlayersWithChips = function()
{
    let playersToChips = this.projection.getPlayersToChips();

    return Object.values(playersToChips).filter(chips => {
        return chips > 0;
    }).length;
};

module.exports = ChipsQueryable;