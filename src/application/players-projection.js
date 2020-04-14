
var Game = require('../domain/game');
var events = require('../domain/events');

/**
 * @param game {Game}
 */
var PlayersProjection = function(game)
{
    this.game = game;
};

PlayersProjection.prototype.getPlayerName = function(playerId)
{
    if (!playerId) {
        return "";
    }
    var playerIdToNames = this.game.events.project('app/players.getPlayerName', (map, e) => {
        if (e instanceof events.PlayerNamed) {
            map[e.playerId] =  e.name;
        }
        return map;
    }, {});

    return playerIdToNames[playerId];
};

module.exports = PlayersProjection;