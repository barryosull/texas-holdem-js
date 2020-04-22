
function ExistingSession() {}

/**
 * @param dealer {String}
 * @param players {Player[]}
 */
function RoundStarted(dealer, players)
{
    this.dealer = dealer;
    this.players = players;
}

function PlayerDealtHand(hand)
{
    this.hand = hand;
}

function Player(playerId, playerName, chips, seat)
{
    this.playerId = playerId;
    this.playerName = playerName;
    this.chips = chips;
    this.seat = seat;
}

function PlayerAdded(player, isAdmin)
{
    this.player = player;
    this.isAdmin = isAdmin;
}

function BetMade(playerId, total, remainingChips)
{
    this.playerId = playerId;
    this.total = total;
    this.remainingChips = remainingChips;
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

function PotTotal(amount)
{
    this.amount = amount;
}

function PlayersTurn(playerId, amountToPlay)
{
    this.playerId = playerId;
    this.amountToPlay = amountToPlay;
}

function WinningHand(hand, playerChips)
{
    this.hand = hand;
    this.playerChips = playerChips;
}

function PlayerFolded(playerId)
{
    this.playerId = playerId;
}

function WinnerByDefault(hand, playerChips)
{
    this.hand = hand;
    this.playerChips = playerChips;
}

module.exports = {
    PlayerAdded,
    ExistingSession,
    RoundStarted,
    PlayerDealtHand,
    BetMade,
    FlopDealt,
    TurnDealt,
    RiverDealt,
    WinningHand,
    WinnerByDefault,
    PlayerFolded,
    PotTotal,
    PlayersTurn,
    Player
};