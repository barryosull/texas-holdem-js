
const events = require('../domain/events');

/**
 * @param eventStream {EventStream}
 */
function ChipsProjection(eventStream)
{
    this.eventStream = eventStream;
}

ChipsProjection.prototype.getPlayersToChips = function()
{
    return this.eventStream.project('app/chips.getPlayerChips', (playersToChips, e) => {
        if (e instanceof events.PlayerGivenChips) {
            playersToChips[e.playerId] = playersToChips[e.playerId] || 0;
            playersToChips[e.playerId] += e.amount;
        }
        if (e instanceof events.BetPlaced) {
            playersToChips[e.playerId] -= e.amount;
        }
        return playersToChips;
    }, {});
};

module.exports = ChipsProjection;