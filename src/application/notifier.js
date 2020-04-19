
function Notifier(io)
{
    this.io = io;
}

Notifier.prototype.broadcast = function(gameId, notification) {
    let type = makeTypeFromClass(notification);
    this.io.to(gameId).emit(type, notification);
};

Notifier.prototype.broadcastToPlayer = function(socketId, notification)
{
    let type = makeTypeFromClass(notification);
    this.io.sockets.to(socketId).emit(type, notification);
};

function makeTypeFromClass(notification)
{
    let name = notification.constructor.name;

    return name.charAt(0).toLowerCase() + name.substring(1);
}

module.exports = Notifier;
