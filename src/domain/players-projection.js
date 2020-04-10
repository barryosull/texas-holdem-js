
var Game = require('./game');
var events = require('./events');

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
    return this.game.events.reduce((value, e) => {
        if (e instanceof events.PlayerNamed) {
            if (e.playerId === playerId) {
                return e.name;
            }
        }
        return value;
    }, "");
};

module.exports = PlayersProjection;