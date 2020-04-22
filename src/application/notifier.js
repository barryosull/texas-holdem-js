
var notifications = require('./notifications');

function Notifier(io)
{
    this.io = io;
    this.roundNotification = {};
}

Notifier.prototype.broadcast = function(gameId, notification) {

    if (notification instanceof notifications.RoundStarted) {
        this.roundNotification[gameId] = [];
    }

    let type = makeTypeFromClass(notification);

    this.roundNotification[gameId] = this.roundNotification[gameId] || [];

    this.roundNotification[gameId].push({
        'type': type,
        'notification': notification
    });

    this.io.to(gameId).emit(type, notification);
};

Notifier.prototype.broadcastToPlayer = function(socketId, notification)
{
    let type = makeTypeFromClass(notification);
    this.io.sockets.to(socketId).emit(type, notification);
};

Notifier.prototype.getRoundNotifications = function(gameId)
{
    return this.roundNotification[gameId] || [];
};

function makeTypeFromClass(notification)
{
    let name = notification.constructor.name;

    return name.charAt(0).toLowerCase() + name.substring(1);
}

module.exports = Notifier;
