
const events = require('./events');
const EventStream = require('./event-stream');
const SeatsProjection = require('./seats-projection');
const RoundProjection = require('./round-projection');
const DeckProjection = require('./deck-projection');
const ChipsProjection = require('./chips-projection');
const WinnerCalculator = require('./winner-calculator');

function Game (id, eventLogger)
{
    this.id = id;
    this.events = new EventStream(eventLogger);
}

Game.prototype.addPlayer = function(playerId, name)
{
    let seatsProjection = new SeatsProjection(this);

    let seat = seatsProjection.getPlayersSeat(playerId);

    if (seat !== false) {
        return;
    }

    this.events.push(new events.PlayerNamed(playerId, name));

    let freeSeat = seatsProjection.getFreeSeat();

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
    let seatsProjection = new SeatsProjection(this);

    let seat = seatsProjection.getPlayersSeat(playerId);

    if (seat === false) {
        return;
    }

    this.events.push(new events.SeatEmptied(seat, playerId));

    this.foldHand(playerId);
};

Game.prototype.startNewRound = function(deckSeed)
{
    deckSeed = deckSeed || Math.random().toString(36);

    let seatsProjection = new SeatsProjection(this);
    let deckProjection = new DeckProjection(this);

    let players = seatsProjection.getNextThreePlayersAfterDealer();

    let dealer = players[0],
        smallBlind = players[1],
        bigBlind = players[2];

    this.events.push(new events.RoundStarted(deckSeed, dealer, smallBlind, bigBlind));

    seatsProjection.getActivePlayers().forEach(playerId => {
        let cards = deckProjection.getCards(2);
        this.events.push(new events.HandDealt(playerId, cards));
    });

    this.placeBet(smallBlind, 20);
    this.placeBet(bigBlind, 40);
};

Game.prototype.foldHand = function(playerId)
{
    let roundProjection = new RoundProjection(this);

    if (!roundProjection.getPlayerHand(playerId)) {
        return;
    }
    this.events.push(new events.HandFolded(playerId));

    let activeHands = roundProjection.getActiveHands();
    if (activeHands.length > 1) {
        return;
    }

    let winningHand = activeHands[0];
    let pot = roundProjection.getPot();

    let handWonEvent = new events.PotWon(winningHand.playerId);
    let playerGivenChipsEvent = new events.PlayerGivenChips(winningHand.playerId, pot);

    this.events.push(handWonEvent, playerGivenChipsEvent);

    this.bankruptPlayersWithNoChips();
};

Game.prototype.dealFlop = function()
{
    this.closeRoundOfBetting();

    let deckProjection = new DeckProjection(this);

    let cards = deckProjection.getCards(3);
    this.events.push(new events.FlopDealt(cards));
};

Game.prototype.dealTurn = function()
{
    this.closeRoundOfBetting();

    let deckProjection = new DeckProjection(this);

    let card = deckProjection.getCards(1)[0];
    this.events.push(new events.TurnDealt(card));
};

Game.prototype.dealRiver = function()
{
    this.closeRoundOfBetting();

    let deckProjection = new DeckProjection(this);

    let card = deckProjection.getCards(1)[0];
    this.events.push(new events.RiverDealt(card));
};

Game.prototype.finish = function()
{
    let roundProjection = new RoundProjection(this);

    this.closeRoundOfBetting();

    let pots = roundProjection.getPots();

    let game = this;

    let communityCards = roundProjection.getCommunityCards();

    pots.forEach(pot => {

        if (pot.players.length === 1) {
            let playerGivenChipsEvent = new events.PlayerGivenChips(pot.players[0], pot.amount);
            game.events.push(playerGivenChipsEvent);
            return;
        }

        let hands = roundProjection.getPlayerHands(pot.players);
        let winningHand = WinnerCalculator.findWinner(hands, communityCards);

        let handWonEvent = new events.PotWon(winningHand.playerId);
        let playerGivenChipsEvent = new events.PlayerGivenChips(winningHand.playerId, pot.amount);

        game.events.push(handWonEvent, playerGivenChipsEvent);
    });

    this.bankruptPlayersWithNoChips();
};

Game.prototype.bankruptPlayersWithNoChips = function()
{
    let roundProjection = new RoundProjection(this);

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
    let chipsProjection = new ChipsProjection(this);
    let playerChips = chipsProjection.getPlayerChips(playerId);
    amount = (amount >= 0) ? amount: 0;
    amount = (amount < playerChips) ? amount : playerChips;
    this.events.push(new events.BetPlaced(playerId, amount));
};

module.exports = Game;