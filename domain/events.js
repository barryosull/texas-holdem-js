
var Events = {};

Events.PlayerAdded = function(playerId)
{
    this.playerId = playerId;
};

Events.PlayerNamed = function(playerId, name)
{
    this.playerId = playerId;
    this.name = name;
};


module.exports = Events;
