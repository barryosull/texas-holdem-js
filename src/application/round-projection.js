
var Game = require('../domain/game');
var Pot = require('../domain/pot');
var events = require('../domain/events');

/**
 * @param game {Game}
 */
var RoundProjection = function(game)
{
    this.game = game;
};

RoundProjection.prototype.getHands = function()
{
    let hands = this.game.events.project('app/round.getHands', (hands, e) => {
        if (e instanceof events.RoundStarted) {
            hands = {};
        }
        if (e instanceof events.HandDealt) {
            hands[e.playerId] = {
                playerId: e.playerId,
                cards: e.cards,
                hasFolded: false
            };
        }
        if (e instanceof events.HandFolded) {
            hands[e.playerId].hasFolded = true;
        }
        return hands;
    }, {});

    return Object.values(hands);
};

/**
 * @returns {Hand[]}
 */
RoundProjection.prototype.getPlayerHands = function(players)
{
    let hands = this.getHands();

    return hands.filter(hand => {
        return players.indexOf(hand.playerId) !== -1;
    });
};

RoundProjection.prototype.getPlayerHand = function(playerId)
{
    return this.getHands().filter(hand => {
        return hand.playerId === playerId;
    }).pop();
};

/**
 * @return {String[]}
 */
RoundProjection.prototype.getCommunityCards = function()
{
    return this.game.events.project('app/round.getCommunityCards', (cards, e) => {
        if (e instanceof events.FlopDealt) {
            cards = e.cards.slice();
        }
        if (e instanceof events.TurnDealt) {
            cards.push(e.card);
        }
        if (e instanceof events.RiverDealt) {
            cards.push(e.card);
        }
        if (e instanceof events.RoundStarted) {
            cards = [];
        }
        return cards;
    }, []);
};

RoundProjection.prototype.getNextAction = function()
{
    return this.game.events.project('app/round.getNextAction', (nextAction, e) => {
        if (e instanceof events.RoundStarted) {
            nextAction = 'flop';
        }
        if (e instanceof events.FlopDealt) {
            nextAction = 'turn';
        }
        if (e instanceof events.TurnDealt) {
            nextAction = 'river';
        }
        if (e instanceof events.RiverDealt) {
            nextAction = 'finish';
        }
        if (e instanceof events.PotWon) {
            nextAction = 'deal';
        }
        return nextAction;
    }, 'deal');
};

RoundProjection.prototype.getWinners = function()
{
    return this.game.events.project('app/round.getWinner', (players, e) => {
        if (e instanceof events.RoundStarted) {
            players = [];
        }
        if (e instanceof events.PotWon) {
            players.push(e.playerId);
        }
        return players;
    }, []);
};

RoundProjection.prototype.getPlayerBet = function(playerId)
{
    let playersToBets = this.game.events.project('app/round.getPlayerBet', (playersToBets, e) => {
        if (e instanceof events.BettingRoundClosed) {
            playersToBets = {};
        }
        if (e instanceof events.PotWon) {
            playersToBets = {};
        }
        if (e instanceof events.BetPlaced) {
            playersToBets[e.playerId] =  playersToBets[e.playerId] || 0;
            playersToBets[e.playerId] += e.amount;
        }
        return playersToBets;
    }, {});

    return playersToBets[playerId];
};

RoundProjection.prototype.getNextPlayerToAct = function()
{
    if (nobodyHasActed.call(this) && getNumberOfPlayersWithChips.call(this) <= 1) {
        return null;
    }

    let activePlayers = getPlayersActiveInRound.call(this);

    if (hasEveryoneActed.call(this, activePlayers)
        && (hasEveryoneBetTheSameAmount.call(this) || getNumberOfPlayersWithChips.call(this) === 0)) {
        return null;
    }

    let lastActivePlayer = getLastActivePlayer.call(this);

    return getPlayerToLeftOfPlayer(lastActivePlayer, activePlayers);
};

function getNumberOfPlayersWithChips()
{
    let playersToChipCount = this.game.events.project('app/round.getPlayerChips', (playersToChips, e) => {
        if (e instanceof events.PlayerGivenChips) {
            playersToChips[e.playerId] = playersToChips[e.playerId] || 0;
            playersToChips[e.playerId] += e.amount;
        }
        if (e instanceof events.BetPlaced) {
            playersToChips[e.playerId] -= e.amount;
        }
        return playersToChips;
    }, {});

    let playersWithChips = Object.values(playersToChipCount).filter(chipAmount => {
        return chipAmount > 0;
    });

    return playersWithChips.length;
}

function getPlayersActiveInRound()
{
    return this.game.events.project('app/round.getNextPlayerToAct.getPlayersActiveInRound', (folded, e) => {
        if (e instanceof events.RoundStarted) {
            folded = [];
        }
        if (e instanceof events.HandDealt) {
            folded.push(e.playerId);
        }
        if (e instanceof events.HandFolded) {
            folded = folded.filter(playerId => {
                return playerId !== e.playerId;
            });
        }
        return folded;
    }, []);
}

function nobodyHasActed()
{
    let playersToActionCount = getPlayersToActionCount.call(this);

    return Object.values(playersToActionCount).reduce((value, actionCount) => {
        return value && actionCount === 0;
    }, true);
}

function hasEveryoneActed(activePlayers)
{
    let playersToActionCount = getPlayersToActionCount.call(this);

    let hasActionCountForEachPlayer = Object.values(playersToActionCount).length === activePlayers.length;

    let havePlayersActedOnce = Object.values(playersToActionCount).reduce((value, actionCount) => {
        return value && actionCount > 0;
    }, true);

    return hasActionCountForEachPlayer && havePlayersActedOnce;
}

function getPlayersToActionCount()
{
    return this.game.events.project('app/round.getNextPlayerToAct.actions', (actions, e) => {
        if (e instanceof events.RoundStarted) {
            actions = {};
            // Big and small blinds still need to "act" even though they have bet
            actions[e.smallBlind] = -1;
            actions[e.bigBlind] = -1;
        }
        if (e instanceof events.HandFolded) {
            delete actions[e.playerId];
        }
        if (e instanceof events.BetPlaced) {
            actions[e.playerId] = actions[e.playerId] || 0;
            ++actions[e.playerId];
        }
        if (e instanceof events.BettingRoundClosed) {
            actions = {};
        }
        return actions;
    }, {});
}

function hasEveryoneBetTheSameAmount()
{
    let playersToAmountBet = getActivePlayersToAmountsBet.call(this);

    let amountsBet = Object.values(playersToAmountBet);

    return amountsBet.filter((bet, index) => {
        return amountsBet.indexOf(bet) === index;
    }).length === 1;
}

function getActivePlayersToAmountsBet()
{
    return this.game.events.project('app/round.getNextPlayerToAct.getActivePlayersToAmountsBet', (bets, e) => {
        if (e instanceof events.RoundStarted) {
            bets = {};
        }
        if (e instanceof events.HandFolded) {
            delete bets[e.playerId];
        }
        if (e instanceof events.BetPlaced) {
            bets[e.playerId] = bets[e.playerId] || 0;
            bets[e.playerId] += e.amount;
        }
        if (e instanceof events.BettingRoundClosed) {
            bets = {};
        }
        return bets;
    }, {});
}

function getLastActivePlayer()
{
    let lastActivePlayer = this.game.events.project('app/round.getNextPlayerToAct.lastActivePlayer', (player, e) => {
        if (e instanceof events.BetPlaced) {
            player = e.playerId;
        }
        if (e instanceof events.BettingRoundClosed) {
            player = null;
        }
        return player;
    }, null);

    if (lastActivePlayer !== null) {
        return lastActivePlayer;
    }

    return this.game.events.project('app/round.getNextPlayerToAct.dealer', (dealer, e) => {
        if (e instanceof events.RoundStarted) {
            dealer = e.dealer;
        }
        return dealer;
    }, null);
}

function getPlayerToLeftOfPlayer(playerId, activePlayers)
{
    let currPlayerIndex = activePlayers.indexOf(playerId);
    let nextPlayerIndex = ((currPlayerIndex + 1) % activePlayers.length);
    return activePlayers[nextPlayerIndex];
}

RoundProjection.prototype.getAmountToPlay = function(playerId)
{
    if (!playerId) {
        return null;
    }
    let bets = getActivePlayersToAmountsBet.call(this);

    let playersBet = bets[playerId] || 0;

    let maxBet = Object.values(bets).reduce((maxBet, bet) => {
        if (maxBet < bet) {
            maxBet = bet;
        }
        return maxBet;
    }, 0);

    return maxBet - playersBet;
};

RoundProjection.prototype.getPots = function()
{
    let playersToBets = getPlayersToBets.call(this);

    let pots = [];

    while (Object.values(playersToBets).length !== 0) {

        let minBet = getMinBet(playersToBets);
        let pot = makePotFromMinAmountBet(playersToBets, minBet);

        pots.push(pot);

        playersToBets = reduceByMinBetAndRemove(playersToBets, minBet);
    }

    return pots;
};

function getPlayersToBets()
{
    return this.game.events.project('domain/round.getPots', (playersToBets, e) => {
        if (e instanceof events.PotWon) {
            playersToBets = {};
        }
        if (e instanceof events.RoundStarted) {
            playersToBets = {};
        }
        if (e instanceof events.BetPlaced) {
            playersToBets[e.playerId] = playersToBets[e.playerId] || 0;
            playersToBets[e.playerId] += e.amount;
        }
        return playersToBets;
    }, {});
}

function getMinBet(playersToBets)
{
    return Object.values(playersToBets).reduce((min, amount) => {
        min = (min !== null && min < amount) ? min : amount;
        return min;
    }, null);
}

function reduceByMinBetAndRemove(playersToBets, minBet)
{
    return Object.keys(playersToBets).reduce((nextPotPlayersToBets, playerId) => {
        nextPotPlayersToBets[playerId] = playersToBets[playerId] - minBet;
        if (nextPotPlayersToBets[playerId] === 0) {
            delete nextPotPlayersToBets[playerId];
        }
        return nextPotPlayersToBets;
    }, {});
}

function makePotFromMinAmountBet(playersToBets, minBet)
{
    let amount = minBet * Object.values(playersToBets).length;
    let players = Object.keys(playersToBets).reduce((players, playerId) => {
        players.push(playerId);
        return players;
    }, []);

    return new Pot(amount, players);
}

module.exports = RoundProjection;