
const events = require('./events');

const SEAT_COUNT = 8;

/**
 * @param eventStream {EventStream}
 */
function SeatsProjection(eventStream)
{
    this.eventStream = eventStream;
}

SeatsProjection.prototype.getPlayersSeat = function(playerId)
{
    let seats =  this.eventStream.project('domain/seats.getPlayersSeat', (seats, e) => {
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

SeatsProjection.prototype.getFreeSeat = function()
{
    let seatsToPlayers = mapSeatsToPlayerIds(this.eventStream);

    for (let seat = 0; seat < SEAT_COUNT; seat++) {
        if (seatsToPlayers[seat] === undefined) {
            return seat;
        }
    }
    return null;
};

SeatsProjection.prototype.getActivePlayers = function()
{
    let playersInSeats = Object.values(mapSeatsToPlayerIds(this.eventStream));
    let playersWithChips = getPlayersToChips.call(this);

    return playersInSeats.filter(playerId => {
        return playersWithChips[playerId] > 0;
    });
};

function mapSeatsToPlayerIds(eventStream)
{
    return eventStream.project('domain/seats.mapSeatsToPlayerIds', (seatsToPlayerIds, e) => {
        if (e instanceof events.SeatTaken) {
            seatsToPlayerIds[e.seat] = e.playerId;
        }
        if (e instanceof events.SeatEmptied) {
            delete seatsToPlayerIds[e.seat];
        }
        return seatsToPlayerIds;
    }, {});
}

SeatsProjection.prototype.getRoundStarted = function()
{
    return  this.eventStream.project('domain/seats.getRoundStarted', (value, e) => {
        if (e instanceof events.RoundStarted) {
            return e;
        }
        return value;
    }, null);
};

SeatsProjection.prototype.getPlayerChips = function(playerId)
{
    let playersToChips = getPlayersToChips.call(this);
    return playersToChips[playerId] || 0;
};

function getPlayersToChips()
{
    return  this.eventStream.project('domain/chips.getPlayerChips', (playersToChips, e) => {
        if (e instanceof events.PlayerGivenChips) {
            playersToChips[e.playerId] = playersToChips[e.playerId] || 0;
            playersToChips[e.playerId] += e.amount;
        }
        if (e instanceof events.BetPlaced) {
            playersToChips[e.playerId] -= e.amount;
        }
        return playersToChips;
    }, {});
}

SeatsProjection.prototype.getNextThreePlayersAfterDealer = function()
{
    let lastRound = this.getRoundStarted();
    let activePlayers = this.getActivePlayers();
    let seat = -1;
    if (lastRound) {
        seat = this.getPlayersSeat(lastRound.dealer);
    }

    let seatsToPlayerIds = mapSeatsToPlayerIds(this.eventStream);

    let nextDealerSeat = getNextSeatWithActivePlayer(seatsToPlayerIds, activePlayers, seat);
    let smallBlindSeat = getNextSeatWithActivePlayer(seatsToPlayerIds, activePlayers, nextDealerSeat);
    let bigBlindSeat = getNextSeatWithActivePlayer(seatsToPlayerIds, activePlayers, smallBlindSeat);

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