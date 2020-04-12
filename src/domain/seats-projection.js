
var Game = require('./game');
var events = require('./events');

const SEAT_COUNT = 8;

/**
 * @param game {Game}
 */
var SeatsProjection = function(game)
{
    this.game = game;
};

SeatsProjection.prototype.getPlayersSeat = function(playerId)
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

SeatsProjection.prototype.getFreeSeat = function()
{
    var seatsToPlayers = mapSeatsToPlayerIds(this.game);
    for (var seat = 0; seat < SEAT_COUNT; seat++) {
        if (seatsToPlayers[seat] === undefined) {
            return seat;
        }
    }
    return null;
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

function bankruptedPlayers(game)
{
    var playerIds = [];
    game.events.forEach(e => {
        if (e instanceof events.PlayerBankrupted) {
            playerIds.push(e.playerId);
        }
    });
    return playerIds;
}

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

SeatsProjection.prototype.makeSeatsViewModel = function()
{
    var viewModel = [];
    for (var seat = 0; seat < SEAT_COUNT; seat++) {
        var playerId = this.getPlayerInSeat(seat);
        var chips = this.getPlayerChips(playerId);
        viewModel.push({
            playerId: playerId,
            playerName: this.game.players.getPlayerName(playerId),
            chips: chips,
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

SeatsProjection.prototype.getNextDealer = function()
{
    let currentDealer = this.getDealer();
    var activePlayers = this.getActivePlayers();
    if (!currentDealer) {
        return activePlayers[0];
    }

    var seatsToPlayerIds = mapSeatsToPlayerIds(this.game);

    var seat = this.getPlayersSeat(currentDealer);

    for (let i = 0; i < SEAT_COUNT; i++) {
        let nextSeat = ((seat + 1) + i) % SEAT_COUNT;
        let playerId = seatsToPlayerIds[nextSeat];
        if (playerId && activePlayers.indexOf(playerId) !== -1) {
            return seatsToPlayerIds[nextSeat];
        }
    }
};

module.exports = SeatsProjection;