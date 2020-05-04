
const events = require('./../domain/events');

/**
 * @param eventStream {EventStream}
 */
function SeatsProjection(eventStream)
{
    this.eventStream = eventStream;
}

SeatsProjection.prototype.getPlayersToSeats = function()
{
    return this.eventStream.project('app/seats.getPlayersToSeats', (seats, e) => {
        if (e instanceof events.SeatTaken) {
            seats[e.playerId] = e.seat;
        }
        if (e instanceof events.SeatEmptied) {
            delete seats[e.playerId];
        }
        return seats;
    }, {});
};

SeatsProjection.prototype.getSeatsToPlayers = function()
{
    return this.eventStream.project('app/seats.getSeatsToPlayers', (seatsToPlayerIds, e) => {
        if (e instanceof events.SeatTaken) {
            seatsToPlayerIds[e.seat] = e.playerId;
        }
        if (e instanceof events.SeatEmptied) {
            delete seatsToPlayerIds[e.seat];
        }
        return seatsToPlayerIds;
    }, {});
};

module.exports = SeatsProjection;