
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

Events.RoundStarted = function(deckSeed, dealer)
{
    this.deckSeed = deckSeed;
    this.dealer = dealer;
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

Events.FlopDealt = function(cards)
{
    this.cards = cards;
};

Events.TurnDealt = function(card)
{
    this.card = card;
};

Events.RiverDealt = function(card)
{
    this.card = card;
};

Events.HandWon = function(playerId)
{
    this.playerId = playerId;
};

Events.BetMade = function(playerId, amount)
{
    this.playerId = playerId;
    this.amount = amount;
};

module.exports = Events;
