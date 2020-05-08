
const events = require('./events');

/**
 * @param eventStream {EventStream}
 */
function ChipsProjection(eventStream)
{
    this.eventStream = eventStream;
}

ChipsProjection.prototype.getPlayerChips = function(playerId)
{
    let playersToChips = this.eventStream.project('domain/chips.getPlayerChips', (playersToChips, e) => {
        if (e instanceof events.PlayerGivenChips) {
            playersToChips[e.playerId] = playersToChips[e.playerId] || 0;
            playersToChips[e.playerId] += e.amount;
        }
        if (e instanceof events.BetPlaced) {
            playersToChips[e.playerId] -= e.amount;
        }
        return playersToChips;
    }, {});

    return playersToChips[playerId] || 0;
};

ChipsProjection.prototype.getSmallBlind = function()
{
    return this.eventStream.project('domain/chips.getSmallBlind', (amount, e) => {
        if (e instanceof events.SmallBlindSet) {
            amount = e.amount;
        }
        return amount;
    }, 20);
};

module.exports = ChipsProjection;