
var Game = require('./../domain/game');
var events = require('./../domain/events');

var SEAT_COUNT = 8;

/**
 * @param game {Game}
 */
var SeatsProjection = function(game)
{
    this.game = game;
};

SeatsProjection.prototype.isAdmin = function(playerId)
{
    var seatsToPlayers = mapSeatsToPlayerIds(this.game);

    for (var i = 0; i < SEAT_COUNT; i++) {
        if (seatsToPlayers[i]) {
            return seatsToPlayers[i] === playerId;
        }
    }

    return false;
};

SeatsProjection.prototype.getPlayers = function()
{
    return Object.values(mapSeatsToPlayerIds(this.game));
};

SeatsProjection.prototype.getPlayersSeat = function(playerId)
{
    var seats = this.game.events.project('app/seats.getPlayersSeat', (seats, e) => {
        if (e instanceof events.SeatTaken) {
            seats[e.playerId] = e.seat;
        }
        if (e instanceof events.SeatEmptied) {
            delete seats[e.playerId];
        }
        return seats;
    }, {});

    return seats[playerId] !== undefined ? seats[playerId] : false;
};

function mapSeatsToPlayerIds(game)
{
    return game.events.project('app/seats.mapSeatsToPlayerIds', (seatsToPlayerIds, e) => {
        if (e instanceof events.SeatTaken) {
            seatsToPlayerIds[e.seat] = e.playerId;
        }
        if (e instanceof events.SeatEmptied) {
            delete seatsToPlayerIds[e.seat];
        }
        return seatsToPlayerIds;
    }, {});
}

SeatsProjection.prototype.getPlayerInSeat = function(seat)
{
    var seatsToPlayers = this.game.events.project('app/seats.getPlayerInSeat', (seatsToPlayers, e) => {
        if (e instanceof events.SeatTaken) {
            seatsToPlayers[e.seat] = e.playerId;
        }
        if (e instanceof events.SeatEmptied) {
            delete seatsToPlayers[e.seat];
        }
        return seatsToPlayers;
    }, {});

    return seatsToPlayers[seat.toString()];
};

// TODO: Move into round projection, no need for it to be here
SeatsProjection.prototype.getRoundStarted = function()
{
    return this.game.events.project('app/seats.getRoundStarted', (value, e) => {
        if (e instanceof events.RoundStarted) {
            value =  e;
        }
        return value;
    }, null);
};

module.exports = SeatsProjection;