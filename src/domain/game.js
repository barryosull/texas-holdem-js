
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

Game.prototype.push = function(...args)
{
    this.events.push(...args);
    for (var i = 0; i< arguments.length; i++) {
        console.log(arguments[i]);
    }
};

const STARTING_CHIPS_COUNT = 1000;

Game.prototype.addPlayer = function(playerId, name)
{
    this.push(new events.PlayerNamed(playerId, name));

    var freeSeat = this.seats.getFreeSeat();

    if (freeSeat == null) {
        console.log("All seats taken, no room for player " + playerId);
    }

    this.push(new events.SeatTaken(freeSeat, playerId));
    this.push(new events.PlayerGivenChips(playerId, STARTING_CHIPS_COUNT))
};

Game.prototype.removePlayer = function(playerId)
{
    var seat = this.seats.getPlayersSeat(playerId);
    this.push(new events.SeatEmptied(seat));
    return seat;
};

Game.prototype.startNewRound = function()
{
    var deckSeed = Math.random().toString(36);

    var dealer = this.seats.getNextDealer();

    this.push(new events.RoundStarted(deckSeed, dealer));

    this.seats.getActivePlayers().forEach(playerId => {
        var cards = this.deck.getCards(2);
        this.push(new events.HandDealt(playerId, cards));
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
    this.push(new events.HandFolded(playerId));
};

Game.prototype.dealFlop = function()
{
    var cards = this.deck.getCards(3);
    var event = new events.FlopDealt(cards);
    this.push(event);
    return event;
};

Game.prototype.dealTurn = function()
{
    var card = this.deck.getCards(1)[0];
    var event = new events.TurnDealt(card);
    this.push(event);
    return event;
};

Game.prototype.dealRiver = function()
{
    var card = this.deck.getCards(1)[0];
    var event = new events.RiverDealt(card);
    this.push(event);
    return event;
};

Game.prototype.announceWinner = function()
{
    var winningHand = this.round.chooseWinningHand();
    var event = new events.HandWon(winningHand.playerId);
    this.push(event);
    return event;
};

Game.prototype.closeRoundOfBetting = function()
{
    var amount = getAmountBetInBettingRound(this);
    var event = new events.BettingRoundClosed(amount);
    this.push(event);
    return event;
};

var getAmountBetInBettingRound = function(game)
{
    return game.events.reduce((amount, e) => {
        if (e instanceof events.BettingRoundClosed) {
            return 0;
        }
        if (e instanceof events.BetMade) {
            return amount + e.amount;
        }
        return amount;
    }, 0);
};

Game.prototype.makeBet = function(playerId, amount)
{
    this.push(new events.BetMade(playerId, amount));
};

module.exports = Game;