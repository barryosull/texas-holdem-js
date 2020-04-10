
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
 * @param game {Game}
 */
GameRepository.remove = function (game)
{
    console.log("Removing game + " +game.id );
    delete GameRepository.games[game.id];
};

module.exports = GameRepository;