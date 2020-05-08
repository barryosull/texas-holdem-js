
var GameRepo = require('../domain/game-repository');
var SocketMapper = require('./socket-mapper');

let gameRepo = new GameRepo();

/**
 * @param socketMapper {SocketMapper}
 */
function SocketController(socketMapper)
{
    this.socketMapper = socketMapper;
}

SocketController.prototype.playerDisconnected = function(socket)
{
    var socketId = socket.id;

    var gameId = this.socketMapper.getGameForSocket(socketId);

    this.socketMapper.disassociate(socketId);

    if (this.socketMapper.isGameEmpty(gameId)) {
        gameRepo.remove(gameId);
    }
};

module.exports = SocketController;