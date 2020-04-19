
var GameRepo = require('../domain/game-repository');
var SocketMapper = require('./socket-mapper');

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

    console.log(socketId, gameId);

    this.socketMapper.disassociate(socketId);

    if (this.socketMapper.isGameEmpty(gameId)) {
        GameRepo.remove(gameId);
    }
};

module.exports = SocketController;