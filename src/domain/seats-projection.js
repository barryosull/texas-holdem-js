
var Game = require('./game');
var events = require('./events');

/**
 * @param game {Game}
 */
var SeatsProjection = function(game)
{
    this.game = game;
};

SeatsProjection.prototype.getSeat = function(playerId)
{
    return this.game.events.reduce((seat, e) => {
        if (e instanceof events.SeatTaken) {
            if (e.playerId === playerId) {
                return e.seat;
            }
        }
        return seat;
    }, false);
};

SeatsProjection.prototype.activePlayers = function()
{
    var playerIds = {};
    this.game.events.forEach(e => {
        if (e instanceof events.SeatTaken) {
            playerIds[e.seat] = e.playerId;
        }
        if (e instanceof events.SeatEmptied) {
            delete playerIds[e.seat];
        }
    });
    return Object.values(playerIds);
};

SeatsProjection.prototype.getPlayer = function(seat)
{
    return this.game.events.reduce((playerId, e) => {
        if (e instanceof events.SeatTaken) {
            if (e.seat === seat) {
                return e.playerId;
            }
        }
        if (e instanceof events.SeatEmptied) {
            return null;
        }
        return playerId;
    }, null);
};

SeatsProjection.prototype.makeSeatsViewModel = function()
{
    var viewModel = [];
    for (var seat = 0; seat < 8; seat++) {
        var playerId = this.getPlayer(seat);
        viewModel.push({
            playerId: playerId,
            playerName: this.game.players.getPlayerName(playerId),
            seat: seat
        });
    }
    return viewModel;
};


module.exports = SeatsProjection;