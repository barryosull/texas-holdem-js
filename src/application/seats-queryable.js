
var Game = require('./../domain/game');
var SeatsProjection = require('./seats-projection');

var SEAT_COUNT = 8;


/**
 * @param game {Game}
 */
function SeatsQueryable(game)
{
    this.game = game;
    this.projection = new SeatsProjection(game);
}

SeatsQueryable.prototype.isAdmin = function(playerId)
{
    var seatsToPlayers = this.projection.getSeatsToPlayers();

    for (var i = 0; i < SEAT_COUNT; i++) {
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
    var playersToSeats = this.projection.getPlayersToSeats();

    return playersToSeats[playerId] !== undefined ? playersToSeats[playerId] : false;
};

SeatsQueryable.prototype.getPlayerInSeat = function(seat)
{
    var seatsToPlayers = this.projection.getSeatsToPlayers();

    return seatsToPlayers[seat.toString()];
};

module.exports = SeatsQueryable;