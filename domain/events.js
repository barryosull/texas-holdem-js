
var Events = {};

Events.PlayerNamed = function(playerId, name)
{
    this.playerId = playerId;
    this.name = name;
};

Events.SeatTaken = function(seat, playerId)
{
    this.seat = seat;
    this.playerId = playerId;
};

Events.SeatEmptied = function(seat)
{
    this.seat = seat;
};

Events.RoundStarted = function()
{

};

Events.HandDealt = function(playerId, cards)
{
    this.playerId = playerId;
    this.cards = cards;
};

Events.HandFolded = function(playerId)
{
    this.playerId = playerId;
};


module.exports = Events;
