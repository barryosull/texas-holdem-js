
var Server = require('socket.io');
var GameRepo = require('./domain/game-repository');

/**
 * @type {{io: Server}}
 */
var Controller = {
    io: null
};

Controller.dealCards = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    game.startNewRound();

    var dealer = game.seats.getDealer();

    game.round.hands().forEach(hand => {
        var socketId = SocketsToPlayersMap.getSocketIdForPlayer(hand.playerId);
        Controller.io.sockets.to(socketId).emit('roundStarted', {
            hand: hand,
            dealer: dealer
        });
    });

    res.send('');
};

Controller.dealFlop = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    game.closeRoundOfBetting();
    var event = game.dealFlop();

    Controller.io.emit('flop', event.cards);
    Controller.io.emit('pot', game.round.getPot());
    res.send('');
};

Controller.dealTurn = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    game.closeRoundOfBetting();
    var event = game.dealTurn();
    Controller.io.emit('turn', event.card);
    Controller.io.emit('pot', game.round.getPot());

    res.send('');
};

Controller.dealRiver = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    game.closeRoundOfBetting();
    var event = game.dealRiver();

    Controller.io.emit('river', event.card);
    Controller.io.emit('pot', game.round.getPot());
    res.send('');
};

Controller.finish = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);
    game.closeRoundOfBetting();
    var event = game.announceWinner();
    var winningHand = game.round.getPlayerHand(event.playerId);
    Controller.io.emit('winningHand', winningHand);
    Controller.io.emit('pot', game.round.getPot());
    res.send('');
};

Controller.addPlayer = function(addPlayer)
{
    var game = GameRepo.fetchOrCreate(addPlayer.gameId);

    var socketId = this.id;
    var playerId = addPlayer.playerId;
    var playerName = addPlayer.playerName;

    var existingSocketId = SocketsToPlayersMap.getSocketIdForPlayer(playerId);

    if (existingSocketId) {
        Controller.io.sockets.to(socketId).emit('existingSession');
        return;
    }

    SocketsToPlayersMap.associate(socketId, playerId);
    PlayerToGameMap.associate(playerId, addPlayer.gameId);

    game.addPlayer(playerId, playerName);

    Controller.io.emit('seatFilled', game.seats.makeSeatsViewModel());
};

Controller.broadcastInProgressRound = function(socketId, playerHand, communityCards)
{
    if (playerHand) {
        Controller.io.sockets.to(socketId).emit('roundStarted', playerHand);
    }

    var cards = communityCards;
    if (cards.length > 2) {
        Controller.io.sockets.to(socketId).emit('flop', [cards[0], cards[1], cards[2]]);
    }
    if (cards.length > 3) {
        this.io.sockets.to(socketId).emit('turn', cards[3]);
    }
    if (cards.length > 4) {
        Controller.io.sockets.to(socketId).emit('river', cards[4]);
    }
};

Controller.removePlayer = function()
{
    var socketId = this.id;
    var playerId = SocketsToPlayersMap.getPlayerIdForSocket(socketId);
    if (!playerId) {
        return;
    }

    var gameId = PlayerToGameMap.getGameIdForPlayer(playerId);
    var game = GameRepo.fetchOrCreate(gameId);

    var emptiedSeat = game.removePlayer(playerId);

    SocketsToPlayersMap.deassociate(socketId);
    PlayerToGameMap.deassociate(playerId);

    if (!game.hasPlayers()) {
        GameRepo.remove(game);
        return;
    }

    Controller.io.emit('seatEmptied', {
        seats: game.seats.makeSeatsViewModel(),
        emptiedSeat: emptiedSeat,
    });

    var activeHands = game.round.activeHands();
    if (activeHands.length === 1) {
        Controller.io.emit('winnerByDefault', activeHands[0].playerId);
    }
};

Controller.foldHand = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var playerId = req.params.playerId;

    game.foldHand(playerId);

    Controller.io.emit('playerFolded', playerId);

    var activeHands = game.round.activeHands();
    if (activeHands.length === 1) {
        Controller.io.emit('winnerByDefault', activeHands[0].playerId);
    }

    res.send('');
};

Controller.makeBet = function(req, res)
{
    var playerId = req.params.playerId;
    var amount = parseInt(req.body.amount);

    var game = GameRepo.fetchOrCreate(req.params.gameId);
    game.makeBet(playerId, amount);
    var playerChips = game.seats.getPlayerChips(playerId);

    Controller.io.emit('betMade', {playerId: playerId, amount: amount, remainingChips: playerChips});

    res.send('');
};


var SocketsToPlayersMap =
{
    map: {},

    associate: function(socketId, playerId)
    {
        SocketsToPlayersMap.map[socketId] = playerId;
    },

    deassociate: function(socketId)
    {
        delete SocketsToPlayersMap.map[socketId];
    },

    getPlayerIdForSocket: function(socketId)
    {
        return SocketsToPlayersMap.map[socketId];
    },

    getSocketIdForPlayer: function(playerId)
    {
        for (var socketId in SocketsToPlayersMap.map) {
            if (SocketsToPlayersMap.map[socketId] === playerId) {
                return socketId;
            }
        }
        return undefined;
    }
};

var PlayerToGameMap = {

    map: {},

    associate: function(playerId, gameId)
    {
        PlayerToGameMap.map[playerId] = gameId;
    },

    deassociate: function(playerId)
    {
        delete PlayerToGameMap.map[playerId];
    },

    getGameIdForPlayer: function(playerId)
    {
        return PlayerToGameMap.map[playerId];
    },
};


module.exports = Controller;