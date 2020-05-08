
const GameRepo = require('../domain/game-repository');
const SeatsQueryable = require('../application/seats-queryable');
const RoundQueryable = require('./round-queryable');
const ChipsQueryable = require('./chips-queryable');
const PlayersQueryable = require('./players-queryable');
const notifications = require('./notifications');

const SEAT_COUNT = 8;

let gameRepo = new GameRepo();

function UseCases(notifier, socketMapper)
{
    this.notifier = notifier;
    this.socketMapper = socketMapper;
}

UseCases.prototype.existingPlayer = function(gameId, playerId, socketId)
{
    this.notifier.broadcastToPlayer(gameId, playerId, socketId, new notifications.ExistingSession());
};

UseCases.prototype.joinGame = function(gameId, playerId, playerName)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.addPlayer(playerId, playerName);
    gameRepo.store(game);

    let seatsQueryable = new SeatsQueryable(game.events);

    let player = createPlayer(game, playerId);
    let playersList = createPlayerList(game);
    let isAdmin = seatsQueryable.isAdmin(playerId);

    this.notifier.broadcast(game.id, new notifications.PlayerAdded(player, playersList , isAdmin));
};

UseCases.prototype.dealCards = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    this.removeDisconnectedPlayers(this, game);
    game.startNewRound();
    gameRepo.store(game);

    let roundQueryable = new RoundQueryable(game.events);

    let roundStartedNotification = createRoundStartedNotification(game);
    this.notifier.broadcast(game.id, roundStartedNotification);

    let hands = roundQueryable.getHands();

    hands.forEach(hand => {
        let socketId = this.socketMapper.getSocketIdForPlayer(hand.playerId);
        this.notifier.broadcastToPlayer(game.id, hand.playerId, socketId, new notifications.PlayerDealtHand(hand));
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
    let seatsQueryable = new SeatsQueryable(game.events);

    let players = seatsQueryable.getPlayers();

    let disconnectedPlayers = players.filter(playerId => {
        return !this.socketMapper.hasSocketForPlayer(playerId);
    });

    disconnectedPlayers.forEach(playerId => {
        game.removePlayer(playerId);
    });
};

UseCases.prototype.dealFlop = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.dealFlop();
    gameRepo.store(game);

    let roundQueryable = new RoundQueryable(game.events);

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
    let roundQueryable = new RoundQueryable(game.events);

    let pots = roundQueryable.getPots().reduce((pots, pot) => {
        if (pot.players.length > 1) {
            pots.push(pot.amount);
        }
        return pots;
    }, []);

    return new notifications.PotTotal(pots);
}

UseCases.prototype.dealTurn = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.dealTurn();
    gameRepo.store(game);

    let roundQueryable = new RoundQueryable(game.events);

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

UseCases.prototype.dealRiver = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.dealRiver();
    gameRepo.store(game);

    let roundQueryable = new RoundQueryable(game.events);

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

UseCases.prototype.finish = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.finish();
    gameRepo.store(game);

    let seatProjection = new SeatsQueryable(game.events);
    let roundQueryable = new RoundQueryable(game.events);
    let chipsQueryable = new ChipsQueryable(game.events);

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

UseCases.prototype.placeBet = function(gameId, playerId, amount)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.placeBet(playerId, amount);
    gameRepo.store(game);

    let notification = createBetMadeNotification(game, playerId);
    this.notifier.broadcast(game.id, notification);

    let roundQueryable = new RoundQueryable(game.events);
    let nextPlayerToAct = roundQueryable.getNextPlayerToAct();

    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

UseCases.prototype.foldHand = function(gameId, playerId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.foldHand(playerId);
    gameRepo.store(game);

    this.notifier.broadcast(game.id, new notifications.PlayerFolded(playerId));

    let roundQueryable = new RoundQueryable(game.events);
    let chipsQueryable = new ChipsQueryable(game.events);

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

UseCases.prototype.givePlayerChips = function(gameId, playerId, amount)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.givePlayerChips(playerId, amount);
    gameRepo.store(game);

    let playerChips = (new ChipsQueryable(game.events)).getPlayerChips(playerId);
    this.notifier.broadcast(game.id, new notifications.PlayerGivenChips(playerId, playerChips));
};

function triggerNextAction(game)
{
    let roundQueryable = new RoundQueryable(game.events);
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
        nextUseCase.call(useCases, game.id);
    }, timeout);
}

//*********************************
// Notifications creation methods
//*********************************

function createPlayer(game, playerId)
{
    const seatsQueryable = new SeatsQueryable(game.events);
    const chipsQueryable = new ChipsQueryable(game.events);
    const playersQueryable = new PlayersQueryable(game.events);

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
    let roundQueryable = new RoundQueryable(game.events);

    let dealer = roundQueryable.getDealer();
    let playersList = createPlayerList(game);

    return new notifications.RoundStarted(dealer, playersList);
}

function createPlayerList(game)
{
    const seatsQueryable = new SeatsQueryable(game.events);
    const chipsQueryable = new ChipsQueryable(game.events);
    const playersQueryable = new PlayersQueryable(game.events);

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
    let chipsQueryable = new ChipsQueryable(game.events);
    let roundQueryable = new RoundQueryable(game.events);

    let playerChips = chipsQueryable.getPlayerChips(playerId);
    let amountBetInBettingRound = roundQueryable.getPlayerBet(playerId);

    return new notifications.BetMade(playerId, amountBetInBettingRound, playerChips);
}

function createNextPlayersTurnNotification(game)
{
    let roundQueryable = new RoundQueryable(game.events);
    let chipsQueryable = new ChipsQueryable(game.events);

    let nextPlayerToAct = roundQueryable.getNextPlayerToAct();

    let amountToPlay = roundQueryable.getAmountToPlay(nextPlayerToAct);

    let playerChips = chipsQueryable.getPlayerChips(nextPlayerToAct);

    amountToPlay = Math.min(playerChips, amountToPlay);

    return new notifications.PlayersTurn(nextPlayerToAct, amountToPlay);
}

module.exports = UseCases;