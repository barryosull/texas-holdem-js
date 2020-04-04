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

Deck.prototype.dealHands = function(playerIds)
{
    var hands = {};
    playerIds.forEach(playerId => {
        hands[playerId] = this.dealHand();
    });
    return hands;
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

var Players = {
    players: {}
};

Players.length = function()
{
    var size = 0, key;
    for (key in this.players) {
        if (this.players.hasOwnProperty(key)) size++;
    }
    return size;
};

Players.addPlayer = function(socketId, playerId)
{
    this.players[socketId] = playerId;
    io.emit('players', this.players);
};

Players.removePlayer = function(socketId)
{
    var playerId = this.players[socketId];
    delete this.players[socketId];
    io.emit('playerRemoved', playerId);
};

Players.playerIds = function()
{
    var ids = [], key;
    for (key in this.players) {
        ids.push(this.players[key]);
    }
    return ids;
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
    var hands = deck.dealHands(Players.playerIds());
    for (var playerId in hands) {
        Players.sendHand(playerId, hands[playerId]);
    }
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

io.on('connection', function(socket){

    socket.on('playerId', function(playerId){
        Players.addPlayer(socket.id, playerId);

        console.log('user ' + socket.id + ' connected');
        console.log('playerId ' + playerId);
        console.log('players', Players.players);
    });

    socket.on('disconnect', function(){
        Players.removePlayer(socket.id);

        console.log('user ' + socket.id + ' disconnected');
    });
});


var port = 3000;

http.listen(port, () => console.log("Texas holdem server running at http://localhost:${port}"));