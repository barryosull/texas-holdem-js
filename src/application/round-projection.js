
var Game = require('../domain/game');
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
        if (e instanceof events.HandWon) {
            nextAction = 'deal';
        }
        return nextAction;
    }, 'deal');
};

RoundProjection.prototype.getWinner = function()
{
    return this.game.events.project('app/round.getWinner', (playerId, e) => {
        if (e instanceof events.RoundStarted) {
            playerId = null;
        }
        if (e instanceof events.HandWon) {
            playerId = e.playerId;
        }
        return playerId;
    }, null);
};

RoundProjection.prototype.getPot = function()
{
    return this.game.events.project('app/round.getPot', (pot, e) => {
        if (e instanceof events.HandWon) {
            return 0;
        }
        if (e instanceof events.RoundStarted) {
            return 0;
        }
        if (e instanceof events.BetPlaced) {
            return pot + e.amount;
        }
        return pot;
    }, 0);
};

RoundProjection.prototype.getPlayerBet = function(playerId)
{
    let playersToBets = this.game.events.project('app/round.getPlayerBet', (playersToBets, e) => {
        if (e instanceof events.BettingRoundClosed) {
            playersToBets = {};
        }
        if (e instanceof events.HandWon) {
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

RoundProjection.prototype.bankruptedInLastRound = function()
{
    let bankrupted = this.game.events.project('app/round.bankruptedInLastRound', (bankrupted, e) => {
        if (e instanceof events.HandWon) {
            bankrupted = {};
        }
        if (e instanceof events.PlayerBankrupted) {
            bankrupted[e.playerId] = true;
        }
        return bankrupted;
    }, {});

    return Object.keys(bankrupted);
};

RoundProjection.prototype.getNextPlayerToAct = function()
{
    let activePlayers = getPlayersActiveInRound.call(this);

    if (hasEveryoneActed.call(this, activePlayers) && hasEveryoneBetTheSameAmount.call(this)) {
        return null;
    }

    let lastActivePlayer = getLastActivePlayer.call(this);

    return getPlayerToLeftOfPlayer(lastActivePlayer, activePlayers);
};

function getPlayersActiveInRound()
{
    let seatedPlayers = this.game.events.project('app/round.getNextPlayerToAct.seats', (seats, e) => {
        if (e instanceof events.SeatTaken) {
            seats[e.seat] = e.playerId;
        }
        if (e instanceof events.SeatEmptied) {
            delete seats[e.seat];
        }
        return seats;
    }, [null, null, null, null, null, null, null, null]).filter(Boolean);

    let dealtInPlayers = this.game.events.project('app/round.getNextPlayerToAct.dealtInPlayers', (folded, e) => {
        if (e instanceof events.RoundStarted) {
            folded = [];
        }
        if (e instanceof events.HandDealt) {
            folded.push(e.playerId);
        }
        return folded;
    }, []);

    let foldedPlayers = this.game.events.project('app/round.getNextPlayerToAct.foldedPlayers', (folded, e) => {
        if (e instanceof events.RoundStarted) {
            folded = [];
        }
        if (e instanceof events.HandFolded) {
            folded.push(e.playerId);
        }
        return folded;
    }, []);

    let bankruptedPlayers = this.game.events.project('app/round.getNextPlayerToAct.bankruptedPlayers', (bankrupted, e) => {
        if (e instanceof events.PlayerBankrupted) {
            bankrupted.push(e.playerId);
        }
        return bankrupted;
    }, []);

    let inactivePlayers = foldedPlayers.concat(bankruptedPlayers);

    return seatedPlayers.filter(playerId => {
        return inactivePlayers.indexOf(playerId) === -1 && dealtInPlayers.indexOf(playerId) !== -1;
    });
}

function hasEveryoneActed(activePlayers)
{
    let playersToActionCount = this.game.events.project('app/round.getNextPlayerToAct.actions', (actions, e) => {
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

    let hasActionCountForEachPlayer = Object.values(playersToActionCount).length === activePlayers.length;

    let havePlayerActedOnce = Object.values(playersToActionCount).reduce((value, actionCount) => {
        return value && actionCount > 0;
    }, true);

    return hasActionCountForEachPlayer && havePlayerActedOnce;
}

function hasEveryoneBetTheSameAmount()
{
    let playersToAmountBet = this.game.events.project('app/round.getNextPlayerToAct.playerBets', (bets, e) => {
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

    let amountsBet = Object.values(playersToAmountBet);

    return amountsBet.filter((bet, index) => {
        return amountsBet.indexOf(bet) === index;
    });
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
    let bets = this.game.events.project('app/round.getNextPlayerToAct.playerBets', (bets, e) => {
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

    let playersBet = bets[playerId] || 0;

    let maxBet = Object.values(bets).reduce((maxBet, bet) => {
        if (maxBet < bet) {
            maxBet = bet;
        }
        return maxBet;
    }, 0);

    return maxBet - playersBet;
};

module.exports = RoundProjection;