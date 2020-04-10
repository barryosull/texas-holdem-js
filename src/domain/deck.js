
var seedrandom = require('seedrandom');

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

/*******************************
 * Value Objects
 *******************************/

var Deck = function(cards)
{
    this.cards = cards;
};

Deck.makeNew = function(seed)
{
    var cards = [];

    suits.forEach(suit => {
        denominations.forEach(denomination => {
            cards.push(denomination + '_of_' + suit);
        });
    });

    var deck = new Deck(cards);
    return deck.shuffle(seed);
};

Deck.prototype.shuffle = function(seed)
{
    var array = this.cards;

    var rng = seedrandom(seed);

    var currentIndex = array.length;
    var temporaryValue, randomIndex;

    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(rng() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return new Deck(array);
};

Deck.prototype.getCards = function(number)
{
    return this.cards.slice(0, number);
};

Deck.prototype.burnCards = function(number)
{
    return new Deck(this.cards.slice(number));
};

module.exports = Deck;