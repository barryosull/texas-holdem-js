
var Game = require('./game');
var EventRepositoryFilesystem = require('./event-repo-filesystem');

var GameRepository = {
    games: []
};

GameRepository.store = function(game)
{
    GameRepository.games[game.id] = game;
};

/**
 * @param gameId
 * @returns {Game}
 */
GameRepository.fetchOrCreate = function(gameId)
{
    let game = GameRepository.games[gameId];
    if (!game) {
        let eventRepo = new EventRepositoryFilesystem();
        let eventStream = eventRepo.loadStream(gameId);
        game = new Game(gameId, eventStream);
        GameRepository.store(game);
    }
    return game;
};

/**
 * @param gameId {string}
 */
GameRepository.remove = function (gameId)
{
    console.log("Removing game + " + gameId);
    delete GameRepository.games[gameId];
};

module.exports = GameRepository;