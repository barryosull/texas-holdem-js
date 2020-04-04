var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

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

var Players = {

};

Players.addPlayer = function(playerId)
{
    Seats.takeSeat(playerId);
    io.emit('seatFilled', makeSeatsViewModel());
};

function makeSeatsViewModel()
{
    var viewModel = [];
    Seats.seats.forEach((playerId, seat) => {
        viewModel.push({
            playerId: playerId,
            seat: seat
        });
    });
    return viewModel;
}

Players.removePlayer = function(playerId)
{
    var seat = Seats.getSeat(playerId);
    Seats.freeUpSeat(seat);
    io.emit('seatEmptied', seat);
};

Players.sendHand = function(playerId, hand)
{
    var socketId = Object.keys(this.players).find(key => this.players[key] === playerId);
    io.sockets.to(socketId).emit('hand', hand);
};

app.use(express.static('public'));

var deck;

app.post('/api/deal', function (req, res) {
    deck = Deck.makeNew();
    Seats.activePlayers().forEach(playerId => {
        var hand = deck.dealHand();
        var socketId = Controller.getSocketIdForPlayer(playerId);
        io.sockets.to(socketId).emit('hand', hand);
    });
    res.send('');
});

app.post('/api/flop', function (req, res) {
    io.emit('flop', deck.dealFlop());
    res.send('');
});

app.post('/api/turn', function (req, res) {
    io.emit('turn', deck.dealTurn());
    res.send('');
});

app.post('/api/river', function (req, res) {
    io.emit('river', deck.dealRiver());
    res.send('');
});

var Controller =
{
    socketsToPlayers: {},

    associateSocketWithPlayer: function(socketId, playerId)
    {
        Controller.socketsToPlayers[socketId] = playerId;
    },

    deassociateSocketWithPlayer: function(socketId)
    {
        delete Controller.socketsToPlayers[socketId];
    },

    getPlayerIdForSocket: function(socketId)
    {
        return Controller.socketsToPlayers[socketId];
    },

    getSocketIdForPlayer: function(playerId)
    {
        for (var socketId in Controller.socketsToPlayers) {
            if (Controller.socketsToPlayers[socketId] === playerId) {
                return socketId;
            }
        }
        return undefined;
    }
};

Controller.addPlayer = function(playerId)
{
    console.log('playerId ' + playerId + ' connected');

    var socketId = this.id;
    Controller.associateSocketWithPlayer(socketId, playerId);
    Players.addPlayer(playerId);
};

Controller.removePlayer = function()
{
    var socketId = this.id;
    var playerId = Controller.getPlayerIdForSocket(socketId);

    console.log('playerId ' + playerId + ' disconnected');

    Players.removePlayer(playerId);
    Controller.deassociateSocketWithPlayer(socketId);
};

io.on('connection', function(socket)
{
    socket.on('playerId', Controller.addPlayer);
    socket.on('disconnect', Controller.removePlayer);
});


var port = 3000;

http.listen(port, () => console.log("Texas holdem server running at http://localhost:${port}"));