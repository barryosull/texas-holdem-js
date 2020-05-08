
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

function PlayerHandTitle(title)
{
    this.title = title;
}

function Player(playerId, playerName, chips, seat)
{
    this.playerId = playerId;
    this.playerName = playerName;
    this.chips = chips;
    this.seat = seat;
}

function PlayerAdded(player, players, isAdmin)
{
    this.player = player;
    this.players = players;
    this.isAdmin = isAdmin;
}

function PlayerGivenChips(playerId, chips)
{
    this.playerId = playerId;
    this.chips = chips;
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

function PotTotal(pots)
{
    this.pots = pots;
}

function PlayersTurn(playerId, amountToPlay, minBet)
{
    this.playerId = playerId;
    this.amountToPlay = amountToPlay;
    this.minBet = minBet;
}

function WinningHand(hand)
{
    this.hand = hand;
}

function PlayerFolded(playerId)
{
    this.playerId = playerId;
}

function WinnerByDefault(playerId)
{
    this.playerId = playerId;
}

module.exports = {
    PlayerAdded,
    PlayerGivenChips,
    ExistingSession,
    RoundStarted,
    PlayerDealtHand,
    PlayerHandTitle,
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