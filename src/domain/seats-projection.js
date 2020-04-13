
var Game = require('./game');
var events = require('./events');

var SEAT_COUNT = 8;

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

SeatsProjection.prototype.getNextThreePlayersAfterDealer = function()
{
    let lastRound = this.getRoundStarted();
    var activePlayers = this.getActivePlayers();
    var seat = -1;
    if (lastRound) {
        seat = this.getPlayersSeat(lastRound.dealer);
    }

    var seatsToPlayerIds = mapSeatsToPlayerIds(this.game);

    var nextDealerSeat = getNextSeatWithActivePlayer(seatsToPlayerIds, activePlayers, seat);
    var smallBlindSeat = getNextSeatWithActivePlayer(seatsToPlayerIds, activePlayers, nextDealerSeat);
    var bigBlindSeat = getNextSeatWithActivePlayer(seatsToPlayerIds, activePlayers, smallBlindSeat);

    return [
        seatsToPlayerIds[nextDealerSeat],
        seatsToPlayerIds[smallBlindSeat],
        seatsToPlayerIds[bigBlindSeat],
    ];
};

function getNextSeatWithActivePlayer(seatsToPlayerIds, activePlayers, seat)
{
    for (let i = 0; i < SEAT_COUNT; i++) {
        let nextSeat = ((seat + 1) + i) % SEAT_COUNT;
        let playerId = seatsToPlayerIds[nextSeat];
        if (playerId && activePlayers.indexOf(playerId) !== -1) {
            return nextSeat;
        }
    }
}

module.exports = SeatsProjection;