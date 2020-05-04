
const events = require('../domain/events');

/**
 * @param eventStream {EventStream}
 */
function PlayersProjection(eventStream)
{
    this.eventStream = eventStream;
}

PlayersProjection.prototype.getPlayersToNames = function()
{
    return this.eventStream.project('app/players.getPlayerName', (map, e) => {
        if (e instanceof events.PlayerNamed) {
            map[e.playerId] =  e.name;
        }
        return map;
    }, {});
};

module.exports = PlayersProjection;