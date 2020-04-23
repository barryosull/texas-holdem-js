
var Notifier = require('../application/notifier');
var SocketMapper = require('./socket-mapper');
var GameRepo = require('../domain/game-repository');
var SeatsProjection = require('../application/seats-projection');
var UseCases = require('../application/use-cases');

/**
 * @param notifier {Notifier}
 * @param socketMapper {SocketMapper}
 * @constructor
 */
function HttpController(notifier, socketMapper)
{
    this.notifier = notifier;
    this.socketMapper = socketMapper;
    this.useCases = new UseCases(notifier, socketMapper);
}

HttpController.prototype.join = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = req.body.playerId;
    var playerName = req.body.playerName;

    var existingSocketId = this.socketMapper.getSocketIdForPlayer(playerId);

    if (existingSocketId && existingSocketId !== socketId) {
        this.useCases.existingPlayer(game, playerId, playerName);
        return;
    }

    this.socketMapper.associate(socketId, game.id, playerId);

    this.useCases.joinGame(game, playerId, playerName);

    var notificationList = this.notifier.getRoundNotifications(game.id, playerId);

    res.json(notificationList);
};

HttpController.prototype.dealCards = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('');
        return;
    }

    this.useCases.dealCards(game);

    res.send('');
};

HttpController.prototype.dealFlop = function(req, res)
{
    var gameId = req.params.gameId;

    var game = GameRepo.fetchOrCreate(gameId);

    if (!isGameAdmin(this, game, req)) {
        res.send('');
        return;
    }

    this.useCases.dealFlop(game);

    res.send('');
};

HttpController.prototype.dealTurn = function(req, res)
{
    var gameId = req.params.gameId;

    var game = GameRepo.fetchOrCreate(gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('');
        return;
    }

    this.useCases.dealTurn(game);

    res.send('');
};

HttpController.prototype.dealRiver = function(req, res)
{
    var gameId = req.params.gameId;

    var game = GameRepo.fetchOrCreate(gameId);

    if (!isGameAdmin(this, game, req)) {
        res.send('');
        return;
    }

    this.useCases.dealRiver(game);

    res.send('');
};

HttpController.prototype.finish = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!isGameAdmin(this,game, req)) {
        res.send('');
        return;
    }

    this.useCases.finish(game);

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

    this.useCases.givePlayerChips(game, playerId, amount);

    res.send('');
};


HttpController.prototype.placeBet = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = this.socketMapper.getPlayerIdForSocket(socketId);
    var amount = parseInt(req.body.amount);

    this.useCases.placeBet(game, playerId, amount);

    // Figure out the next action

    res.send('');
};

HttpController.prototype.foldHand = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = this.socketMapper.getPlayerIdForSocket(socketId);

    this.useCases.foldHand(game, playerId);

    // Figure out next action

    res.send('');
};

function isGameAdmin(controller, game, req)
{
    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = controller.socketMapper.getPlayerIdForSocket(socketId);

    var seatsProjection = new SeatsProjection(game);

    return seatsProjection.isAdmin(playerId);
}

module.exports = HttpController;