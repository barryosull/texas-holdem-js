
const GameRepo = require('../domain/game-repository');
const UiNotifier = require('../application/ui-notifier');

let gameRepo = new GameRepo();

function UseCases(notifier, socketMapper)
{
    this.socketMapper = socketMapper;
    this.uiNotifier = new UiNotifier(notifier, socketMapper, this);
}

UseCases.prototype.joinGame = function(gameId, playerId, playerName)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.addPlayer(playerId, playerName);
    gameRepo.store(game);

    this.uiNotifier.handleEvents(game.events);
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

    this.uiNotifier.handleEvents(game.events);
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

    this.uiNotifier.handleEvents(game.events);
};


UseCases.prototype.dealTurn = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.dealTurn();
    gameRepo.store(game);

    this.uiNotifier.handleEvents(game.events);
};

UseCases.prototype.dealRiver = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.dealRiver();
    gameRepo.store(game);

    this.uiNotifier.handleEvents(game.events);
};

UseCases.prototype.announceWinners = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.announceWinners();
    gameRepo.store(game);

    this.uiNotifier.handleEvents(game.events);
};

UseCases.prototype.placeBet = function(gameId, playerId, amount)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.placeBet(playerId, amount);
    gameRepo.store(game);

    this.uiNotifier.handleEvents(game.events);
};

UseCases.prototype.foldHand = function(gameId, playerId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.foldHand(playerId);
    gameRepo.store(game);

    this.uiNotifier.handleEvents(game.events);
};

UseCases.prototype.givePlayerChips = function(gameId, playerId, amount)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.givePlayerChips(playerId, amount);
    gameRepo.store(game);

    this.uiNotifier.handleEvents(game.events);
};

module.exports = UseCases;