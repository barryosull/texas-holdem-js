
var events = require('./events');
var SeatsProjection = require('./seats-projection');
var PlayersProjection = require('./players-projection');
var RoundProjection = require('./round-projection');
var DeckProjection = require('./deck-projection');

var Game = function(id, eventLogger)
{
    this.id = id;
    this.events = [];

    this.eventLogger = eventLogger || function(event){ console.log(event) };

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
        this.eventLogger(arguments[i]);
    }
};

const STARTING_CHIPS_COUNT = 1000;

Game.prototype.addPlayer = function(playerId, name)
{
    var seat = this.seats.getPlayersSeat(playerId);

    if (seat !== false) {
        return;
    }

    this.push(new events.PlayerNamed(playerId, name));

    var freeSeat = this.seats.getFreeSeat();

    if (freeSeat == null) {
        console.log("All seats taken, no room for player " + playerId);
    }

    this.push(new events.SeatTaken(freeSeat, playerId));

    if (isNewPlayer(this, playerId)) {
        this.push(new events.PlayerGivenChips(playerId, STARTING_CHIPS_COUNT))
    }
};

/**
 * @param game {Game}
 * @param playerId {string}
 * @returns {boolean}
 */
function isNewPlayer(game, playerId)
{
    return game.seats.getPlayerChips(playerId) === 0;
}

Game.prototype.removePlayer = function(playerId)
{
    var seat = this.seats.getPlayersSeat(playerId);

    if (seat === false) {
        return;
    }

    this.push(new events.SeatEmptied(seat));

    var winnerByDefaultGand = getWinnerDyDefaultHand(this);
    if (winnerByDefaultGand) {
        winRound(this, winnerByDefaultGand);
    }

    return seat;
};

Game.prototype.startNewRound = function(deckSeed)
{
    deckSeed = deckSeed || Math.random().toString(36);

    var players = this.seats.getNextThreePlayersAfterDealer();

    var dealer = players[0],
        smallBlind = players[1],
        bigBlind = players[2];

    this.push(new events.RoundStarted(deckSeed, dealer, smallBlind, bigBlind));

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

    var winnerByDefaultGand = getWinnerDyDefaultHand(this);
    if (winnerByDefaultGand) {
        winRound(this, winnerByDefaultGand);
        this.bankruptPlayersWithNoChips();
    }
};

function getWinnerDyDefaultHand(game)
{
    var activeHands = game.round.activeHands();
    if (activeHands.length > 1) {
        return null;
    }
    return activeHands[0];
}

function winRound(game, winningHand)
{
    var handWonEvent = new events.HandWon(winningHand.playerId);
    var pot = game.round.getPot();
    var playerGivenChipsEvent = new events.PlayerGivenChips(winningHand.playerId, pot);
    game.push(handWonEvent, playerGivenChipsEvent);
    return [handWonEvent, playerGivenChipsEvent];
}

Game.prototype.dealFlop = function()
{
    this.closeRoundOfBetting();

    var cards = this.deck.getCards(3);
    var event = new events.FlopDealt(cards);
    this.push(event);
    return event;
};

Game.prototype.dealTurn = function()
{
    this.closeRoundOfBetting();

    var card = this.deck.getCards(1)[0];
    var event = new events.TurnDealt(card);
    this.push(event);
    return event;
};

Game.prototype.dealRiver = function()
{
    this.closeRoundOfBetting();

    var card = this.deck.getCards(1)[0];
    var event = new events.RiverDealt(card);
    this.push(event);
    return event;
};

Game.prototype.finish = function()
{
    this.closeRoundOfBetting();

    var winningHand = this.round.chooseWinningHand();
    var winnerEvents = winRound(this, winningHand);
    this.bankruptPlayersWithNoChips();
    return winnerEvents;
};

Game.prototype.bankruptPlayersWithNoChips = function()
{
    this.round.getPlayersBankrupedInRound().forEach(playerId => {
        this.push(new events.PlayerBankrupted(playerId));
    });
};

Game.prototype.closeRoundOfBetting = function()
{
    var event = new events.BettingRoundClosed();
    this.push(event);
    return event;
};

Game.prototype.placeBet = function(playerId, amount)
{
    var playerChips = this.seats.getPlayerChips(playerId);
    amount = (amount >= 0) ? amount: 0;
    amount = (amount < playerChips) ? amount : playerChips;
    this.push(new events.BetPlaced(playerId, amount));
};

module.exports = Game;