
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
        this.notifier.broadcastToPlayer(playerId, new notifications.ExistingSession());
        return;
    }

    this.socketMapper.associate(socketId, game.id, playerId);

    game.addPlayer(playerId, playerName);

    var gameState = generateGameStateViewModel(game, playerId);

    res.json(gameState);
};

HttpController.prototype.dealCards = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('');
        return;
    }

    removeDisconnectedPlayers(this, game);

    var seatsProjection = new SeatsProjection(game);

    let playersListNotification = generatePlayerListNotification(game);
    this.notifier.broadcast(game.id, playersListNotification);

    game.startNewRound();

    var roundStarted = seatsProjection.getRoundStarted();

    var players = seatsProjection.getPlayers();

    players.forEach(playerId => {
        let roundStartedNotification = generateRoundStartedNotification(game, playerId);
        let socketId = this.socketMapper.getSocketIdForPlayer(playerId);
        this.notifier.broadcastToPlayer(socketId, roundStartedNotification);
    });

    this.notifier.broadcast(game.id, generateBetMadeNotification(game, roundStarted.smallBlind));
    this.notifier.broadcast(game.id, generateBetMadeNotification(game, roundStarted.bigBlind));
    this.notifier.broadcast(game.id, generateNextPlayersTurn(game));

    res.send('');
};

HttpController.prototype.dealFlop = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('');
        return;
    }

    game.dealFlop();

    var roundProjection = new RoundProjection(game);

    let cards = roundProjection.getCommunityCards().slice(0, 3);
    this.notifier.broadcast(game.id, new notifications.FlopDealt(cards));

    var amount = roundProjection.getPot();
    this.notifier.broadcast(game.id, new notifications.PotTotal(amount));
    this.notifier.broadcast(game.id, generateNextPlayersTurn(game));

    res.send('');
};

HttpController.prototype.dealTurn = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('');
        return;
    }

    game.dealTurn();

    var roundProjection = new RoundProjection(game);

    var card = roundProjection.getCommunityCards().slice(-1).pop();
    var amount = roundProjection.getPot();

    this.notifier.broadcast(game.id, new notifications.TurnDealt(card));
    this.notifier.broadcast(game.id, new notifications.PotTotal(amount));
    this.notifier.broadcast(game.id, generateNextPlayersTurn(game));

    res.send('');
};

HttpController.prototype.dealRiver = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('');
        return;
    }

    game.dealRiver();

    var roundProjection = new RoundProjection(game);

    var card = roundProjection.getCommunityCards().slice(-1).pop();

    this.notifier.broadcast(game.id, new notifications.RiverDealt(card));

    var amount = roundProjection.getPot();
    this.notifier.broadcast(game.id, new notifications.PotTotal(amount));
    this.notifier.broadcast(game.id, generateNextPlayersTurn(game));

    res.send('');
};

HttpController.prototype.finish = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('');
        return;
    }

    game.finish();

    var roundProjection = new RoundProjection(game);
    var chipsProjection = new ChipsProjection(game);

    var winningPlayerId = roundProjection.getWinner();
    var winningHand = roundProjection.getPlayerHand(winningPlayerId);
    var playerChips = chipsProjection.getPlayerChips(winningPlayerId);

    this.notifier.broadcast(game.id, new notifications.WinningHand(winningHand, playerChips));

    res.send('');
};

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

    let playersListNotification = this.generatePlayerListNotification(game);
    this.notifier.broadcast(game.id, playersListNotification);

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
    this.notifier.broadcast(game.id, generateNextPlayersTurn(game));

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

    var winningHand = roundProjection.getWinner();
    if (!winningHand) {
        this.notifier.broadcast(game.id, generateNextPlayersTurn(game));
        return;
    }

    var chipsProjection = new ChipsProjection(game);

    let playerChips = chipsProjection.getPlayerChips(winningHand.playerId);
    this.notifier.broadcast(game.id, new notifications.WinnerByDefault(winningHand, playerChips));

    res.send('');
};

function generateRoundStartedNotification(game, playerId)
{
    var seatsProjection = new SeatsProjection(game);
    var roundProjection = new RoundProjection(game);

    var roundStarted = seatsProjection.getRoundStarted();

    if (!roundStarted) {
        return null;
    }

    var activePlayers = seatsProjection.getActivePlayers();
    var bankruptedPlayers = roundProjection.bankruptedInLastRound();

    var hand = roundProjection.getPlayerHand(playerId);

    return new notifications.RoundStarted(hand, roundStarted.dealer, activePlayers, bankruptedPlayers);
}

function isGameAdmin(controller, game, req)
{
    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = controller.socketMapper.getPlayerIdForSocket(socketId);

    var seatsProjection = new SeatsProjection(game);

    return seatsProjection.isAdmin(playerId);
}

function generateNextPlayersTurn(game)
{
    var roundProjection = new RoundProjection(game);
    var chipsProjection = new ChipsProjection(game);

    var nextPlayerToAct = roundProjection.getNextPlayerToAct();

    var amountToPlay = roundProjection.getAmountToPlay(nextPlayerToAct);

    var playerChips = chipsProjection.getPlayerChips(nextPlayerToAct);

    amountToPlay = Math.min(playerChips, amountToPlay);

    return new notifications.PlayersTurn(nextPlayerToAct, amountToPlay);
}

function generateGameStateViewModel(game, playerId)
{
    var roundProjection = new RoundProjection(game);

    return {
        playerList: generatePlayerListNotification(game),
        round: generateRoundStartedNotification(game, playerId),
        cards: roundProjection.getCommunityCards(),
        pot: roundProjection.getPot()
    };
}

function generatePlayerListNotification (game)
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

    return new notifications.PlayerList(players);
}

function generateBetMadeNotification(game, playerId)
{
    var chipsProjection = new ChipsProjection(game);
    var roundProjection = new RoundProjection(game);

    var playerChips = chipsProjection.getPlayerChips(playerId);
    var amountBetInBettingRound = roundProjection.getPlayerBet(playerId);

    return new notifications.BetMade(playerId, amountBetInBettingRound, playerChips);
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