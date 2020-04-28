
var Game = require('../domain/game');
var events = require('../domain/events');

/**
 * @param game {Game}
 */
function ChipsProjection(game)
{
    this.game = game;
}

ChipsProjection.prototype.getPlayersToChips = function()
{
    return this.game.events.project('app/chips.getPlayerChips', (playersToChips, e) => {
        if (e instanceof events.PlayerGivenChips) {
            playersToChips[e.playerId] = playersToChips[e.playerId] || 0;
            playersToChips[e.playerId] += e.amount;
        }
        if (e instanceof events.BetPlaced) {
            playersToChips[e.playerId] -= e.amount;
        }
        return playersToChips;
    }, {});
};

module.exports = ChipsProjection;