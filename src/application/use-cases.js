
const SeatsProjection = require('../application/seats-projection');
const RoundProjection = require('./round-projection');
const ChipsProjection = require('./chips-projection');
const PlayersProjection = require('./players-projection');
const notifications = require('./notifications');

const SEAT_COUNT = 8;

function UseCases(notifier, socketMapper)
{
    this.notifier = notifier;
    this.socketMapper = socketMapper;
}

UseCases.prototype.existingPlayer = function(game, playerId, socketId)
{
    this.notifier.broadcastToPlayer(game.id, playerId, socketId, new notifications.ExistingSession());
};

UseCases.prototype.joinGame = function(game, playerId, playerName)
{
    game.addPlayer(playerId, playerName);

    let seatsProjection = new SeatsProjection(game);

    let player = createPlayer(game, playerId);
    let playersList = createPlayerList(game);
    let isAdmin = seatsProjection.isAdmin(playerId);

    this.notifier.broadcast(game.id, new notifications.PlayerAdded(player, playersList , isAdmin));
};

UseCases.prototype.dealCards = function(game)
{
    this.removeDisconnectedPlayers(this, game);

    game.startNewRound();

    let seatsProjection = new SeatsProjection(game);
    let roundProjection = new RoundProjection(game);

    let roundStarted = seatsProjection.getRoundStarted();

    let roundStartedNotification = createRoundStartedNotification(game);
    this.notifier.broadcast(game.id, roundStartedNotification);

    let players = seatsProjection.getPlayers();

    players.forEach(playerId => {
        let hand = roundProjection.getPlayerHand(playerId);
        let socketId = this.socketMapper.getSocketIdForPlayer(playerId);
        this.notifier.broadcastToPlayer(game.id, playerId, socketId, new notifications.PlayerDealtHand(hand));
    });

    this.notifier.broadcast(game.id, createBetMadeNotification(game, roundStarted.smallBlind));
    this.notifier.broadcast(game.id, createBetMadeNotification(game, roundStarted.bigBlind));

    let nextPlayerToAct = roundProjection.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

UseCases.prototype.removeDisconnectedPlayers = function(controller, game)
{
    let seatsProjection = new SeatsProjection(game);

    let players = seatsProjection.getPlayers();

    let disconnectedPlayers = players.filter(playerId => {
        return !this.socketMapper.hasSocketForPlayer(playerId);
    });

    disconnectedPlayers.forEach(playerId => {
        game.removePlayer(playerId);
    });
};

UseCases.prototype.dealFlop = function(game)
{
    game.dealFlop();

    let roundProjection = new RoundProjection(game);

    let cards = roundProjection.getCommunityCards().slice(0, 3);
    this.notifier.broadcast(game.id, new notifications.FlopDealt(cards));
    this.notifier.broadcast(game.id, makePotTotalNotification(game));

    let nextPlayerToAct = roundProjection.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

function makePotTotalNotification(game)
{
    let roundProjection = new RoundProjection(game);

    let pots = roundProjection.getPots().reduce((pots, pot) => {
        if (pot.players.length > 1) {
            pots.push(pot.amount);
        }
        return pots;
    }, []);

    return new notifications.PotTotal(pots);
}

UseCases.prototype.dealTurn = function(game)
{
    game.dealTurn();

    let roundProjection = new RoundProjection(game);

    let card = roundProjection.getCommunityCards().slice(-1).pop();

    this.notifier.broadcast(game.id, new notifications.TurnDealt(card));
    this.notifier.broadcast(game.id, makePotTotalNotification(game));

    let nextPlayerToAct = roundProjection.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

UseCases.prototype.dealRiver = function(game)
{
    game.dealRiver();

    let roundProjection = new RoundProjection(game);

    let card = roundProjection.getCommunityCards().slice(-1).pop();

    this.notifier.broadcast(game.id, new notifications.RiverDealt(card));
    this.notifier.broadcast(game.id, makePotTotalNotification(game));

    let nextPlayerToAct = roundProjection.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

UseCases.prototype.finish = function(game)
{
    game.finish();

    let roundProjection = new RoundProjection(game);
    let chipsProjection = new ChipsProjection(game);

    let winners = roundProjection.getWinners();

    winners.map(playerId => {
        let winningHand = roundProjection.getPlayerHand(playerId);
        let playerChips = chipsProjection.getPlayerChips(playerId);
        this.notifier.broadcast(game.id, new notifications.WinningHand(winningHand, playerChips));
    });

    if (chipsProjection.getNumberOfPlayersWithChips() > 1) {
        triggerNextAction.call(this, game);
    }
};

UseCases.prototype.placeBet = function(game, playerId, amount)
{
    game.placeBet(playerId, amount);

    let notification = createBetMadeNotification(game, playerId);
    this.notifier.broadcast(game.id, notification);

    let roundProjection = new RoundProjection(game);
    let nextPlayerToAct = roundProjection.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

UseCases.prototype.foldHand = function(game, playerId)
{
    game.foldHand(playerId);

    this.notifier.broadcast(game.id, new notifications.PlayerFolded(playerId));

    let roundProjection = new RoundProjection(game);
    let chipsProjection = new ChipsProjection(game);

    let winners = roundProjection.getWinners();

    if (winners.length > 0) {
        let winner = winners[0];
        let winningHand = roundProjection.getPlayerHand(winner);
        let playerChips = chipsProjection.getPlayerChips(winningHand.playerId);
        this.notifier.broadcast(game.id, new notifications.WinnerByDefault(winningHand, playerChips));

        triggerNextAction.call(this, game);

        return;
    }

    let nextPlayerToAct = roundProjection.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, createNextPlayersTurnNotification(game));
        return;
    }

    triggerNextAction.call(this, game);
};

UseCases.prototype.givePlayerChips = function(game, playerId, amount)
{
    game.givePlayerChips(playerId, amount);

    this.notifier.broadcast(game.id, new notifications.PlayerGivenChips(playerId, amount));
};

function triggerNextAction(game)
{
    var roundProjection = new RoundProjection(game);
    var nextAction = roundProjection.getNextAction();

    console.log('nextAction', nextAction);

    var actionToUseCase = {
        'deal': this.dealCards,
        'flop': this.dealFlop,
        'turn': this.dealTurn,
        'river': this.dealRiver,
        'finish': this.finish
    };

    var actionTimeTimeouts = {
        'deal': 5000,
        'flop': 1000,
        'turn': 1000,
        'river': 1000,
        'finish': 1000,
    };

    var nextUseCase = actionToUseCase[nextAction];

    if (!nextUseCase) {
        return;
    }

    var timeout = actionTimeTimeouts[nextAction] || 1000;

    var useCases = this;

    setTimeout(function(){
        nextUseCase.call(useCases, game);
    }, timeout);
}

//*********************************
// Notifications creation methods
//*********************************

function createPlayer(game, playerId)
{
    const seatsProjection = new SeatsProjection(game);
    const chipsProjection = new ChipsProjection(game);
    const playersProjection = new PlayersProjection(game);

    let chips = chipsProjection.getPlayerChips(playerId) || 0;
    let name = playersProjection.getPlayerName(playerId);
    let seat = seatsProjection.getPlayersSeat(playerId);
    return new notifications.Player(playerId, name, chips, seat);
}

/**
 * @param game
 * @returns {notifications.RoundStarted}
 */
function createRoundStartedNotification(game)
{
    let seatsProjection = new SeatsProjection(game);

    let roundStarted = seatsProjection.getRoundStarted();

    if (!roundStarted) {
        return null;
    }

    let playersList = createPlayerList(game);

    return new notifications.RoundStarted(roundStarted.dealer, playersList);
}

function createPlayerList(game)
{
    const seatsProjection = new SeatsProjection(game);
    const chipsProjection = new ChipsProjection(game);
    const playersProjection = new PlayersProjection(game);

    let players = [];
    for (let seat = 0; seat < SEAT_COUNT; seat++) {
        let playerId = seatsProjection.getPlayerInSeat(seat);
        let chips = chipsProjection.getPlayerChips(playerId) || 0;
        let name = playersProjection.getPlayerName(playerId);
        players.push( new notifications.Player(playerId, name, chips, seat));
    }

    return players;
}

function createBetMadeNotification(game, playerId)
{
    let chipsProjection = new ChipsProjection(game);
    let roundProjection = new RoundProjection(game);

    let playerChips = chipsProjection.getPlayerChips(playerId);
    let amountBetInBettingRound = roundProjection.getPlayerBet(playerId);

    return new notifications.BetMade(playerId, amountBetInBettingRound, playerChips);
}

function createNextPlayersTurnNotification(game)
{
    let roundProjection = new RoundProjection(game);
    let chipsProjection = new ChipsProjection(game);

    let nextPlayerToAct = roundProjection.getNextPlayerToAct();

    let amountToPlay = roundProjection.getAmountToPlay(nextPlayerToAct);

    let playerChips = chipsProjection.getPlayerChips(nextPlayerToAct);

    amountToPlay = Math.min(playerChips, amountToPlay);

    return new notifications.PlayersTurn(nextPlayerToAct, amountToPlay);
}

module.exports = UseCases;