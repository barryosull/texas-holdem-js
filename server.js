var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var pokerTools = require("poker-tools");

var ev = require('./domain/events');


/*******************************
 * Domain concepts
 *******************************/

var denominations = [
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    'jack',
    'queen',
    'king',
    'ace',
];

var suits = [
    'clubs',
    'diamonds',
    'hearts',
    'spades'
];

var Deck = function(cards)
{
    this.cards = cards;
};

Deck.makeNew = function()
{
    var cards = [];

    suits.forEach(suit => {
        denominations.forEach(denomination => {
            cards.push(denomination + '_of_' + suit);
        });
    });

    var deck = new Deck(cards);
    deck.shuffle();
    return deck;
};

Deck.prototype.shuffle = function()
{
    var array = this.cards;

    var currentIndex = array.length;
    var temporaryValue, randomIndex;

    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    this.cards = array;
};

Deck.prototype.dealHand = function()
{
    var card1 = this.cards.pop();
    var card2 = this.cards.pop();
    return [card1, card2];
};

Deck.prototype.dealFlop = function()
{
    var card1 = this.cards.pop();
    var card2 = this.cards.pop();
    var card3 = this.cards.pop();
    return [card1, card2, card3];
};

Deck.prototype.dealTurn = function()
{
    return this.cards.pop();
};

Deck.prototype.dealRiver = function()
{
    return this.cards.pop();
};

var Seats = function (game)
{
    this.game = game;
    this.seats = [
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
    ];
};

Seats.prototype.takeSeat = function(playerId)
{
    for (var index in this.seats) {
        if (this.seats[index] === playerId) {
            return index;
        }
        if (this.seats[index] === false) {
            this.seats[index] = playerId;
            return index;
        }
    }
    console.log("All seats taken, no room for player " + playerId);
    return false;
};

Seats.prototype.getSeat = function(playerId)
{
    for (var index in this.seats) {
        if (this.seats[index] === playerId) {
            return parseInt(index);
        }
    }
    return false;
};

Seats.prototype.freeUpSeat = function(seat)
{
    if (seat === false) {
        return;
    }
    this.seats[seat] = false;
};

Seats.prototype.activePlayers = function()
{
    return this.seats.filter(seatOccupant => {
        return seatOccupant !== false
    });
};

Seats.prototype.makeSeatsViewModel = function()
{
    var viewModel = [];
    this.seats.forEach((playerId, seat) => {
        viewModel.push({
            playerId: playerId,
            playerName: View.getPlayerName(this.game, playerId),
            seat: seat
        });
    });
    return viewModel;
};


/**
 * @param deck {Deck}
 * @constructor
 */
var Round = function(deck)
{
    this.deck = deck;
    this.communityCards = [];
    this.hands = [];
};

Round.prototype.start = function(players)
{
    var hands = [];
    var deck = this.deck;
    players.forEach(playerId => {
        hands.push({
            playerId: playerId,
            cards: deck.dealHand(),
            hasFolded: false
        });
    });
    this.hands = hands;
};

Round.prototype.dealFlop = function()
{
    var flop = this.deck.dealFlop();
    this.communityCards = flop;
    return flop;
};

Round.prototype.dealTurn = function()
{
    var turn = this.deck.dealTurn();
    this.communityCards.push(turn);
    return turn;
};

Round.prototype.dealRiver = function()
{
    var river = this.deck.dealRiver();
    this.communityCards.push(river);
    return river;
};

Round.prototype.foldHand = function(playerId)
{
    var playerHand = this.hands.filter(hand => {
        return hand.playerId === playerId;
    }).pop();

    if (!playerHand) {
        return;
    }

    playerHand.hasFolded = true;
};

Round.prototype.activeHands = function()
{
    return this.hands.filter(hand => {
        return !hand.hasFolded;
    });
};

Round.prototype.getPlayerHand = function(playerId)
{
    return this.hands.filter(hand => {
        return hand.playerId === playerId;
    }).pop();
};

Round.prototype.removePlayer = function(playerId)
{
    this.hands = this.hands.filter(hand => {
        return hand.playerId !== playerId;
    });
};

Round.prototype.chooseWinningHand = function()
{
    var hands = this.activeHands();
    var communityCards = this.communityCards;

    var pokerToolsHands = hands.map(hand => {
       return pokerTools.CardGroup.fromString(
            convertToPokerToolsString(hand.cards)
       );
    });
    var board = pokerTools.CardGroup.fromString(
        convertToPokerToolsString(communityCards)
    );

    const result = pokerTools.OddsCalculator.calculateWinner(pokerToolsHands, board);

    var winnerIndex = result[0][0].index;

    return hands[winnerIndex];
};

function convertToPokerToolsString(cards)
{
    var convertedCards = cards.map(card => {
       var parts = card.split('_of_');
       var number = parts[0];
        if (number === "10") {
            number = "T";
        }
       if (isFaceCard(number)) {
           number = number.charAt(0);
       }

       var suit = parts[1].charAt(0);
       return number.toUpperCase().concat(suit);
    });

    return convertedCards.join("");
}

function isFaceCard(number)
{
    return number.length > 2;
}

var Game = function(id)
{
    this.id = id;
    this.seats = new Seats(this);
    this.round = null;

    this.events = [];
};

Game.prototype.addPlayer = function(playerId, name)
{
    this.events.push(
        new ev.PlayerNamed(playerId, name)
    );

    this.seats.takeSeat(playerId);
};

Game.prototype.newRound = function()
{
    var deck = Deck.makeNew();

    this.round = new Round(deck);

    this.round.start(this.seats.activePlayers());

    return this.round.hands;
};

Game.prototype.hasPlayers = function()
{
    return this.seats.activePlayers().length != 0;
};

var View = {};

View.getPlayerName = function(game, playerId)
{
    if (!playerId) {
        return "";
    }
    return game.events.reduce((value, e) => {
       if (e instanceof ev.PlayerNamed) {
           if (e.playerId === playerId) {
               return e.name;
           }
       }
       return value;
    }, "");
};

var GameRepo = {
    games: []
};

GameRepo.store = function(game)
{
    GameRepo.games[game.id] = game;
};

GameRepo.fetchOrCreate = function(gameId)
{
    var game = GameRepo.games[gameId];
    if (!game) {
        game = new Game(gameId);
        GameRepo.store(game);
    }
    return game;
};

GameRepo.remove = function (game)
{
    console.log("Removing game + " +game.id );
    delete GameRepo.games[game.id];
};


/*******************************
 * Scoket.io controller adapter
 *******************************/
var SocketsToPlayersMap =
{
    map: {},

    associate: function(socketId, playerId)
    {
        SocketsToPlayersMap.map[socketId] = playerId;
    },

    deassociate: function(socketId)
    {
        delete SocketsToPlayersMap.map[socketId];
    },

    getPlayerIdForSocket: function(socketId)
    {
        return SocketsToPlayersMap.map[socketId];
    },

    getSocketIdForPlayer: function(playerId)
    {
        for (var socketId in SocketsToPlayersMap.map) {
            if (SocketsToPlayersMap.map[socketId] === playerId) {
                return socketId;
            }
        }
        return undefined;
    }
};

var PlayerToGameMap = {

    map: {},

    associate: function(playerId, gameId)
    {
        PlayerToGameMap.map[playerId] = gameId;
    },

    deassociate: function(playerId)
    {
        delete PlayerToGameMap.map[playerId];
    },

    getGameIdForPlayer: function(playerId)
    {
        return PlayerToGameMap.map[playerId];
    },
};


/*******************************
 * Controller
 *******************************/

var Controller = {
    round: null,
};

Controller.dealCards = function (req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var hands = game.newRound();
    hands.forEach(hand => {
        var socketId = SocketsToPlayersMap.getSocketIdForPlayer(hand.playerId);
        io.sockets.to(socketId).emit('roundStarted', hand);
    });

    res.send('');
};

Controller.dealFlop = function (req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    io.emit('flop', game.round.dealFlop());
    res.send('');
};

Controller.dealTurn = function (req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    io.emit('turn', game.round.dealTurn());
    res.send('');
};

Controller.dealRiver = function (req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    io.emit('river', game.round.dealRiver());
    res.send('');
};

Controller.finish = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var winningHand = game.round.chooseWinningHand();
    io.emit('winningHand', winningHand);
    res.send('');
};

Controller.addPlayer = function(addPlayer)
{
    var game = GameRepo.fetchOrCreate(addPlayer.gameId);

    var socketId = this.id;
    var playerId = addPlayer.playerId;
    var playerName = addPlayer.playerName;

    console.log('player "' + playerName + '" (' + playerId + ') connected');

    var existingSocketId = SocketsToPlayersMap.getSocketIdForPlayer(playerId);

    if (existingSocketId) {
        io.sockets.to(socketId).emit('existingSession');
        return;
    }

    SocketsToPlayersMap.associate(socketId, playerId);
    PlayerToGameMap.associate(playerId, addPlayer.gameId);

    game.addPlayer(playerId, playerName);

    io.emit('seatFilled', game.seats.makeSeatsViewModel());

    if (!game.round) {
        return;
    }

    var playerHand = game.round.getPlayerHand(playerId);

    Controller.broadcastInProgressRound(socketId, playerHand, game.round.communityCards);
};

Controller.broadcastInProgressRound = function(socketId, playerHand, communityCards)
{
    if (playerHand) {
        io.sockets.to(socketId).emit('roundStarted', playerHand);
    }

    var cards = communityCards;
    if (cards.length > 2) {
        io.sockets.to(socketId).emit('flop', [cards[0], cards[1], cards[2]]);
    }
    if (cards.length > 3) {
        io.sockets.to(socketId).emit('turn', cards[3]);
    }
    if (cards.length > 4) {
        io.sockets.to(socketId).emit('river', cards[4]);
    }
};

Controller.removePlayer = function()
{
    var socketId = this.id;
    var playerId = SocketsToPlayersMap.getPlayerIdForSocket(socketId);
    if (!playerId) {
        return;
    }

    var gameId = PlayerToGameMap.getGameIdForPlayer(playerId);
    var game = GameRepo.fetchOrCreate(gameId);

    console.log('playerId ' + playerId + ' disconnected');

    var seat = game.seats.getSeat(playerId);
    game.seats.freeUpSeat(seat);

    SocketsToPlayersMap.deassociate(socketId);
    PlayerToGameMap.deassociate(playerId);

    if (!game.hasPlayers()) {
        GameRepo.remove(game);
        return;
    }

    io.emit('seatEmptied', {
        seats: game.seats.makeSeatsViewModel(),
        emptiedSeat: seat,
    });

    if (!game.round) {
        return;
    }

    game.round.removePlayer(playerId);

    var activeHands = game.round.activeHands();
    if (activeHands.length === 1) {
        io.emit('winnerByDefault', activeHands[0].playerId);
    }
};

Controller.foldHand = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var playerId = req.params.playerId;

    if (!game.round) {
        return;
    }

    game.round.foldHand(playerId);

    io.emit('playerFolded', playerId);

    var activeHands = game.round.activeHands();
    if (activeHands.length === 1) {
        io.emit('winnerByDefault', activeHands[0].playerId);
    }

    res.send('');
};


/************************************
 * Boot Incoming Message Handlers
 ************************************/
io.on('connection', function(socket)
{
    socket.on('newPlayer', Controller.addPlayer);
    socket.on('disconnect', Controller.removePlayer);
});


/*******************************
 * Boot HTTP Routes
 *******************************/

// Serve public files
app.use(express.static('public'));

app.post('/api/game/:gameId/deal', Controller.dealCards);

app.post('/api/game/:gameId/flop', Controller.dealFlop);

app.post('/api/game/:gameId/turn', Controller.dealTurn);

app.post('/api/game/:gameId/river', Controller.dealRiver);

app.post('/api/game/:gameId/finish', Controller.finish);

app.post('/api/game/:gameId/fold/:playerId', Controller.foldHand);

/*******************************
 * Launch the Webserver
 *******************************/
var port = 3000;
http.listen(port, () => console.log("Texas holdem server running at http://localhost:" + port));