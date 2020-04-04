var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);


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

var Seats = {
    seats: [
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
    ]
};

Seats.takeSeat = function(playerId)
{
    for (var index in Seats.seats) {
        if (Seats.seats[index] === playerId) {
            return index;
        }
        if (Seats.seats[index] === false) {
            Seats.seats[index] = playerId;
            return index;
        }
    }
    console.log("All seats taken, no room for player " + playerId);
    return false;
};

Seats.getSeat = function(playerId)
{
    for (var index in Seats.seats) {
        if (Seats.seats[index] === playerId) {
            return parseInt(index);
        }
    }
    return false;
};

Seats.freeUpSeat = function(seat)
{
    if (seat === false) {
        return;
    }
    Seats.seats[seat] = false;
};

Seats.activePlayers = function()
{
    return Seats.seats.filter(seatOccupant => {
        return seatOccupant !== false
    });
};

Seats.makeSeatsViewModel = function()
{
    var viewModel = [];
    Seats.seats.forEach((playerId, seat) => {
        viewModel.push({
            playerId: playerId,
            seat: seat
        });
    });
    return viewModel;
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


/*******************************
 * Controller
 *******************************/

var Controller = {
    deck: null,
};

Controller.dealCards = function (req, res) {
    Controller.deck = Deck.makeNew();
    Seats.activePlayers().forEach(playerId => {
        var hand = Controller.deck.dealHand();
        var socketId = SocketsToPlayersMap.getSocketIdForPlayer(playerId);
        io.sockets.to(socketId).emit('hand', hand);
    });
    res.send('');
};

Controller.dealFlop = function (req, res) {
    io.emit('flop', Controller.deck.dealFlop());
    res.send('');
};

Controller.dealTurn = function (req, res) {
    io.emit('turn', Controller.deck.dealTurn());
    res.send('');
};

Controller.dealRiver = function (req, res) {
    io.emit('turn', Controller.deck.dealRiver());
    res.send('');
};

Controller.addPlayer = function(playerId)
{
    var socketId = this.id;

    console.log('playerId ' + playerId + ' connected');

    var existingSocketId = SocketsToPlayersMap.getSocketIdForPlayer(playerId);

    if (existingSocketId) {
        io.sockets.to(socketId).emit('existingSession');
        return;
    }

    SocketsToPlayersMap.associate(socketId, playerId);

    Seats.takeSeat(playerId);

    io.emit('seatFilled', Seats.makeSeatsViewModel());
};

Controller.removePlayer = function()
{
    var socketId = this.id;
    var playerId = SocketsToPlayersMap.getPlayerIdForSocket(socketId);

    if (!playerId) {
        return;
    }

    console.log('playerId ' + playerId + ' disconnected');

    var seat = Seats.getSeat(playerId);
    Seats.freeUpSeat(seat);

    SocketsToPlayersMap.deassociate(socketId);

    io.emit('seatEmptied', seat);
};


/************************************
 * Boot Incoming Message Handlers
 ************************************/
io.on('connection', function(socket)
{
    socket.on('playerId', Controller.addPlayer);
    socket.on('disconnect', Controller.removePlayer);
});


/*******************************
 * Boot HTTP Routes
 *******************************/

// Serve public files
app.use(express.static('public'));

app.post('/api/deal', Controller.dealCards);

app.post('/api/flop', Controller.dealFlop);

app.post('/api/turn', Controller.dealTurn);

app.post('/api/river', Controller.dealRiver);


/*******************************
 * Launch the Webserver
 *******************************/
var port = 3000;
http.listen(port, () => console.log("Texas holdem server running at http://localhost:" + port));