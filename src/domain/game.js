
var events = require('./events');
var SeatsProjection = require('./seats-projection');
var RoundProjection = require('./round-projection');
var DeckProjection = require('./deck-projection');
var ChipsProjection = require('./chips-projection');

var Game = function(id, eventLogger)
{
    this.id = id;
    this.events = [];

    this.eventLogger = eventLogger || function(event){ console.log(event) };
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
    var seatsProjection = new SeatsProjection(this);

    var seat = seatsProjection.getPlayersSeat(playerId);

    if (seat !== false) {
        return;
    }

    this.push(new events.PlayerNamed(playerId, name));

    var freeSeat = seatsProjection.getFreeSeat();

    if (freeSeat == null) {
        console.log("All seats taken, no room for player " + playerId);
        return;
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
    var chipsProjection = new ChipsProjection(this);
    return chipsProjection.getPlayerChips(playerId) === 0;
}

Game.prototype.removePlayer = function(playerId)
{
    var seatsProjection = new SeatsProjection(this);


    var seat = seatsProjection.getPlayersSeat(playerId);

    if (seat === false) {
        return;
    }

    this.push(new events.SeatEmptied(seat));

    var roundProjection = new RoundProjection(this);

    var winnerByDefaultHand = roundProjection.getWinnerByDefaultHand();
    if (winnerByDefaultHand) {
        winRound(this, winnerByDefaultHand);
    }
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

    this.push(new events.RoundStarted(deckSeed, dealer, smallBlind, bigBlind));

    seatsProjection.getActivePlayers().forEach(playerId => {
        var cards = deckProjection.getCards(2);
        this.push(new events.HandDealt(playerId, cards));
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
    this.push(new events.HandFolded(playerId));

    var winnerByDefaultHand = roundProjection.getWinnerByDefaultHand();
    if (winnerByDefaultHand) {
        winRound(this, winnerByDefaultHand);
        this.bankruptPlayersWithNoChips();
    }
};

function winRound(game, winningHand)
{
    var roundProjection = new RoundProjection(game);

    var handWonEvent = new events.HandWon(winningHand.playerId);
    var pot = roundProjection.getPot();
    var playerGivenChipsEvent = new events.PlayerGivenChips(winningHand.playerId, pot);
    game.push(handWonEvent, playerGivenChipsEvent);
}

Game.prototype.dealFlop = function()
{
    this.closeRoundOfBetting();

    var deckProjection = new DeckProjection(this);

    var cards = deckProjection.getCards(3);
    this.push(new events.FlopDealt(cards));
};

Game.prototype.dealTurn = function()
{
    this.closeRoundOfBetting();

    var deckProjection = new DeckProjection(this);

    var card = deckProjection.getCards(1)[0];
    this.push(new events.TurnDealt(card));
};

Game.prototype.dealRiver = function()
{
    this.closeRoundOfBetting();

    var deckProjection = new DeckProjection(this);

    var card = deckProjection.getCards(1)[0];
    this.push(new events.RiverDealt(card));
};

Game.prototype.finish = function()
{
    var roundProjection = new RoundProjection(this);

    this.closeRoundOfBetting();
    var winningHand = roundProjection.chooseWinningHand();
    winRound(this, winningHand);
    this.bankruptPlayersWithNoChips();
};

Game.prototype.bankruptPlayersWithNoChips = function()
{
    var roundProjection = new RoundProjection(this);

    roundProjection.getPlayersBankrupedInRound().forEach(playerId => {
        this.push(new events.PlayerBankrupted(playerId));
    });
};

Game.prototype.closeRoundOfBetting = function()
{
    this.push(new events.BettingRoundClosed());
};

Game.prototype.placeBet = function(playerId, amount)
{
    var chipsProjection = new ChipsProjection(this);
    var playerChips = chipsProjection.getPlayerChips(playerId);
    amount = (amount >= 0) ? amount: 0;
    amount = (amount < playerChips) ? amount : playerChips;
    this.push(new events.BetPlaced(playerId, amount));
};

module.exports = Game;