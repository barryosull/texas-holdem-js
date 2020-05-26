
const GameRepo = require('../domain/game-repository');
const SeatsQueryable = require('../application/seats-queryable');
const UiNotifier = require('../application/ui-notifier');

let gameRepo = new GameRepo();

function UseCases(notifier, socketMapper)
{
    this.socketMapper = socketMapper;
    this.uiNotifier = new UiNotifier(notifier, socketMapper, this);
}

// TODO: Move out of usecases, this is not a usecase
UseCases.prototype.existingPlayer = function(gameId, playerId, socketId)
{
    this.uiNotifier.broadcastExistingSession(gameId, playerId, socketId);
};

UseCases.prototype.joinGame = function(gameId, playerId, playerName)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.addPlayer(playerId, playerName);
    gameRepo.store(game);

    this.uiNotifier.playerAdded(game.events, playerId);
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
    this.removeDisconnectedPlayers(this, game);
    game.startNewRound();
    gameRepo.store(game);

    this.uiNotifier.roundStarted(game.events);
};

// TODO: Re-evaluate this method, it's using infra directly
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

    this.uiNotifier.flopDealt(game.events);
};


UseCases.prototype.dealTurn = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.dealTurn();
    gameRepo.store(game);

    this.uiNotifier.turnDealt(game.events);
};

UseCases.prototype.dealRiver = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.dealRiver();
    gameRepo.store(game);

    this.uiNotifier.riverDealt(game.events);
};

UseCases.prototype.announceWinners = function(gameId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.announceWinners();
    gameRepo.store(game);

    this.uiNotifier.winnersAnnounced(game.events);
};

UseCases.prototype.placeBet = function(gameId, playerId, amount)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.placeBet(playerId, amount);
    gameRepo.store(game);

    this.uiNotifier.betPlaced(game.events, playerId);
};

UseCases.prototype.foldHand = function(gameId, playerId)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.foldHand(playerId);
    gameRepo.store(game);

    this.uiNotifier.handFolded(game.events, playerId);
};

UseCases.prototype.givePlayerChips = function(gameId, playerId, amount)
{
    let game = gameRepo.fetchOrCreate(gameId);
    game.givePlayerChips(playerId, amount);
    gameRepo.store(game);

    this.uiNotifier.playerGivenChips(game.events, playerId);
};

module.exports = UseCases;