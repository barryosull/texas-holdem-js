
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
    }, 'flop');
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
    var playersToBets = this.game.events.project('app/round.getPlayerBet', (playersToBets, e) => {
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
    var lastActivePlayer = this.game.events.project('app/round.getNextPlayerToAct.lastActivePlayer', (player, e) => {
        if (e instanceof events.BetPlaced) {
            player = e.playerId;
        }
        if (e instanceof events.BettingRoundClosed) {
            player = null;
        }
        return player;
    }, null);

    var seatedPlayers = this.game.events.project('app/round.getNextPlayerToAct.seats', (seats, e) => {
        if (e instanceof events.SeatTaken) {
            seats[e.seat] = e.playerId;
        }
        if (e instanceof events.SeatEmptied) {
            delete seats[e.seat];
        }
        return seats;
    }, [null, null, null, null, null, null, null, null]).filter(Boolean);

    var folderPlayers = this.game.events.project('app/round.getNextPlayerToAct.foldedPlayers', (folded, e) => {
        if (e instanceof events.RoundStarted) {
            folded = [];
        }
        if (e instanceof events.HandFolded) {
            folded.push(e.playerId);
        }
        if (e instanceof events.PlayerBankrupted) {
            folded.push(e.playerId);
        }
        return folded;
    }, []);

    var bankruptedPlayers = this.game.events.project('app/round.getNextPlayerToAct.bankruptedPlayers', (bankrupted, e) => {
        if (e instanceof events.PlayerBankrupted) {
            bankrupted.push(e.playerId);
        }
        return bankrupted;
    }, []);

    var inactivePlayers = folderPlayers.concat(bankruptedPlayers);

    var activePlayers = seatedPlayers.filter(playerId => {
        return inactivePlayers.indexOf(playerId) === -1;
    });

    var actions = this.game.events.project('app/round.getNextPlayerToAct.actions', (actions, e) => {
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

    var hasActionCountForEveryPlayer = Object.values(actions).length === activePlayers.length;

    var hasEveryoneActed = Object.values(actions).reduce((value, actionCount) => {
        return value && actionCount > 0;
    }, true) && hasActionCountForEveryPlayer;

    var betsArray = Object.values(bets);
    var uniqueBetAmounts = betsArray.filter((bet, index) => {
        return betsArray.indexOf(bet) === index;
    });

    var hasEveryoneBetTheSameAmount = (uniqueBetAmounts.length === 1);

    if (hasEveryoneActed && hasEveryoneBetTheSameAmount) {
        return null;
    }

    // No active player, then get player to left of dealer
    if (lastActivePlayer === null) {
        var dealer = this.game.events.project('app/round.getNextPlayerToAct.dealer', (dealer, e) => {
            if (e instanceof events.RoundStarted) {
                dealer = e.dealer;
            }
            return dealer;
        }, null);
        lastActivePlayer = dealer;
    }

    var currPlayerIndex = activePlayers.indexOf(lastActivePlayer);
    // Go to the player to the left of the last active player
    var nextPlayerIndex = ((currPlayerIndex + 1) % activePlayers.length);

    return activePlayers[nextPlayerIndex];
};

RoundProjection.prototype.getAmountToPlay = function(playerId)
{
    if (!playerId) {
        return null;
    }
    var bets = this.game.events.project('app/round.getNextPlayerToAct.playerBets', (bets, e) => {
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

    var playersBet = bets[playerId] || 0;

    var maxBet = Object.values(bets).reduce((maxBet, bet) => {
        if (maxBet < bet) {
            maxBet = bet;
        }
        return maxBet;
    }, 0);

    return maxBet - playersBet;
};

module.exports = RoundProjection;