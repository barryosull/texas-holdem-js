var express = require('express');
var app = express();

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
    function shuffle (array)
    {
        var currentIndex = array.length;
        var temporaryValue, randomIndex;

        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    shuffle(this.cards);
};


Deck.prototype.dealHands = function(players)
{
    var hands = [];
    for (var i = 0; i < players; i++) {
        hands[i] = this.dealHand();
    }
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

app.use(express.static('public'));

var deck;

app.post('/api/deal/:players', function (req, res) {
    var players = req.params.players;
    deck = Deck.makeNew();
    var hands = deck.dealHands(players);
    res.send(hands);
});

app.post('/api/flop', function (req, res) {
    res.send(deck.dealFlop());
});

app.post('/api/turn', function (req, res) {
    res.send(deck.dealTurn());
});

app.post('/api/river', function (req, res) {
    res.send(deck.dealRiver());
});

var port = 3000;

app.listen(port, () => console.log("Texas holdem server running at http://localhost:${port}"));