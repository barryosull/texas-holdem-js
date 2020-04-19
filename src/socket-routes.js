
var Server = require('socket.io');
var Controller = require('./controllers/socket-controller');
var SocketMapper = require('./controllers/socket-mapper');

/**
 * @param io {Server}
 */
function boot(io)
{
    var controller = new Controller(new SocketMapper());

    io.on('connection', function(socket)
    {
        var roomId = socket.handshake.query.gameId;
        socket.join(roomId);
        socket.on('disconnect', () => { controller.playerDisconnected(socket); });
    });
}

module.exports = boot;

