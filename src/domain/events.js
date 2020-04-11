
function PlayerNamed(playerId, name)
{
    this.playerId = playerId;
    this.name = name;
}

function SeatTaken(seat, playerId)
{
    this.seat = seat;
    this.playerId = playerId;
}

function SeatEmptied(seat)
{
    this.seat = seat;
}

function RoundStarted(deckSeed, dealer)
{
    this.deckSeed = deckSeed;
    this.dealer = dealer;
}

function HandDealt(playerId, cards)
{
    this.playerId = playerId;
    this.cards = cards;
}

function HandFolded(playerId)
{
    this.playerId = playerId;
}

function FlopDealt(cards)
{
    this.cards = cards;
}

function TurnDealt(card)
{
    this.card = card;
}

function RiverDealt(card)
{
    this.card = card;
}

function HandWon(playerId)
{
    this.playerId = playerId;
}

function BetMade(playerId, amount)
{
    this.playerId = playerId;
    this.amount = amount;
}

module.exports = {
    PlayerNamed,
    SeatTaken,
    SeatEmptied,
    RoundStarted,
    HandDealt,
    HandFolded,
    FlopDealt,
    TurnDealt,
    RiverDealt,
    HandWon,
    BetMade
};
