
const GameRepo = require('../domain/game-repository');
const NotificationProjection = require('../application/notification-projection');
const RoundQueryable = require('../application/round-queryable');
const ChipsQueryable = require('../application/chips-queryable');
const NextPlayerQueryable = require('../application/next-player-queryable');

let gameRepo = new GameRepo();

function UseCases(notifier, socketMapper)
{
    this.socketMapper = socketMapper;
    this.notificationProjection = new NotificationProjection();
    this.notifier = notifier;
}

UseCases.prototype.joinGame = function(gameId, playerId, playerName)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.addPlayer(playerId, playerName);
    gameRepo.store(game);

    let notifications = this.notificationProjection.handleEvents(game.events);
    this.notifier.broadcastMany(gameId, notifications);
};

UseCases.prototype.setSmallBlind = function(gameId, amount)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.setSmallBlind(amount);
    gameRepo.store(game);
};

UseCases.prototype.startRound = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.startNewRound();
    gameRepo.store(game);

    let notifications = this.notificationProjection.handleEvents(game.events);
    this.notifier.broadcastMany(gameId, notifications);
};

UseCases.prototype.removePlayers = function(gameId, disconnectedPlayers)
{
    let game = gameRepo.fetchOrCreate(gameId);

    disconnectedPlayers.forEach(playerId => {
        game.removePlayer(playerId);
    });

    gameRepo.store(game);
};

UseCases.prototype.dealFlop = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.dealFlop();
    gameRepo.store(game);

    let notifications = this.notificationProjection.handleEvents(game.events);
    this.notifier.broadcastMany(gameId, notifications);

    triggerNextAction.call(this, game.events);
};


UseCases.prototype.dealTurn = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.dealTurn();
    gameRepo.store(game);

    let notifications = this.notificationProjection.handleEvents(game.events);
    this.notifier.broadcastMany(gameId, notifications);

    triggerNextAction.call(this, game.events);
};

UseCases.prototype.dealRiver = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.dealRiver();
    gameRepo.store(game);

    let notifications = this.notificationProjection.handleEvents(game.events);
    this.notifier.broadcastMany(gameId, notifications);

    triggerNextAction.call(this, game.events);
};

UseCases.prototype.announceWinners = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.announceWinners();
    gameRepo.store(game);

    let notifications = this.notificationProjection.handleEvents(game.events);
    this.notifier.broadcastMany(gameId, notifications);
};

UseCases.prototype.placeBet = function(gameId, playerId, amount)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.placeBet(playerId, amount);
    gameRepo.store(game);

    let notifications = this.notificationProjection.handleEvents(game.events);
    this.notifier.broadcastMany(gameId, notifications);
};

UseCases.prototype.foldHand = function(gameId, playerId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.foldHand(playerId);
    gameRepo.store(game);

    let notifications = this.notificationProjection.handleEvents(game.events);
    this.notifier.broadcastMany(gameId, notifications);

    triggerNextAction.call(this, game.events);
};

UseCases.prototype.givePlayerChips = function(gameId, playerId, amount)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.givePlayerChips(playerId, amount);
    gameRepo.store(game);

    let notifications = this.notificationProjection.handleEvents(game.events);
    this.notifier.broadcastMany(gameId, notifications);
};

function triggerNextAction(events)
{
    let nextPlayerToAct = (new NextPlayerQueryable(events)).getNextPlayer();
    if (nextPlayerToAct) {
        return;
    }

    let roundQueryable = new RoundQueryable(events);
    let nextAction = roundQueryable.getNextAction();

    let chipsQueryable = new ChipsQueryable(events);

    if (nextAction === "deal" && chipsQueryable.getNumberOfPlayersWithChips() >= 1) {
        return;
    }

    let actionToUseCase = {
        'deal': this.startRound,
        'flop': this.dealFlop,
        'turn': this.dealTurn,
        'river': this.dealRiver,
        'announceWinners': this.announceWinners
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

module.exports = UseCases;