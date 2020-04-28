
var Game = require('./../domain/game');
var events = require('./../domain/events');

/**
 * @param game {Game}
 */
function SeatsProjection(game)
{
    this.game = game;
}

SeatsProjection.prototype.getPlayersToSeats = function()
{
    return this.game.events.project('app/seats.getPlayersToSeats', (seats, e) => {
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
    return this.game.events.project('app/seats.getSeatsToPlayers', (seatsToPlayerIds, e) => {
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