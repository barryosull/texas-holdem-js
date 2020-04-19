
var SocketsToPlayersMap =
{
    map: {},

    associate: function(socketId, playerId)
    {
        SocketsToPlayersMap.map[socketId] = playerId;
    },

    deassociate: function(socketId)
    {
        delete SocketsToPlayersMap.map[socketId];
    },

    getPlayerIdForSocket: function(socketId)
    {
        return SocketsToPlayersMap.map[socketId];
    },

    getSocketIdForPlayer: function(playerId)
    {
        for (var socketId in SocketsToPlayersMap.map) {
            if (SocketsToPlayersMap.map[socketId] === playerId) {
                return socketId;
            }
        }
        return undefined;
    },
};

var SocketsToGameMap = {

    map: {},

    associate: function(socketId, gameId)
    {
        SocketsToGameMap.map[socketId] = gameId;
    },

    deassociate: function(socketId)
    {
        delete SocketsToGameMap.map[socketId];
    },

    getGame: function(socketId)
    {
        return SocketsToGameMap.map[socketId];
    },

    isGameEmpty: function(gameId)
    {
        return Object.values(SocketsToGameMap.map).indexOf(gameId) === -1;
    }
};

function SocketMap() {

}

SocketMap.prototype.associate = function(socketId, gameId, playerId)
{
    console.log(socketId, gameId, playerId);
    SocketsToPlayersMap.associate(socketId, playerId);
    SocketsToGameMap.associate(socketId, gameId);
};

SocketMap.prototype.disassociate = function(socketId)
{
    SocketsToPlayersMap.deassociate(socketId);
    SocketsToGameMap.deassociate(socketId);
};

SocketMap.prototype.isGameEmpty = function(gameId)
{
    return SocketsToGameMap.isGameEmpty(gameId);
};

SocketMap.prototype.getSocketIdForPlayer = function(playerId)
{
    return SocketsToPlayersMap.getSocketIdForPlayer(playerId);
};

SocketMap.prototype.getPlayerIdForSocket = function(socketId)
{
    return SocketsToPlayersMap.getPlayerIdForSocket(socketId);
};

SocketMap.prototype.hasSocketForPlayer = function(playerId)
{
    return !!SocketsToPlayersMap.getSocketIdForPlayer(playerId);
};

SocketMap.prototype.getGameForSocket = function(socketId)
{
    return SocketsToGameMap.getGame(socketId);
};

module.exports = SocketMap;
