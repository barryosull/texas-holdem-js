
const events = require('../domain/events');

/**
 * @param eventStream {EventStream}
 */
function RoundProjection(eventStream)
{
    this.eventStream = eventStream;
}

RoundProjection.prototype.getHands = function()
{
    let hands =  this.eventStream.project('app/round.getHands', (hands, e) => {
        if (e instanceof events.RoundStarted) {
            hands = {};
        }
        if (e instanceof events.HandDealt) {
            hands[e.playerId] = new Hand(e.playerId, e.cards);
        }
        if (e instanceof events.HandFolded) {
            hands[e.playerId] = hands[e.playerId].fold();
        }
        return hands;
    }, {});

    return Object.values(hands);
};

function Hand(playerId, cards, hasFolded)
{
    this.playerId = playerId;
    this.cards = cards;
    this.hasFolded = hasFolded || false;
}

Hand.prototype.fold = function()
{
    let copy = {...this};
    copy.hasFolded = true;
    return copy;
};

/**
 * @return {String[]}
 */
RoundProjection.prototype.getCommunityCards = function()
{
    return  this.eventStream.project('app/round.getCommunityCards', (cards, e) => {
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
    return  this.eventStream.project('app/round.getNextAction', (nextAction, e) => {
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
    return  this.eventStream.project('app/round.getWinner', (players, e) => {
        if (e instanceof events.RoundStarted) {
            players = [];
        }
        if (e instanceof events.PotWon) {
            players.push(e.playerId);
        }
        return players;
    }, []);
};

RoundProjection.prototype.getPlayersToBetsInRound = function()
{
    return this.eventStream.project('app/round.getPlayersToBetsInRound', (playersToBets, e) => {
        if (e instanceof events.RoundStarted) {
            playersToBets = {};
        }
        if (e instanceof events.BetPlaced) {
            playersToBets[e.playerId] = playersToBets[e.playerId] || 0;
            playersToBets[e.playerId] += e.amount;
        }
        if (e instanceof events.PotWon) {
            playersToBets = {};
        }
        return playersToBets;
    }, {});
};

RoundProjection.prototype.getPlayersToBetsInBettingRound = function(playerIds)
{
    let playersToBets = this.eventStream.project('app/round.getPlayersToBetsInBettingRound', (playersToBets, e) => {
        if (e instanceof events.BettingRoundClosed) {
            playersToBets = {};
        }
        if (e instanceof events.BetPlaced) {
            playersToBets[e.playerId] = playersToBets[e.playerId] || 0;
            playersToBets[e.playerId] += e.amount;
        }
        return playersToBets;
    }, {});

    if (!playerIds) {
        return playersToBets;
    }

    return playerIds.reduce((reducedPlayersToBets, playerId) => {
        reducedPlayersToBets[playerId] = playersToBets[playerId] || 0;
        return reducedPlayersToBets;
    }, {});
};

RoundProjection.prototype.getPlayersWithChips = function()
{
    let playersWithChips = this.eventStream.project('app/round.getPlayersWithChips', (playersToChips, e) => {
        if (e instanceof events.PlayerGivenChips) {
            playersToChips[e.playerId] = playersToChips[e.playerId] || 0;
            playersToChips[e.playerId] += e.amount;
        }
        if (e instanceof events.BetPlaced) {
            playersToChips[e.playerId] -= e.amount;
        }
        return playersToChips;
    }, {});

    return Object.keys(playersWithChips).filter(playerId => {
        return playersWithChips[playerId] > 0;
    });
};

RoundProjection.prototype.getPlayersPlayingInRound = function()
{
    return this.eventStream.project('app/round.getPlayersPlayingInRound', (active, e) => {
        if (e instanceof events.RoundStarted) {
            active = [];
        }
        if (e instanceof events.HandDealt) {
            active.push(e.playerId);
        }
        return active;
    }, []);
};

RoundProjection.prototype.getPlayersThatFolded = function()
{
    return this.eventStream.project('app/round.getPlayersThatFolded', (folded, e) => {
        if (e instanceof events.RoundStarted) {
            folded = [];
        }
        if (e instanceof events.HandFolded) {
            folded.push(e.playerId);
        }
        return folded;
    }, []);
};

RoundProjection.prototype.getPlayersThatActed = function()
{
    let playersToActionCount = this.eventStream.project('app/round.getPlayersThatActed', (actions, e) => {
        if (e instanceof events.RoundStarted) {
            actions = {};
            // Big and small blinds still need to "act" even though they have bet
            actions[e.smallBlind] = -1;
            actions[e.bigBlind] = -1;
        }
        if (e instanceof events.HandFolded) {
            actions[e.playerId] = actions[e.playerId] || 0;
            ++actions[e.playerId];
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

    return Object.keys(playersToActionCount).filter(playerId => {
        return playersToActionCount[playerId] > 0;
    });
};

RoundProjection.prototype.getActivePlayersToAmountsBet = function()
{
    return  this.eventStream.project('app/round.getActivePlayersToAmountsBet', (bets, e) => {
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
};

RoundProjection.prototype.getLastActivePlayer = function ()
{
    return  this.eventStream.project('app/round.getLastActivePlayer', (player, e) => {
        if (e instanceof events.BetPlaced) {
            player = e.playerId;
        }
        if (e instanceof events.HandFolded) {
            player = e.playerId;
        }
        if (e instanceof events.BettingRoundClosed) {
            player = null;
        }
        return player;
    });
};

RoundProjection.prototype.getRoundStarted = function()
{
    return  this.eventStream.project('app/seats.getRoundStarted', (value, e) => {
        if (e instanceof events.RoundStarted) {
            value =  e;
        }
        return value;
    }, null);
};

module.exports = RoundProjection;