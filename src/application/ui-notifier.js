
const SeatsQueryable = require('../application/seats-queryable');
const NextPlayerQueryable = require('../application/next-player-queryable');
const RoundQueryable = require('./round-queryable');
const ChipsQueryable = require('./chips-queryable');
const PlayersQueryable = require('./players-queryable');
const notifications = require('./notifications');
const eventTypes = require('../domain/events');


const SEAT_COUNT = 8;

//*********************************
// UI Notifier
//*********************************

// TODO: Extract out calls to usecases into process managers
function UiNotifier(notifier, socketMapper, useCases)
{
    this.notifier = notifier;
    this.socketMapper = socketMapper;
    this.useCases = useCases;
}

UiNotifier.prototype.handleEvents = function(events)
{
    const uiNotifier = this;
    events.project('uiNotifier.handleEvents', (_, e) => {
        if (e instanceof eventTypes.SeatTaken) {
            uiNotifier.playerAdded(events, e.playerId);
        }
        if (e instanceof eventTypes.FlopDealt) {
            uiNotifier.flopDealt(events);
        }
    }, null);
};

UiNotifier.prototype.playerAdded = function(events, playerId)
{
    let seatsQueryable = new SeatsQueryable(events);

    let player = createPlayer(events, playerId);
    let playersList = createPlayerList(events);
    let isAdmin = seatsQueryable.isAdmin(playerId);

    this.notifier.broadcast(events.gameId, new notifications.PlayerAdded(player, playersList , isAdmin));
};

UiNotifier.prototype.roundStarted = function(events)
{
    let roundQueryable = new RoundQueryable(events);

    let roundStartedNotification = createRoundStartedNotification(events);
    this.notifier.broadcast(events.gameId, roundStartedNotification);

    let hands = roundQueryable.getHands();

    hands.forEach(hand => {
        let socketId = this.socketMapper.getSocketIdForPlayer(hand.playerId);
        this.notifier.broadcastToPlayer(events.gameId, hand.playerId, socketId, new notifications.PlayerDealtHand(hand));
    });

    this.notifier.broadcast(events.gameId, createBetMadeNotification(events, roundQueryable.getSmallBlindPlayer()));
    this.notifier.broadcast(events.gameId, createBetMadeNotification(events, roundQueryable.getBigBlindPlayer()));

    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();
    if (nextPlayerToAct) {
        this.notifier.broadcast(events.gameId, createNextPlayersTurnNotification(events, nextPlayerToAct));
        return;
    }

    triggerNextAction.call(this, events);
};

UiNotifier.prototype.flopDealt = function(events)
{
    let roundQueryable = new RoundQueryable(events);

    let cards = roundQueryable.getCommunityCards().slice(0, 3);
    this.notifier.broadcast(events.gameId, new notifications.FlopDealt(cards));
    this.notifier.broadcast(events.gameId, createPotTotalNotification(events));

    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();
    if (nextPlayerToAct) {
        this.notifier.broadcast(events.gameId, createNextPlayersTurnNotification(events, nextPlayerToAct));
        return;
    }

    triggerNextAction.call(this, events);
};

UiNotifier.prototype.turnDealt = function(events)
{
    let roundQueryable = new RoundQueryable(events);

    let card = roundQueryable.getCommunityCards().slice(-1).pop();

    this.notifier.broadcast(events.gameId, new notifications.TurnDealt(card));
    this.notifier.broadcast(events.gameId, createPotTotalNotification(events));

    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();
    if (nextPlayerToAct) {
        this.notifier.broadcast(events.gameId, createNextPlayersTurnNotification(events, nextPlayerToAct));
        return;
    }

    triggerNextAction.call(this, events);
};

UiNotifier.prototype.riverDealt = function(events)
{
    let roundQueryable = new RoundQueryable(events);

    let card = roundQueryable.getCommunityCards().slice(-1).pop();

    this.notifier.broadcast(events.gameId, new notifications.RiverDealt(card));
    this.notifier.broadcast(events.gameId, createPotTotalNotification(events));

    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();
    if (nextPlayerToAct) {
        this.notifier.broadcast(events.gameId, createNextPlayersTurnNotification(events, nextPlayerToAct));
        return;
    }

    triggerNextAction.call(this, events);
};

UiNotifier.prototype.winnersAnnounced = function(events)
{
    let seatProjection = new SeatsQueryable(events);
    let roundQueryable = new RoundQueryable(events);
    let chipsQueryable = new ChipsQueryable(events);

    let winners = roundQueryable.getWinners();
    let players = seatProjection.getPlayers();

    winners.forEach(playerId => {
        let winningHand = roundQueryable.getPlayerHand(playerId);
        this.notifier.broadcast(events.gameId, new notifications.WinningHand(winningHand));
    });

    players.forEach(playerId => {
        let playerChips = chipsQueryable.getPlayerChips(playerId);
        this.notifier.broadcast(events.gameId, new notifications.PlayerGivenChips(playerId, playerChips));
    });


    if (chipsQueryable.getNumberOfPlayersWithChips() > 1) {
        triggerNextAction.call(this, events);
    }
};

UiNotifier.prototype.betPlaced = function(events, playerId)
{
    let notification = createBetMadeNotification(events, playerId);
    this.notifier.broadcast(events.gameId, notification);

    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();
    if (nextPlayerToAct) {
        this.notifier.broadcast(events.gameId, createNextPlayersTurnNotification(events, nextPlayerToAct));
        return;
    }

    triggerNextAction.call(this, events);
};

UiNotifier.prototype.handFolded = function(events, playerId)
{
    this.notifier.broadcast(events.gameId, new notifications.PlayerFolded(playerId));

    let seatProjection = new SeatsQueryable(events);
    let roundQueryable = new RoundQueryable(events);
    let chipsQueryable = new ChipsQueryable(events);

    let hands = roundQueryable.getHands();

    let activeHands = hands.filter(hand => {
        return hand.hasFolded === false;
    });

    if (activeHands.length === 1) {
        let winningHand = activeHands[0];
        this.notifier.broadcast(events.gameId, new notifications.WinnerByDefault(winningHand.playerId));

        let players = seatProjection.getPlayers();

        players.forEach(playerId => {
            let playerChips = chipsQueryable.getPlayerChips(playerId);
            this.notifier.broadcast(events.gameId, new notifications.PlayerGivenChips(playerId, playerChips));
        });

        triggerNextAction.call(this, events);

        return;
    }

    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();
    if (nextPlayerToAct) {
        this.notifier.broadcast(events.gameId, createNextPlayersTurnNotification(events, nextPlayerToAct));
        return;
    }

    triggerNextAction.call(this, events);
};

UiNotifier.prototype.playerGivenChips = function(events, playerId)
{
    let playerChips = (new ChipsQueryable(events)).getPlayerChips(playerId);
    this.notifier.broadcast(events.gameId, new notifications.PlayerGivenChips(playerId, playerChips));
};

function triggerNextAction(events)
{
    let roundQueryable = new RoundQueryable(events);
    let nextAction = roundQueryable.getNextAction();

    let actionToUseCase = {
        'deal': this.useCases.startRound,
        'flop': this.useCases.dealFlop,
        'turn': this.useCases.dealTurn,
        'river': this.useCases.dealRiver,
        'announceWinners': this.useCases.announceWinners
    };

    let actionTimeTimeouts = {
        'deal': 5000,
        'flop': 1000,
        'turn': 1000,
        'river': 1000,
        'announceWinners': 1000,
    };

    let nextUseCase = actionToUseCase[nextAction];

    if (!nextUseCase) {
        return;
    }

    let timeout = actionTimeTimeouts[nextAction] || 1000;

    let useCases = this.useCases;

    setTimeout(function(){
        nextUseCase.call(useCases, events.gameId);
    }, timeout);
}

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
    return new notifications.Player(playerId, name, chips, seat);
}

/**
 * @param events {EventStream}
 * @returns {notifications.RoundStarted}
 */
function createRoundStartedNotification(events)
{
    let roundQueryable = new RoundQueryable(events);

    let dealer = roundQueryable.getDealer();
    let playersList = createPlayerList(events);

    return new notifications.RoundStarted(dealer, playersList);
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
        players.push( new notifications.Player(playerId, name, chips, seat));
    }

    return players;
}

function createBetMadeNotification(events, playerId)
{
    let chipsQueryable = new ChipsQueryable(events);
    let roundQueryable = new RoundQueryable(events);

    let playerChips = chipsQueryable.getPlayerChips(playerId);
    let amountBetInBettingRound = roundQueryable.getPlayerBet(playerId);

    return new notifications.BetMade(playerId, amountBetInBettingRound, playerChips);
}

function createNextPlayersTurnNotification(events, nextPlayerToAct)
{
    let roundQueryable = new RoundQueryable(events);
    let chipsQueryable = new ChipsQueryable(events);

    let amountToPlay = roundQueryable.getAmountToPlay(nextPlayerToAct);
    let minBet = chipsQueryable.getSmallBlind() * 2;

    let playerChips = chipsQueryable.getPlayerChips(nextPlayerToAct);

    amountToPlay = Math.min(playerChips, amountToPlay);

    return new notifications.PlayersTurn(nextPlayerToAct, amountToPlay, minBet);
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

    return new notifications.PotTotal(pots);
}

module.exports = UiNotifier;
