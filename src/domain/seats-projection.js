
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

SeatsProjection.prototype.getActivePlayers = function()
{
    var seatsToPlayerIds = mapSeatsToPlayerIds(this.game);
    return Object.values(seatsToPlayerIds);
};

function mapSeatsToPlayerIds(game)
{
    var seatsToPlayerIds = {};
    game.events.forEach(e => {
        if (e instanceof events.SeatTaken) {
            seatsToPlayerIds[e.seat] = e.playerId;
        }
        if (e instanceof events.SeatEmptied) {
            delete seatsToPlayerIds[e.seat];
        }
    });
    return seatsToPlayerIds;
}

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

SeatsProjection.prototype.getDealer = function()
{
    return this.game.events.reduce((value, e) => {
        if (e instanceof events.RoundStarted) {
            return e.dealer;
        }
        return value;
    }, null);
};

SeatsProjection.prototype.getNextDealer = function()
{
    var currentDealer = this.getDealer();
    if (!currentDealer) {
        return this.getActivePlayers()[0];
    }

    var seatsToPlayerIds = mapSeatsToPlayerIds(this.game);

    var seat = this.getSeat(currentDealer);
    var numberOfSeats = Object.keys(seatsToPlayerIds).length;

    for (var i = 0; i < numberOfSeats; i++) {
        var nextSeat = ((seat + 1) + i)%numberOfSeats;
        if (seatsToPlayerIds[nextSeat]) {
            return seatsToPlayerIds[nextSeat];
        }
    }
};


module.exports = SeatsProjection;