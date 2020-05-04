
const SeatsProjection = require('./seats-projection');

const SEAT_COUNT = 8;

/**
 * @param eventStream {EventStream}
 */
function SeatsQueryable(eventStream)
{
    this.projection = new SeatsProjection(eventStream);
}

SeatsQueryable.prototype.isAdmin = function(playerId)
{
    let seatsToPlayers = this.projection.getSeatsToPlayers();

    for (let i = 0; i < SEAT_COUNT; i++) {
        if (seatsToPlayers[i]) {
            return seatsToPlayers[i] === playerId;
        }
    }

    return false;
};

SeatsQueryable.prototype.getPlayers = function()
{
    return Object.values(this.projection.getSeatsToPlayers());
};

SeatsQueryable.prototype.getPlayersSeat = function(playerId)
{
    let playersToSeats = this.projection.getPlayersToSeats();

    return playersToSeats[playerId] !== undefined ? playersToSeats[playerId] : false;
};

SeatsQueryable.prototype.getPlayerInSeat = function(seat)
{
    let seatsToPlayers = this.projection.getSeatsToPlayers();

    return seatsToPlayers[seat.toString()];
};

module.exports = SeatsQueryable;