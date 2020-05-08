
function SmallBlindSet(amount)
{
    this.amount = amount;
}

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

function SeatEmptied(seat, playerId)
{
    this.seat = seat;
    this.playerId = playerId;
}

function RoundStarted(deckSeed, dealer, smallBlind, bigBlind)
{
    this.deckSeed = deckSeed;
    this.dealer = dealer;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
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

function PotWon(playerId)
{
    this.playerId = playerId;
}

function PlayerGivenChips(playerId, amount)
{
    this.playerId = playerId;
    this.amount = amount;
}

function BetPlaced(playerId, amount)
{
    this.playerId = playerId;
    this.amount = amount;
}

function BettingRoundClosed()
{

}

module.exports = {
    SmallBlindSet,
    PlayerNamed,
    SeatTaken,
    SeatEmptied,
    RoundStarted,
    HandDealt,
    HandFolded,
    FlopDealt,
    TurnDealt,
    RiverDealt,
    PotWon,
    PlayerGivenChips,
    BetPlaced,
    BettingRoundClosed
};
