
const SeatsQueryable = require('../application/seats-queryable');
const NextPlayerQueryable = require('../application/next-player-queryable');
const RoundQueryable = require('./round-queryable');
const ChipsQueryable = require('./chips-queryable');
const PlayersQueryable = require('./players-queryable');
const notificationsTypes = require('./notifications');
const eventTypes = require('../domain/events');

const SEAT_COUNT = 8;

//*********************************
// UI Notifier
//*********************************

function NotificationProjection()
{

}

/**
 * @param events
 * @returns {Array}
 */
NotificationProjection.prototype.handleEvents = function(events)
{
    const projection = this;

    let notifications = [];

    events.project('notificationProjection.handleEvents', (_, e) => {
        if (e instanceof eventTypes.SeatTaken) {
            notifications = notifications.concat(projection.playerAdded(events, e.playerId));
        }
        if (e instanceof eventTypes.RoundStarted) {
            notifications = notifications.concat(projection.roundStarted(events));
        }
        if (e instanceof eventTypes.FlopDealt) {
            notifications = notifications.concat(projection.flopDealt(events));
        }
        if (e instanceof eventTypes.TurnDealt) {
            notifications = notifications.concat(projection.turnDealt(events));
        }
        if (e instanceof eventTypes.RiverDealt) {
            notifications = notifications.concat(projection.riverDealt(events));
        }
        if (e instanceof eventTypes.BetPlaced) {
            notifications = notifications.concat(projection.betPlaced(events, e.playerId));
        }
        if (e instanceof eventTypes.HandFolded) {
            notifications = notifications.concat(projection.handFolded(events, e.playerId));
        }
        if (e instanceof eventTypes.PlayerGivenChips) {
            notifications = notifications.concat(projection.playerGivenChips(events, e.playerId));
        }
        if (e instanceof eventTypes.PotWon) {
            notifications = notifications.concat(projection.potWon(events, e.playerId));
        }
    }, null);

    return notifications;
};

/**
 * @param events
 * @param playerId
 * @returns {Array}
 */
NotificationProjection.prototype.playerAdded = function(events, playerId)
{
    let seatsQueryable = new SeatsQueryable(events);

    let player = createPlayer(events, playerId);
    let playersList = createPlayerList(events);
    let isAdmin = seatsQueryable.isAdmin(playerId);

    return [new notificationsTypes.PlayerAdded(player, playersList , isAdmin)];
};

/**
 * @param events
 * @returns {Array}
 */
NotificationProjection.prototype.roundStarted = function(events)
{
    let roundQueryable = new RoundQueryable(events);

    let notifications = [createRoundStartedNotification(events)];

    let hands = roundQueryable.getHands();

    hands.forEach(hand => notifications.push(new notificationsTypes.PlayerDealtHand(hand)));

    return notifications;
};

/**
 * @param events
 * @returns {Array}
 */
NotificationProjection.prototype.flopDealt = function(events)
{
    let roundQueryable = new RoundQueryable(events);

    let cards = roundQueryable.getCommunityCards().slice(0, 3);
    let notifications = [
        new notificationsTypes.FlopDealt(cards),
        createPotTotalNotification(events)
    ];

    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();
    if (nextPlayerToAct) {
        notifications.push(createNextPlayersTurnNotification(events, nextPlayerToAct));
        return notifications;
    }

    return [];
};

NotificationProjection.prototype.turnDealt = function(events)
{
    let roundQueryable = new RoundQueryable(events);

    let card = roundQueryable.getCommunityCards().slice(-1).pop();

    let notifications = [
        new notificationsTypes.TurnDealt(card),
        createPotTotalNotification(events)
    ];

    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();
    if (nextPlayerToAct) {
        notifications.push(createNextPlayersTurnNotification(events, nextPlayerToAct));
        return notifications;
    }

    return notifications;
};

/**
 * @param events
 * @returns {Array}
 */
NotificationProjection.prototype.riverDealt = function(events)
{
    let roundQueryable = new RoundQueryable(events);

    let card = roundQueryable.getCommunityCards().slice(-1).pop();

    let notifications = [
        new notificationsTypes.RiverDealt(card),
        createPotTotalNotification(events)
    ];

    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();
    if (nextPlayerToAct) {
        notifications.push(createNextPlayersTurnNotification(events, nextPlayerToAct));
    }

    return notifications;
};

/**
 * @param events
 * @param playerId
 * @returns {Array}
 */
NotificationProjection.prototype.potWon = function(events, playerId)
{
    let roundQueryable = new RoundQueryable(events);

    let hands = roundQueryable.getHands();

    let activeHands = hands.filter(hand => {
        return hand.hasFolded === false;
    });

    if (activeHands.length === 1) {
        let winningHand = activeHands[0];
        return [new notificationsTypes.WinnerByDefault(winningHand.playerId)];
    }

    let winningHand = roundQueryable.getPlayerHand(playerId);
    return [new notificationsTypes.WinningHand(winningHand)];
};

/**
 * @param events
 * @param playerId
 */
NotificationProjection.prototype.betPlaced = function(events, playerId)
{
    let notifications = [createBetMadeNotification(events, playerId)];

    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();

    if (nextPlayerToAct) {
        notifications.push(createNextPlayersTurnNotification(events, nextPlayerToAct));
    }

    return notifications;
};

/**
 * @param events
 * @param playerId
 * @returns {Array}
 */
NotificationProjection.prototype.handFolded = function(events, playerId)
{
    let notifications = [new notificationsTypes.PlayerFolded(playerId)];

    let roundQueryable = new RoundQueryable(events);

    let hands = roundQueryable.getHands();

    let activeHands = hands.filter(hand => {
        return hand.hasFolded === false;
    });

    if (activeHands.length === 1) {
        return [];
    }

    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();
    if (nextPlayerToAct) {
        notifications.push(createNextPlayersTurnNotification(events, nextPlayerToAct));
    }

    return notifications;
};

/**
 * @param events
 * @param playerId
 * @returns {Array}
 */
NotificationProjection.prototype.playerGivenChips = function(events, playerId)
{
    let playerChips = (new ChipsQueryable(events)).getPlayerChips(playerId);
    return [new notificationsTypes.PlayerGivenChips(playerId, playerChips)];
};

//*********************************
// Notifications creation methods
//*********************************

function createPlayer(events, playerId)
{
    const seatsQueryable = new SeatsQueryable(events);
    const chipsQueryable = new ChipsQueryable(events);
    const playersQueryable = new PlayersQueryable(events);

    let chips = chipsQueryable.getPlayerChips(playerId) || 0;
    let name = playersQueryable.getPlayerName(playerId);
    let seat = seatsQueryable.getPlayersSeat(playerId);
    return new notificationsTypes.Player(playerId, name, chips, seat);
}

/**
 * @param events {EventStream}
 * @returns {RoundStarted}
 */
function createRoundStartedNotification(events)
{
    let roundQueryable = new RoundQueryable(events);

    let dealer = roundQueryable.getDealer();
    let playersList = createPlayerList(events);

    return new notificationsTypes.RoundStarted(dealer, playersList);
}

function createPlayerList(events)
{
    const seatsQueryable = new SeatsQueryable(events);
    const chipsQueryable = new ChipsQueryable(events);
    const playersQueryable = new PlayersQueryable(events);

    let players = [];
    for (let seat = 0; seat < SEAT_COUNT; seat++) {
        let playerId = seatsQueryable.getPlayerInSeat(seat);
        let chips = chipsQueryable.getPlayerChips(playerId) || 0;
        let name = playersQueryable.getPlayerName(playerId);
        players.push( new notificationsTypes.Player(playerId, name, chips, seat));
    }

    return players;
}

function createBetMadeNotification(events, playerId)
{
    let chipsQueryable = new ChipsQueryable(events);
    let roundQueryable = new RoundQueryable(events);

    let playerChips = chipsQueryable.getPlayerChips(playerId);
    let amountBetInBettingRound = roundQueryable.getPlayerBet(playerId);

    return new notificationsTypes.BetMade(playerId, amountBetInBettingRound, playerChips);
}

function createNextPlayersTurnNotification(events, nextPlayerToAct)
{
    let roundQueryable = new RoundQueryable(events);
    let chipsQueryable = new ChipsQueryable(events);

    let amountToPlay = roundQueryable.getAmountToPlay(nextPlayerToAct);
    let minBet = chipsQueryable.getSmallBlind() * 2;

    let playerChips = chipsQueryable.getPlayerChips(nextPlayerToAct);

    amountToPlay = Math.min(playerChips, amountToPlay);

    return new notificationsTypes.PlayersTurn(nextPlayerToAct, amountToPlay, minBet);
}

function createPotTotalNotification(events)
{
    let roundQueryable = new RoundQueryable(events);

    let pots = roundQueryable.getPots().reduce((pots, pot) => {
        if (pot.players.length > 1) {
            pots.push(pot.amount);
        }
        return pots;
    }, []);

    return new notificationsTypes.PotTotal(pots);
}

module.exports = NotificationProjection;
