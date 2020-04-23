
var Notifier = require('../application/notifier');
var SocketMapper = require('./socket-mapper');
var GameRepo = require('../domain/game-repository');
var SeatsProjection = require('../application/seats-projection');
var RoundProjection = require('../application/round-projection');
var ChipsProjection = require('../application/chips-projection');
var PlayersProjection = require('../application/players-projection');
var notifications = require('../application/notifications');

var SEAT_COUNT = 8;

/**
 * @param notifier {Notifier}
 * @param socketMapper {SocketMapper}
 * @constructor
 */
function HttpController(notifier, socketMapper)
{
    this.notifier = notifier;
    this.socketMapper = socketMapper;
}

HttpController.prototype.join = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = req.body.playerId;
    var playerName = req.body.playerName;

    var existingSocketId = this.socketMapper.getSocketIdForPlayer(playerId);

    if (existingSocketId && existingSocketId !== socketId) {
        existingPlayer.call(this, game, playerId, playerName);
        return;
    }

    this.socketMapper.associate(socketId, game.id, playerId);

    joinGame.call(this, game, playerId, playerName);

    var notificationList = this.notifier.getRoundNotifications(game.id, playerId);

    res.json(notificationList);
};

function existingPlayer(game, playerId, socketId)
{
    this.notifier.broadcastToPlayer(game.id, playerId, socketId, new notifications.ExistingSession());
}

function joinGame(game, playerId, playerName)
{
    game.addPlayer(playerId, playerName);

    let seatsProjection = new SeatsProjection(game);

    let player = generatePlayer(game, playerId);
    let isAdmin = seatsProjection.isAdmin(playerId);

    this.notifier.broadcast(game.id, new notifications.PlayerAdded(player, isAdmin));
}

HttpController.prototype.dealCards = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('');
        return;
    }

    dealCards.call(this, game);

    res.send('');
};

function dealCards(game)
{
    removeDisconnectedPlayers(this, game);

    game.startNewRound();

    var seatsProjection = new SeatsProjection(game);
    var roundProjection = new RoundProjection(game);

    var roundStarted = seatsProjection.getRoundStarted();

    let roundStartedNotification = generateRoundStartedNotification(game);
    this.notifier.broadcast(game.id, roundStartedNotification);

    var players = seatsProjection.getPlayers();

    players.forEach(playerId => {
        let hand = roundProjection.getPlayerHand(playerId);
        let socketId = this.socketMapper.getSocketIdForPlayer(playerId);
        this.notifier.broadcastToPlayer(game.id, playerId, socketId, new notifications.PlayerDealtHand(hand));
    });

    this.notifier.broadcast(game.id, generateBetMadeNotification(game, roundStarted.smallBlind));
    this.notifier.broadcast(game.id, generateBetMadeNotification(game, roundStarted.bigBlind));
    this.notifier.broadcast(game.id, getNextPlayersTurnNotification(game));
}

HttpController.prototype.dealFlop = function(req, res)
{
    var gameId = req.params.gameId;

    var game = GameRepo.fetchOrCreate(gameId);

    if (!isGameAdmin(this, game, req)) {
        res.send('');
        return;
    }

    dealFlop.call(this, game);

    res.send('');
};

function dealFlop(game)
{
    game.dealFlop();

    var roundProjection = new RoundProjection(game);

    let cards = roundProjection.getCommunityCards().slice(0, 3);
    this.notifier.broadcast(game.id, new notifications.FlopDealt(cards));

    var amount = roundProjection.getPot();
    this.notifier.broadcast(game.id, new notifications.PotTotal(amount));
    this.notifier.broadcast(game.id, getNextPlayersTurnNotification(game));

}

HttpController.prototype.dealTurn = function(req, res)
{
    var gameId = req.params.gameId;

    var game = GameRepo.fetchOrCreate(gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('');
        return;
    }

    dealTurn.call(this, game);

    res.send('');
};

function dealTurn(game)
{
    game.dealTurn();

    var roundProjection = new RoundProjection(game);

    var card = roundProjection.getCommunityCards().slice(-1).pop();
    var amount = roundProjection.getPot();

    this.notifier.broadcast(game.id, new notifications.TurnDealt(card));
    this.notifier.broadcast(game.id, new notifications.PotTotal(amount));
    this.notifier.broadcast(game.id, getNextPlayersTurnNotification(game));
}

HttpController.prototype.dealRiver = function(req, res)
{
    var gameId = req.params.gameId;

    var game = GameRepo.fetchOrCreate(gameId);

    if (!isGameAdmin(this, game, req)) {
        res.send('');
        return;
    }

    dealRiver.call(this, game);

    res.send('');
};

function dealRiver(game)
{
    game.dealRiver();

    var roundProjection = new RoundProjection(game);

    var card = roundProjection.getCommunityCards().slice(-1).pop();

    this.notifier.broadcast(game.id, new notifications.RiverDealt(card));

    var amount = roundProjection.getPot();
    this.notifier.broadcast(game.id, new notifications.PotTotal(amount));
    this.notifier.broadcast(game.id, getNextPlayersTurnNotification(game));
}

HttpController.prototype.finish = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('');
        return;
    }

    finish.call(this, game);

    res.send('');
};

function finish(game)
{
    game.finish();

    var roundProjection = new RoundProjection(game);
    var chipsProjection = new ChipsProjection(game);

    var winningPlayerId = roundProjection.getWinner();
    var winningHand = roundProjection.getPlayerHand(winningPlayerId);
    var playerChips = chipsProjection.getPlayerChips(winningPlayerId);

    this.notifier.broadcast(game.id, new notifications.WinningHand(winningHand, playerChips));
}

HttpController.prototype.givePlayerChips = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('Nice try bucko');
        return;
    }
    var playerId = req.body.playerId;
    var amount = parseInt(req.body.amount);

    if (!playerId) {
        return;
    }

    game.givePlayerChips(playerId, amount);

    res.send('');
};

HttpController.prototype.placeBet = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = this.socketMapper.getPlayerIdForSocket(socketId);
    var amount = parseInt(req.body.amount);

    game.placeBet(playerId, amount);

    let notification = generateBetMadeNotification(game, playerId);
    this.notifier.broadcast(game.id, notification);

    var roundProjection = new RoundProjection(game);
    var nextPlayerToAct = roundProjection.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, getNextPlayersTurnNotification(game));
        res.send('');
        return;
    }

    // Figure out the next action

    res.send('');
};

HttpController.prototype.foldHand = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = this.socketMapper.getPlayerIdForSocket(socketId);

    game.foldHand(playerId);

    this.notifier.broadcast(game.id, new notifications.PlayerFolded(playerId));

    var roundProjection = new RoundProjection(game);
    var chipsProjection = new ChipsProjection(game);

    var winningHand = roundProjection.getWinner();
    if (winningHand) {
        let playerChips = chipsProjection.getPlayerChips(winningHand.playerId);
        this.notifier.broadcast(game.id, new notifications.WinnerByDefault(winningHand, playerChips));
        res.send('');
        return;
    }

    var nextPlayerToAct = roundProjection.getNextPlayerToAct();
    if (nextPlayerToAct) {
        this.notifier.broadcast(game.id, getNextPlayersTurnNotification(game));
        res.send('');
        return;
    }

    // Figure out next action

    res.send('');
};

function generateRoundStartedNotification(game)
{
    var seatsProjection = new SeatsProjection(game);

    var roundStarted = seatsProjection.getRoundStarted();

    if (!roundStarted) {
        return null;
    }

    let playersList = generatePlayerList(game);

    return new notifications.RoundStarted(roundStarted.dealer, playersList);
}

function isGameAdmin(controller, game, req)
{
    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = controller.socketMapper.getPlayerIdForSocket(socketId);

    var seatsProjection = new SeatsProjection(game);

    return seatsProjection.isAdmin(playerId);
}

function getNextPlayersTurnNotification(game)
{
    var roundProjection = new RoundProjection(game);
    var chipsProjection = new ChipsProjection(game);

    var nextPlayerToAct = roundProjection.getNextPlayerToAct();

    var amountToPlay = roundProjection.getAmountToPlay(nextPlayerToAct);

    var playerChips = chipsProjection.getPlayerChips(nextPlayerToAct);

    amountToPlay = Math.min(playerChips, amountToPlay);

    return new notifications.PlayersTurn(nextPlayerToAct, amountToPlay);
}

function generatePlayerList(game)
{
    const seatsProjection = new SeatsProjection(game);
    const chipsProjection = new ChipsProjection(game);
    const playersProjection = new PlayersProjection(game);

    let players = [];
    for (var seat = 0; seat < SEAT_COUNT; seat++) {
        let playerId = seatsProjection.getPlayerInSeat(seat);
        let chips = chipsProjection.getPlayerChips(playerId);
        let name = playersProjection.getPlayerName(playerId);
        players.push( new notifications.Player(playerId, name, chips, seat));
    }

    return players;
}

function generatePlayer(game, playerId)
{
    const seatsProjection = new SeatsProjection(game);
    const chipsProjection = new ChipsProjection(game);
    const playersProjection = new PlayersProjection(game);

    let chips = chipsProjection.getPlayerChips(playerId);
    let name = playersProjection.getPlayerName(playerId);
    let seat = seatsProjection.getPlayersSeat(playerId);
    return new notifications.Player(playerId, name, chips, seat);
}

function generateBetMadeNotification(game, playerId)
{
    var chipsProjection = new ChipsProjection(game);
    var roundProjection = new RoundProjection(game);

    var playerChips = chipsProjection.getPlayerChips(playerId);
    var amountBetInBettingRound = roundProjection.getPlayerBet(playerId);

    return new notifications.BetMade(playerId, amountBetInBettingRound, playerChips);
}

function runNextAction()
{
    var roundProjection = new RoundProjection(this.game);

    var nextAction = roundProjection.getNextAction();

}

function removeDisconnectedPlayers(controller, game)
{
    var seatsProjection = new SeatsProjection(game);

    var players = seatsProjection.getPlayers();

    var disconnectedPlayers = players.filter(playerId => {
        return !controller.socketMapper.hasSocketForPlayer(playerId);
    });

    disconnectedPlayers.forEach(playerId => {
        game.removePlayer(playerId);
    });
}

module.exports = HttpController;