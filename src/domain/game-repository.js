
const Game = require('./game');
const EventRepositoryFilesystem = require('./event-repo-filesystem');

let GameRepository = {
    games: []
};

let eventRepo = new EventRepositoryFilesystem();

/**
 * @param game {Game}
 */
GameRepository.store = function(game)
{
    eventRepo.store(game.events);
    GameRepository.games[game.id] = game;
};

/**
 * @param gameId {String}
 * @returns {Game}
 */
GameRepository.fetchOrCreate = function(gameId)
{
    let game = GameRepository.games[gameId];
    if (!game) {
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
    eventRepo.clear(gameId);
};

module.exports = GameRepository;