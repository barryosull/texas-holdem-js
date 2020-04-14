
var Game = require('./game');
var events = require('./events');


/**
 * @param game {Game}
 */
var ChipsProjection = function(game)
{
    this.game = game;
};

ChipsProjection.prototype.getPlayerChips = function(playerId)
{
    var playersToChips = this.game.events.project('domain/chips.getPlayerChips', (playersToChips, e) => {
        if (e instanceof events.PlayerGivenChips) {
            playersToChips[e.playerId] = playersToChips[e.playerId] || 0;
            playersToChips[e.playerId] += e.amount;
        }
        if (e instanceof events.BetPlaced) {
            playersToChips[e.playerId] -= e.amount;
        }
        return playersToChips;
    }, {});

    return playersToChips[playerId] || 0;
};

module.exports = ChipsProjection;