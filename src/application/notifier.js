
var notifications = require('./notifications');

function Notifier(io)
{
    this.io = io;
    this.roundNotification = {};
    this.playerNotifications = {};
}

Notifier.prototype.broadcast = function(gameId, notification) {

    if (notification instanceof notifications.RoundStarted) {
        this.roundNotification[gameId] = [];
        this.playerNotifications[gameId] = {};
    }

    let type = makeTypeFromClass(notification);

    this.roundNotification[gameId] = this.roundNotification[gameId] || [];

    this.roundNotification[gameId].push({
        'type': type,
        'notification': notification
    });

    this.io.to(gameId).emit(type, notification);
};

Notifier.prototype.broadcastToPlayer = function(gameId, playerId, socketId, notification)
{
    let type = makeTypeFromClass(notification);

    this.playerNotifications[gameId] = this.playerNotifications[gameId] || {};
    this.playerNotifications[gameId][playerId] = this.playerNotifications[gameId][socketId] || [];

    this.playerNotifications[gameId][playerId].push({
        'type': type,
        'notification': notification
    });

    this.io.sockets.to(socketId).emit(type, notification);
};

Notifier.prototype.getRoundNotifications = function(gameId, playerId)
{
    let roundNotifications = this.roundNotification[gameId] || [];

    let allPlayerNotifications = this.playerNotifications[gameId] || {};

    let playerNotifications = allPlayerNotifications[playerId] || [];

    return roundNotifications.slice().concat(playerNotifications);
};

function makeTypeFromClass(notification)
{
    let name = notification.constructor.name;

    return name.charAt(0).toLowerCase() + name.substring(1);
}

module.exports = Notifier;
