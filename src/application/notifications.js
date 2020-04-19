
function BetMade(playerId, total, remainingChips)
{
    this.playerId = playerId;
    this.total = total;
    this.remainingChips = remainingChips;
}

function Turn(card)
{
    this.card = card;
}

function PotTotal(amount)
{
    this.amount = amount;
}

module.exports = {
    BetMade,
    Turn,
    PotTotal
};