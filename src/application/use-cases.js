
const SeatsQueryable = require('../application/seats-queryable');
const RoundQueryable = require('./round-queryable');
const ChipsQueryable = require('./chips-queryable');
const PlayersQueryable = require('./players-queryable');
const WinnerCalculator = require('../domain/winner-calculator');
const notifications = require('./notifications');

const SEAT_COUNT = 8;

function UseCases(notifier, socketMapper)
{
    this.notifier = notifier;
    this.socketMapper = socketMapper;
}

UseCases.prototype.existingPlayer = function(game, playerId, socketId)
{
    this.notifier.broadcastToPlayer(game.id, playerId, socketId, new notifications.ExistingSession());
};

UseCases.prototype.joinGame = function(game, playerId, playerName)
{
    game.addPlayer(playerId, playerName);

    let seatsQueryable = new SeatsQueryable(game);

    let player = createPlayer(game, playerId);
    let playersList = createPlayerList(game);
    let isAdmin = seatsQueryable.isAdmin(playerId);

    this.notifier.broadcast(game.id, new notifications.PlayerAdded(player, playersList , isAdmin));
};

UseCases.prototype.dealCards = function(game)
{
    this.removeDisconnectedPlayers(this, game);

    game.startNewRound();

    let roundQueryable = new RoundQueryable(game);

    let roundStartedNotification = createRoundStartedNotification(game);
    this.notifier.broadcast(game.id, roundStartedNotification);

    let hands = roundQueryable.getHands();

    hands.forEach(hand => {
        let socketId = this.socketMapper.getSocketIdForPlayer(hand.playerId);
        let handTitle = WinnerCalculator.getHandTitle(hand, []);
        this.notifier.broadcastToPlayer(game.id, hand.playerId, socketId, new notifications.PlayerDealtHand(hand));
        this.notifier.broadcastToPlayer(game.id, hand.playerId, socketId, new notifications.PlayerHandTitle(handTitle));
    });

    this.notifier.broadcast(game.id, createBetMadeNotification(game, roundQueryable.getSmallBlindPlayer()));
    this.notifier.broadcast(game.id, createBetMadeNotification(game, roundQueryable.getBigBlindPlayer()));

    let nextPlayerToAct = roundQueryable.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

UseCases.prototype.removeDisconnectedPlayers = function(controller, game)
{
    let seatsQueryable = new SeatsQueryable(game);

    let players = seatsQueryable.getPlayers();

    let disconnectedPlayers = players.filter(playerId => {
        return !this.socketMapper.hasSocketForPlayer(playerId);
    });

    disconnectedPlayers.forEach(playerId => {
        game.removePlayer(playerId);
    });
};

UseCases.prototype.dealFlop = function(game)
{
    game.dealFlop();

    let roundQueryable = new RoundQueryable(game);

    let cards = roundQueryable.getCommunityCards().slice(0, 3);
    this.notifier.broadcast(game.id, new notifications.FlopDealt(cards));
    this.notifier.broadcast(game.id, makePotTotalNotification(game));

    let nextPlayerToAct = roundQueryable.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

function makePotTotalNotification(game)
{
    let roundQueryable = new RoundQueryable(game);

    let pots = roundQueryable.getPots().reduce((pots, pot) => {
        if (pot.players.length > 1) {
            pots.push(pot.amount);
        }
        return pots;
    }, []);

    return new notifications.PotTotal(pots);
}

UseCases.prototype.dealTurn = function(game)
{
    game.dealTurn();

    let roundQueryable = new RoundQueryable(game);

    let card = roundQueryable.getCommunityCards().slice(-1).pop();

    this.notifier.broadcast(game.id, new notifications.TurnDealt(card));
    this.notifier.broadcast(game.id, makePotTotalNotification(game));

    let nextPlayerToAct = roundQueryable.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

UseCases.prototype.dealRiver = function(game)
{
    game.dealRiver();

    let roundQueryable = new RoundQueryable(game);

    let card = roundQueryable.getCommunityCards().slice(-1).pop();

    this.notifier.broadcast(game.id, new notifications.RiverDealt(card));
    this.notifier.broadcast(game.id, makePotTotalNotification(game));

    let nextPlayerToAct = roundQueryable.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

UseCases.prototype.finish = function(game)
{
    game.finish();

    let seatProjection = new SeatsQueryable(game);
    let roundQueryable = new RoundQueryable(game);
    let chipsQueryable = new ChipsQueryable(game);

    let winners = roundQueryable.getWinners();
    let players = seatProjection.getPlayers();

    winners.forEach(playerId => {
        let winningHand = roundQueryable.getPlayerHand(playerId);
        this.notifier.broadcast(game.id, new notifications.WinningHand(winningHand));
    });

    players.forEach(playerId => {
        let playerChips = chipsQueryable.getPlayerChips(playerId);
        this.notifier.broadcast(game.id, new notifications.PlayerGivenChips(playerId, playerChips));
    });

    if (chipsQueryable.getNumberOfPlayersWithChips() > 1) {
        triggerNextAction.call(this, game);
    }
};

UseCases.prototype.placeBet = function(game, playerId, amount)
{
    game.placeBet(playerId, amount);

    let notification = createBetMadeNotification(game, playerId);
    this.notifier.broadcast(game.id, notification);

    let roundQueryable = new RoundQueryable(game);
    let nextPlayerToAct = roundQueryable.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

UseCases.prototype.foldHand = function(game, playerId)
{
    game.foldHand(playerId);

    this.notifier.broadcast(game.id, new notifications.PlayerFolded(playerId));

    let roundQueryable = new RoundQueryable(game);
    let chipsQueryable = new ChipsQueryable(game);

    let hands = roundQueryable.getHands();

    let activeHands = hands.filter(hand => {
        return hand.hasFolded === false;
    });

    if (activeHands.length === 1) {
        let winningHand = activeHands[0];
        let playerChips = chipsQueryable.getPlayerChips(winningHand.playerId);
        this.notifier.broadcast(game.id, new notifications.WinnerByDefault(winningHand.playerId));
        this.notifier.broadcast(game.id, new notifications.PlayerGivenChips(playerId, playerChips));

        triggerNextAction.call(this, game);

        return;
    }

    let nextPlayerToAct = roundQueryable.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

UseCases.prototype.givePlayerChips = function(game, playerId, amount)
{
    game.givePlayerChips(playerId, amount);

    let playerChips = (new ChipsQueryable(game)).getPlayerChips(playerId);
    this.notifier.broadcast(game.id, new notifications.PlayerGivenChips(playerId, playerChips));
};

function triggerNextAction(game)
{
    let roundQueryable = new RoundQueryable(game);
    let nextAction = roundQueryable.getNextAction();

    let actionToUseCase = {
        'deal': this.dealCards,
        'flop': this.dealFlop,
        'turn': this.dealTurn,
        'river': this.dealRiver,
        'finish': this.finish
    };

    let actionTimeTimeouts = {
        'deal': 5000,
        'flop': 1000,
        'turn': 1000,
        'river': 1000,
        'finish': 1000,
    };

    let nextUseCase = actionToUseCase[nextAction];

    if (!nextUseCase) {
        return;
    }

    let timeout = actionTimeTimeouts[nextAction] || 1000;

    let useCases = this;

    setTimeout(function(){
        nextUseCase.call(useCases, game);
    }, timeout);
}

//*********************************
// Notifications creation methods
//*********************************

function createPlayer(game, playerId)
{
    const seatsQueryable = new SeatsQueryable(game);
    const chipsQueryable = new ChipsQueryable(game);
    const playersQueryable = new PlayersQueryable(game);

    let chips = chipsQueryable.getPlayerChips(playerId) || 0;
    let name = playersQueryable.getPlayerName(playerId);
    let seat = seatsQueryable.getPlayersSeat(playerId);
    return new notifications.Player(playerId, name, chips, seat);
}

/**
 * @param game
 * @returns {notifications.RoundStarted}
 */
function createRoundStartedNotification(game)
{
    let roundQueryable = new RoundQueryable(game);

    let dealer = roundQueryable.getDealer();
    let playersList = createPlayerList(game);

    return new notifications.RoundStarted(dealer, playersList);
}

function createPlayerList(game)
{
    const seatsQueryable = new SeatsQueryable(game);
    const chipsQueryable = new ChipsQueryable(game);
    const playersQueryable = new PlayersQueryable(game);

    let players = [];
    for (let seat = 0; seat < SEAT_COUNT; seat++) {
        let playerId = seatsQueryable.getPlayerInSeat(seat);
        let chips = chipsQueryable.getPlayerChips(playerId) || 0;
        let name = playersQueryable.getPlayerName(playerId);
        players.push( new notifications.Player(playerId, name, chips, seat));
    }

    return players;
}

function createBetMadeNotification(game, playerId)
{
    let chipsQueryable = new ChipsQueryable(game);
    let roundQueryable = new RoundQueryable(game);

    let playerChips = chipsQueryable.getPlayerChips(playerId);
    let amountBetInBettingRound = roundQueryable.getPlayerBet(playerId);

    return new notifications.BetMade(playerId, amountBetInBettingRound, playerChips);
}

function createNextPlayersTurnNotification(game)
{
    let roundQueryable = new RoundQueryable(game);
    let chipsQueryable = new ChipsQueryable(game);

    let nextPlayerToAct = roundQueryable.getNextPlayerToAct();

    let amountToPlay = roundQueryable.getAmountToPlay(nextPlayerToAct);

    let playerChips = chipsQueryable.getPlayerChips(nextPlayerToAct);

    amountToPlay = Math.min(playerChips, amountToPlay);

    return new notifications.PlayersTurn(nextPlayerToAct, amountToPlay);
}

module.exports = UseCases;