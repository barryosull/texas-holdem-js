
var Server = require('socket.io');
var GameRepo = require('./domain/game-repository');

/**
 * @type {{io: Server}}
 */
var Controller = {
    io: null
};

Controller.addPlayer = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = req.body.playerId;
    var playerName = req.body.playerName;

    var existingSocketId = SocketsToPlayersMap.getSocketIdForPlayer(playerId);

    if (existingSocketId && existingSocketId !== socketId) {
        Controller.sendToPlayerInGame(playerId, 'existingSession');
        return;
    }

    SocketsToPlayersMap.associate(socketId, playerId);
    SocketsToGameMap.associate(socketId, game.id);

    game.addPlayer(playerId, playerName);

    Controller.sendToEveryoneInGame(game.id, 'seatFilled', game.seats.makeSeatsViewModel());

    res.send('');
};

Controller.removePlayer = function()
{
    var socketId = this.id;
    var playerId = SocketsToPlayersMap.getPlayerIdForSocket(socketId);
    if (!playerId) {
        return;
    }

    var gameId = SocketsToGameMap.getGameIdForSocket(socketId);
    var game = GameRepo.fetchOrCreate(gameId);

    var emptiedSeat = game.removePlayer(playerId);

    SocketsToPlayersMap.deassociate(socketId);
    SocketsToGameMap.deassociate(socketId);

    if (!game.hasPlayers()) {
        GameRepo.remove(game);
        return;
    }

    Controller.sendToEveryoneInGame(game.id, 'seatEmptied', {
        seats: game.seats.makeSeatsViewModel(),
        emptiedSeat: emptiedSeat,
    });

    checkForWinnerByDefault(game);
};

Controller.dealCards = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!Controller.isGameAdmin(game, req)) {
        res.send('');
        return;
    }

    Controller.sendToEveryoneInGame(game.id, 'seatFilled', game.seats.makeSeatsViewModel());

    game.startNewRound();

    var players = game.seats.getPlayers();
    var roundStarted = game.seats.getRoundStarted();

    var playersToHands = game.round.getHands().reduce((map, hand) => {
        map[hand.playerId] = hand;
        return map;
    }, {});

    var activePlayers = Object.keys(playersToHands);
    var bankruptedPlayers = game.round.bankruptedInLastRound();

    players.forEach(playerId => {
        var hand = playersToHands[playerId];
        Controller.sendToPlayerInGame(playerId, 'roundStarted', {
            hand: hand,
            dealer: roundStarted.dealer,
            activePlayers: activePlayers,
            bankruptedPlayers: bankruptedPlayers
        });
    });

    var smallBlind = 20;
    var bigBlind = 40;
    placeBet(game, roundStarted.smallBlind, smallBlind);
    placeBet(game, roundStarted.bigBlind, bigBlind);

    res.send('');
};

Controller.isGameAdmin = function(game, req)
{
    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = SocketsToPlayersMap.getPlayerIdForSocket(socketId);

    return game.seats.isAdmin(playerId);
};

Controller.dealFlop = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!Controller.isGameAdmin(game, req)) {
        res.send('');
        return;
    }

    game.closeRoundOfBetting();
    var event = game.dealFlop();

    Controller.sendToEveryoneInGame(game.id, 'flop', event.cards);
    Controller.sendToEveryoneInGame(game.id, 'pot', game.round.getPot());
    res.send('');
};

Controller.dealTurn = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!Controller.isGameAdmin(game, req)) {
        res.send('');
        return;
    }

    game.closeRoundOfBetting();
    var event = game.dealTurn();
    Controller.sendToEveryoneInGame(game.id, 'turn', event.card);
    Controller.sendToEveryoneInGame(game.id, 'pot', game.round.getPot());

    res.send('');
};

Controller.dealRiver = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!Controller.isGameAdmin(game, req)) {
        res.send('');
        return;
    }

    game.closeRoundOfBetting();
    var event = game.dealRiver();

    Controller.sendToEveryoneInGame(game.id, 'river', event.card);
    Controller.sendToEveryoneInGame(game.id, 'pot', game.round.getPot());
    res.send('');
};

Controller.finish = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!Controller.isGameAdmin(game, req)) {
        res.send('');
        return;
    }

    game.closeRoundOfBetting();
    var events = game.finish();

    var winningPlayerId = events[0].playerId;
    var winningHand = game.round.getPlayerHand(winningPlayerId);
    winningHand.playerChips = game.seats.getPlayerChips(winningPlayerId);
    Controller.sendToEveryoneInGame(game.id, 'winningHand', winningHand);

    res.send('');
};

Controller.foldHand = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = SocketsToPlayersMap.getPlayerIdForSocket(socketId);

    game.foldHand(playerId);

    Controller.sendToEveryoneInGame(game.id, 'playerFolded', playerId);

    checkForWinnerByDefault(game);

    res.send('');
};

function checkForWinnerByDefault(game)
{
    var activeHands = game.round.activeHands();
    if (activeHands.length === 1) {
        var winningHand = activeHands[0];
        winningHand.playerChips = game.seats.getPlayerChips(winningHand.playerId);
        Controller.sendToEveryoneInGame(game.id, 'winnerByDefault', winningHand);
    }
}

Controller.placeBet = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = SocketsToPlayersMap.getPlayerIdForSocket(socketId);
    var amount = parseInt(req.body.amount);

    placeBet(game, playerId, amount);

    res.send('');
};

function placeBet(game, playerId, amount)
{
    game.placeBet(playerId, amount);
    var playerChips = game.seats.getPlayerChips(playerId);
    var amountBetInBettingRound = game.round.getPlayerBet(playerId);

    Controller.sendToEveryoneInGame(game.id, 'betMade', {
        playerId: playerId,
        total: amountBetInBettingRound,
        remainingChips: playerChips
    });
}

Controller.sendToEveryoneInGame = function(gameId, type, message)
{
    Controller.io.to(gameId).emit(type, message);
};

Controller.sendToPlayerInGame = function(playerId, type, message)
{
    var socketId = SocketsToPlayersMap.getSocketIdForPlayer(playerId);
    Controller.io.sockets.to(socketId).emit(type, message);
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

var SocketsToGameMap = {

    map: {},

    associate: function(socketId, gameId)
    {
        SocketsToGameMap.map[socketId] = gameId;
    },

    deassociate: function(socketId)
    {
        delete SocketsToGameMap.map[socketId];
    },

    getGameIdForSocket: function(socketId)
    {
        return SocketsToGameMap.map[socketId];
    },
};


module.exports = Controller;