
const Game = require('./game');
const EventRepository = require('./event-repo');
const EventRepositoryFilesystem = require('./event-repo-filesystem');

let cachedGames = [];

/**
 * @param eventRepo {EventRepository|null}
 * @constructor
 */
function GameRepository(eventRepo)
{
    this.eventRepo = eventRepo || new EventRepositoryFilesystem();
}

/**
 * @param game {Game}
 */
GameRepository.prototype.store = function(game)
{
    this.eventRepo.store(game.events);
    cachedGames[game.id] = game;
};

/**
 * @param gameId {String}
 * @returns {Game}
 */
GameRepository.prototype.fetchOrCreate = function(gameId)
{
    let game = cachedGames[gameId];
    if (!game) {
        let eventStream = this.eventRepo.loadStream(gameId);
        game = new Game(gameId, eventStream);
        GameRepository.store(game);
    }
    return game;
};

/**
 * @param gameId {string}
 */
GameRepository.prototype.remove = function (gameId)
{
    console.log("Removing game + " + gameId);
    delete cachedGames[gameId];
    this.eventRepo.clear(gameId);
};

module.exports = GameRepository;