
var events = require('./events');
var EventStream = require('./event-stream');
var SeatsProjection = require('./seats-projection');
var RoundProjection = require('./round-projection');
var DeckProjection = require('./deck-projection');
var ChipsProjection = require('./chips-projection');
var WinnerCalculator = require('./winner-calculator');

var Game = function(id, eventLogger)
{
    this.id = id;
    this.events = new EventStream(eventLogger);
};

Game.prototype.addPlayer = function(playerId, name)
{
    var seatsProjection = new SeatsProjection(this);

    var seat = seatsProjection.getPlayersSeat(playerId);

    if (seat !== false) {
        return;
    }

    this.events.push(new events.PlayerNamed(playerId, name));

    var freeSeat = seatsProjection.getFreeSeat();

    if (freeSeat == null) {
        console.log("All seats taken, no room for player " + playerId);
        return;
    }

    this.events.push(new events.SeatTaken(freeSeat, playerId));
};

Game.prototype.givePlayerChips = function(playerId, amount)
{
    this.events.push(new events.PlayerGivenChips(playerId, amount))
};

Game.prototype.removePlayer = function(playerId)
{
    var seatsProjection = new SeatsProjection(this);

    var seat = seatsProjection.getPlayersSeat(playerId);

    if (seat === false) {
        return;
    }

    this.events.push(new events.SeatEmptied(seat, playerId));

    this.foldHand(playerId);
};

Game.prototype.startNewRound = function(deckSeed)
{
    deckSeed = deckSeed || Math.random().toString(36);

    var seatsProjection = new SeatsProjection(this);
    var deckProjection = new DeckProjection(this);

    var players = seatsProjection.getNextThreePlayersAfterDealer();

    var dealer = players[0],
        smallBlind = players[1],
        bigBlind = players[2];

    this.events.push(new events.RoundStarted(deckSeed, dealer, smallBlind, bigBlind));

    seatsProjection.getActivePlayers().forEach(playerId => {
        var cards = deckProjection.getCards(2);
        this.events.push(new events.HandDealt(playerId, cards));
    });

    this.placeBet(smallBlind, 20);
    this.placeBet(bigBlind, 40);
};

Game.prototype.foldHand = function(playerId)
{
    var roundProjection = new RoundProjection(this);

    var playerHand = roundProjection.getPlayerHand(playerId);
    if (!playerHand) {
        return;
    }
    this.events.push(new events.HandFolded(playerId));

    var winnerByDefaultHand = roundProjection.getWinnerByDefaultHand();
    if (winnerByDefaultHand) {
        winRound(this, winnerByDefaultHand);
        this.bankruptPlayersWithNoChips();
    }
};

function winRound(game, winningHand, amount)
{
    var roundProjection = new RoundProjection(game);

    var handWonEvent = new events.HandWon(winningHand.playerId);
    var pot = amount || roundProjection.getPot();
    var playerGivenChipsEvent = new events.PlayerGivenChips(winningHand.playerId, pot);
    game.events.push(handWonEvent, playerGivenChipsEvent);
}

Game.prototype.dealFlop = function()
{
    this.closeRoundOfBetting();

    var deckProjection = new DeckProjection(this);

    var cards = deckProjection.getCards(3);
    this.events.push(new events.FlopDealt(cards));
};

Game.prototype.dealTurn = function()
{
    this.closeRoundOfBetting();

    var deckProjection = new DeckProjection(this);

    var card = deckProjection.getCards(1)[0];
    this.events.push(new events.TurnDealt(card));
};

Game.prototype.dealRiver = function()
{
    this.closeRoundOfBetting();

    var deckProjection = new DeckProjection(this);

    var card = deckProjection.getCards(1)[0];
    this.events.push(new events.RiverDealt(card));
};

Game.prototype.finish = function()
{
    var roundProjection = new RoundProjection(this);

    this.closeRoundOfBetting();

    let pots = roundProjection.getPots();

    pots.map(pot => {
        let players = pot.players;
        let hands = roundProjection.getPlayerHands(players);
        let communityCards = roundProjection.getCommunityCards();
        let winningHand = WinnerCalculator.findWinner(hands, communityCards);
        winRound(this, winningHand, pot.amount);
    });

    this.bankruptPlayersWithNoChips();
};

Game.prototype.bankruptPlayersWithNoChips = function()
{
    var roundProjection = new RoundProjection(this);

    roundProjection.getPlayersBankruptedInRound().forEach(playerId => {
        this.events.push(new events.PlayerBankrupted(playerId));
    });
};

Game.prototype.closeRoundOfBetting = function()
{
    this.events.push(new events.BettingRoundClosed());
};

Game.prototype.placeBet = function(playerId, amount)
{
    var chipsProjection = new ChipsProjection(this);
    var playerChips = chipsProjection.getPlayerChips(playerId);
    amount = (amount >= 0) ? amount: 0;
    amount = (amount < playerChips) ? amount : playerChips;
    this.events.push(new events.BetPlaced(playerId, amount));
};

module.exports = Game;