
var Game = require('../domain/game');
var events = require('../domain/events');

/**
 * @param game {Game}
 */
var PlayersProjection = function(game)
{
    this.game = game;
};

PlayersProjection.prototype.getPlayersToNames = function()
{
    return this.game.events.project('app/players.getPlayerName', (map, e) => {
        if (e instanceof events.PlayerNamed) {
            map[e.playerId] =  e.name;
        }
        return map;
    }, {});
};

module.exports = PlayersProjection;