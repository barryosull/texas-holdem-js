
var Server = require('socket.io');
var Controller = require('./controller');

/**
 * @param io {Server}
 */
function boot(io)
{
    io.on('connection', function(socket)
    {
        socket.on('newPlayer', Controller.addPlayer);
        socket.on('disconnect', Controller.removePlayer);
    });
}

module.exports = boot;

