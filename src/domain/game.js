
var events = require('./events');
var SeatsProjection = require('./seats-projection');
var PlayersProjection = require('./players-projection');
var RoundProjection = require('./round-projection');
var DeckProjection = require('./deck-projection');

var Game = function(id)
{
    this.id = id;
    this.events = [];

    // Projections
    this.seats = new SeatsProjection(this);
    this.players = new PlayersProjection(this);
    this.round = new RoundProjection(this);
    this.deck = new DeckProjection(this);
};

Game.prototype.addPlayer = function(playerId, name)
{
    this.events.push(
        new events.PlayerNamed(playerId, name)
    );

    var freeSeat = this.events.reduce((value, e) => {
        if (e instanceof events.SeatTaken) {
            return e.seat + 1;
        }
        return value;
    }, 0);

    if (freeSeat >= 8) {
        console.log("All seats taken, no room for player " + playerId);
    }

    this.events.push(new events.SeatTaken(freeSeat, playerId));
};

Game.prototype.removePlayer = function(playerId)
{
    var seat = this.seats.getSeat(playerId);
    this.events.push(new events.SeatEmptied(seat));
    return seat;
};

Game.prototype.startNewRound = function()
{
    var deckSeed = Math.random().toString(36);

    var dealer = this.seats.getNextDealer();

    this.events.push(new events.RoundStarted(deckSeed, dealer));

    this.seats.getActivePlayers().forEach(playerId => {
        var cards = this.deck.getCards(2);
        this.events.push(new events.HandDealt(playerId, cards));
    });
};

Game.prototype.hasPlayers = function()
{
    return this.seats.getActivePlayers().length !== 0;
};

Game.prototype.foldHand = function(playerId)
{
    var playerHand = this.round.getPlayerHand(playerId);
    if (!playerHand) {
        return;
    }
    this.events.push(new events.HandFolded(playerId));
};

Game.prototype.dealFlop = function()
{
    var cards = this.deck.getCards(3);
    var event = new events.FlopDealt(cards);
    this.events.push(event);
    return event;
};

Game.prototype.dealTurn = function()
{
    var card = this.deck.getCards(1)[0];
    var event = new events.TurnDealt(card);
    this.events.push(event);
    return event;
};

Game.prototype.dealRiver = function()
{
    var card = this.deck.getCards(1)[0];
    var event = new events.RiverDealt(card);
    this.events.push(event);
    return event;
};

Game.prototype.announceWinner = function()
{
    var winningHand = this.round.chooseWinningHand();
    var event = new events.HandWon(winningHand.playerId);
    this.events.push(event);
    return event;
};

Game.prototype.makeBet = function(playerId, amount)
{
    this.events.push(new events.BetMade(playerId, amount));
};

module.exports = Game;