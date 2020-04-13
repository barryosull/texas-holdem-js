
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
    return game.events.reduce((playerIds, e) => {
        if (e instanceof events.PlayerBankrupted) {
            playerIds.push(e.playerId);
        }
        return playerIds;
    }, []);
}

function mapSeatsToPlayerIds(game)
{
    return game.events.reduce((seatsToPlayerIds, e) => {
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
    return this.game.events.reduce((playerId, e) => {
        if (e instanceof events.SeatTaken) {
            if (e.seat === seat) {
                return e.playerId;
            }
        }
        if (e instanceof events.SeatEmptied) {
            if (e.seat === seat) {
                return null;
            }
        }
        return playerId;
    }, null);
};

SeatsProjection.prototype.getRoundStarted = function()
{
    return this.game.events.reduce((value, e) => {
        if (e instanceof events.RoundStarted) {
            return e;
        }
        return value;
    }, null);
};

SeatsProjection.prototype.getPlayerChips = function(playerId)
{
    return this.game.events.reduce((chips, e) => {
        if (e instanceof events.PlayerGivenChips) {
            if (e.playerId === playerId) {
                return chips + e.amount;
            }
        }
        if (e instanceof events.BetPlaced) {
            if (e.playerId === playerId) {
                return chips - e.amount;
            }
        }
        return chips;
    }, 0);
};


module.exports = SeatsProjection;