
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

SeatsProjection.prototype.getActivePlayers = function()
{
    var playersInSeats = Object.values(mapSeatsToPlayerIds(this.game));
    var bankruptedPlayersIds = bankruptedPlayers(this.game);

    return playersInSeats.filter(playerId => {
        return !bankruptedPlayersIds.includes(playerId)
    });
};

SeatsProjection.prototype.hasPlayers = function()
{
    return Object.values(mapSeatsToPlayerIds(this.game)).length !== 0;
};

function bankruptedPlayers(game)
{
    return game.events.project('app/seats.bankruptedPlayers', (playerIds, e) => {
        if (e instanceof events.PlayerBankrupted) {
            playerIds.push(e.playerId);
        }
        return playerIds;
    }, []);
}

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