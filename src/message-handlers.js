
var Server = require('socket.io');
var Controller = require('./controller');

/**
 * @param io {Server}
 */
function boot(io)
{
    io.on('connection', function(socket)
    {
        var roomId = socket.handshake.query.gameId;
        socket.join(roomId);

        socket.on('disconnect', Controller.playerDisconnected);
    });
}

module.exports = boot;

