
const notifications = require('./notifications');

function Notifier(io, socketMapper)
{
    this.io = io;
    this.socketMapper = socketMapper;
    this.notificationStore = new NotificationStore();
}

Notifier.prototype.broadcast = function(gameId, notification) {

    if (notification instanceof notifications.RoundStarted) {
        this.notificationStore.resetSavedNotifications(gameId);
    }

    if (notification instanceof notifications.PlayerDealtHand) {
        let socketId = this.socketMapper.getSocketIdForPlayer(notification.playerId);
        this.notificationStore.storePlayerNotification(gameId, notification.playerId, notification);
        broadcastToPlayer.call(this, socketId, notification);
        return;
    }

    this.notificationStore.storeRoundNotification(gameId, notification);
    broadcast.call(this, gameId, notification);
};

Notifier.prototype.getRoundNotifications = function(gameId, playerId)
{
    let roundNotifications = this.notificationStore.getRoundNotifications(gameId);

    let playerNotifications = this.notificationStore.getPlayerNotifications(gameId, playerId);

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

function NotificationStore()
{
    this.roundNotification = {};
    this.playerNotifications = {};
}

NotificationStore.prototype.resetSavedNotifications = function(gameId)
{
    this.roundNotification[gameId] = [];
    this.playerNotifications[gameId] = {};
};

NotificationStore.prototype.storePlayerNotification = function(gameId, playerId, notification)
{
    let type = makeTypeFromClass(notification);

    this.playerNotifications[gameId] = this.playerNotifications[gameId] || {};
    this.playerNotifications[gameId][playerId] = this.playerNotifications[gameId][playerId] || [];

    this.playerNotifications[gameId][playerId].push({
        'type': type,
        'notification': notification
    });
};

NotificationStore.prototype.storeRoundNotification = function(gameId, notification)
{
    let type = makeTypeFromClass(notification);

    this.roundNotification[gameId] = this.roundNotification[gameId] || [];

    this.roundNotification[gameId].push({
        'type': type,
        'notification': notification
    });
};

NotificationStore.prototype.getPlayerNotifications = function(gameId, playerId)
{
    let allPlayerNotifications = this.playerNotifications[gameId] || {};

    return allPlayerNotifications[playerId] || [];
};

NotificationStore.prototype.getRoundNotifications = function(gameId)
{
    return this.roundNotification[gameId] || [];
};

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
