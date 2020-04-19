
function ExistingSession() {}

function RoundStarted(hand, dealer, activePlayers, bankruptedPlayers)
{
    this.hand = hand;
    this.dealer = dealer;
    this.activePlayers = activePlayers;
    this.bankruptedPlayers = bankruptedPlayers;
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

/**
 * @param players {Player[]}
 */
function PlayerList(players)
{
    this.players = players;
}

function Player(playerId, playerName, chips, seat)
{
    this.playerId = playerId;
    this.playerName = playerName;
    this.chips = chips;
    this.seat = seat;
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
    ExistingSession,
    RoundStarted,
    BetMade,
    FlopDealt,
    TurnDealt,
    RiverDealt,
    WinningHand,
    WinnerByDefault,
    PlayerFolded,
    PotTotal,
    PlayersTurn,
    PlayerList,
    Player
};