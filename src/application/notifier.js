
var notifications = require('./notifications');

function Notifier(io)
{
    this.io = io;
    this.roundNotification = {};
    this.playerNotifications = {};
}

Notifier.prototype.broadcast = function(gameId, notification) {

    if (notification instanceof notifications.RoundStarted) {
        resetSavedNotifications.call(this, gameId);
    }
    storeRoundNotification.call(this, gameId, notification);
    broadcast.call(this, gameId, notification);
};

Notifier.prototype.broadcastToPlayer = function(gameId, playerId, socketId, notification)
{
    storePlayerNotification.call(this, gameId, playerId, notification);
    broadcastToPlayer.call(this, socketId, notification);
};

Notifier.prototype.getRoundNotifications = function(gameId, playerId)
{
    let roundNotifications = getRoundNotifications.call(this, gameId);

    let playerNotifications = getPlayerNotifications.call(this, gameId, playerId);

    return roundNotifications.slice().concat(playerNotifications);
};


//*************************************
// Factories
//*************************************

function makeTypeFromClass(notification)
{
    let name = notification.constructor.name;

    return name.charAt(0).toLowerCase() + name.substring(1);
}


//*************************************
// Notification storage
//*************************************

function resetSavedNotifications(gameId)
{
    this.roundNotification[gameId] = [];
    this.playerNotifications[gameId] = {};
}

function storePlayerNotification(gameId, playerId, notification)
{
    let type = makeTypeFromClass(notification);

    this.playerNotifications[gameId] = this.playerNotifications[gameId] || {};
    this.playerNotifications[gameId][playerId] = this.playerNotifications[gameId][playerId] || [];

    this.playerNotifications[gameId][playerId].push({
        'type': type,
        'notification': notification
    });
}

function storeRoundNotification(gameId, notification)
{
    let type = makeTypeFromClass(notification);

    this.roundNotification[gameId] = this.roundNotification[gameId] || [];

    this.roundNotification[gameId].push({
        'type': type,
        'notification': notification
    });
}

function getPlayerNotifications(gameId, playerId)
{
    let allPlayerNotifications = this.playerNotifications[gameId] || {};

    return allPlayerNotifications[playerId] || [];
}

function getRoundNotifications(gameId)
{
    return this.roundNotification[gameId] || [];
}


//*************************************
// Broadcasting
//*************************************

function broadcastToPlayer(socketId, notification)
{
    let type = makeTypeFromClass(notification);
    this.io.sockets.to(socketId).emit(type, notification);
}

function broadcast(gameId, notification)
{
    let type = makeTypeFromClass(notification);
    this.io.to(gameId).emit(type, notification);
}

module.exports = Notifier;
