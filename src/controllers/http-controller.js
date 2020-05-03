
const Notifier = require('../application/notifier');
const SocketMapper = require('./socket-mapper');
const GameRepo = require('../domain/game-repository');
const SeatsQueryable = require('../application/seats-queryable');
const UseCases = require('../application/use-cases');

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
    let gameId = req.params.gameId;

    let socketId = req.header('Authorization').replace("Bearer ", "");
    let playerId = req.body.playerId;
    let playerName = req.body.playerName;

    let existingSocketId = this.socketMapper.getSocketIdForPlayer(playerId);

    if (existingSocketId && existingSocketId !== socketId) {
        this.useCases.existingPlayer(gameId, playerId, playerName);
        return;
    }

    this.socketMapper.associate(socketId, gameId, playerId);

    this.useCases.joinGame(gameId, playerId, playerName);

    let notificationList = this.notifier.getRoundNotifications(gameId, playerId);

    res.json(notificationList);
};

HttpController.prototype.dealCards = function(req, res)
{
    let gameId = req.params.gameId;

    if (!isGameAdmin(this, gameId, req)) {
        res.send('');
        return;
    }

    this.useCases.dealCards(gameId);

    res.send('');
};

HttpController.prototype.dealFlop = function(req, res)
{
    let gameId = req.params.gameId;

    if (!isGameAdmin(this, gameId, req)) {
        res.send('');
        return;
    }

    this.useCases.dealFlop(gameId);

    res.send('');
};

HttpController.prototype.dealTurn = function(req, res)
{
    let gameId = req.params.gameId;

    if (!isGameAdmin(this, gameId, req)) {
        res.send('');
        return;
    }

    this.useCases.dealTurn(gameId);

    res.send('');
};

HttpController.prototype.dealRiver = function(req, res)
{
    let gameId = req.params.gameId;

    if (!isGameAdmin(this, gameId, req)) {
        res.send('');
        return;
    }

    this.useCases.dealRiver(gameId);

    res.send('');
};

HttpController.prototype.finish = function(req, res)
{
    let gameId = req.params.gameId;

    if (!isGameAdmin(this, gameId, req)) {
        res.send('');
        return;
    }

    this.useCases.finish(gameId);

    res.send('');
};

HttpController.prototype.givePlayerChips = function(req, res)
{
    let gameId = req.params.gameId;

    if (!isGameAdmin(this, gameId, req)) {
        res.send('Nice try bucko');
        return;
    }
    let playerId = req.body.playerId;
    let amount = parseInt(req.body.amount);

    if (!playerId) {
        return;
    }

    this.useCases.givePlayerChips(gameId, playerId, amount);

    res.send('');
};


HttpController.prototype.placeBet = function(req, res)
{
    let gameId = req.params.gameId;

    let socketId = req.header('Authorization').replace("Bearer ", "");
    let playerId = this.socketMapper.getPlayerIdForSocket(socketId);
    let amount = parseInt(req.body.amount);

    this.useCases.placeBet(gameId, playerId, amount);

    res.send('');
};

HttpController.prototype.foldHand = function(req, res)
{
    let gameId = req.params.gameId;

    let socketId = req.header('Authorization').replace("Bearer ", "");
    let playerId = this.socketMapper.getPlayerIdForSocket(socketId);

    this.useCases.foldHand(gameId, playerId);

    res.send('');
};

function isGameAdmin(controller, gameId, req)
{
    let game = GameRepo.fetchOrCreate(gameId);

    let socketId = req.header('Authorization').replace("Bearer ", "");
    let playerId = controller.socketMapper.getPlayerIdForSocket(socketId);

    let seatsQueryable = new SeatsQueryable(game);

    return seatsQueryable.isAdmin(playerId);
}

module.exports = HttpController;