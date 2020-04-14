
var Game = require('./game');

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
    var game = GameRepository.games[gameId];
    if (!game) {
        game = new Game(gameId);
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