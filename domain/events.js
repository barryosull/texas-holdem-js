
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



module.exports = Events;
