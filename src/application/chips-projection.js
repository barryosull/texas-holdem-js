
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
    if (!playerId) {
        return null;
    }

    var playersToChips = this.game.events.project('app/chips.getPlayerChips', (playersToChips, e) => {
        if (e instanceof events.PlayerGivenChips) {
            playersToChips[e.playerId] = playersToChips[e.playerId] || 0;
            playersToChips[e.playerId] += e.amount;
        }
        if (e instanceof events.BetPlaced) {
            playersToChips[e.playerId] -= e.amount;
        }
        return playersToChips;
    }, {});

    return playersToChips[playerId];
};

module.exports = ChipsProjection;