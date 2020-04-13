
var Game = require('../domain/game');
var events = require('../domain/events');

/**
 * @param game {Game}
 */
var ChipsProjection = function(game)
{
    this.game = game;
};

ChipsProjection.prototype.getPlayerChips = function(playerId)
{
    return this.game.events.reduce((chips, e) => {
        if (e instanceof events.PlayerGivenChips) {
            if (e.playerId === playerId) {
                return chips + e.amount;
            }
        }
        if (e instanceof events.BetPlaced) {
            if (e.playerId === playerId) {
                return chips - e.amount;
            }
        }
        return chips;
    }, 0);
};

module.exports = ChipsProjection;