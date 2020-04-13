
var Server = require('socket.io');
var GameRepo = require('./domain/game-repository');
var SeatsProjection = require('./application/seats-projection');
var RoundProjection = require('./application/round-projection');

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

    var seatsProjection = new SeatsProjection(game);

    Controller.sendToEveryoneInGame(game.id, 'seatFilled', seatsProjection.makeSeatsViewModel());

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

    game.removePlayer(playerId);

    SocketsToPlayersMap.deassociate(socketId);
    SocketsToGameMap.deassociate(socketId);

    var seatsProjection = new SeatsProjection(game);

    if (!seatsProjection.hasPlayers()) {
        GameRepo.remove(game);
        return;
    }

    Controller.sendToEveryoneInGame(game.id, 'seatEmptied', {
        seats: seatsProjection.makeSeatsViewModel(),
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

    var seatsProjection = new SeatsProjection(game);
    var roundProjection = new RoundProjection(game);

    Controller.sendToEveryoneInGame(game.id, 'seatFilled', seatsProjection.makeSeatsViewModel());

    game.startNewRound();

    var players = seatsProjection.getPlayers();
    var roundStarted = seatsProjection.getRoundStarted();

    var playersToHands = roundProjection.getHands().reduce((map, hand) => {
        map[hand.playerId] = hand;
        return map;
    }, {});

    var activePlayers = Object.keys(playersToHands);
    var bankruptedPlayers = roundProjection.bankruptedInLastRound();

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

    var seatsProjection = new SeatsProjection(game);

    return seatsProjection.isAdmin(playerId);
};

Controller.dealFlop = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!Controller.isGameAdmin(game, req)) {
        res.send('');
        return;
    }

    game.dealFlop();

    var roundProjection = new RoundProjection(game);

    var flop = roundProjection.getCommunityCards().slice(0, 3);

    Controller.sendToEveryoneInGame(game.id, 'flop', flop);
    Controller.sendToEveryoneInGame(game.id, 'pot', roundProjection.getPot());
    res.send('');
};

Controller.dealTurn = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!Controller.isGameAdmin(game, req)) {
        res.send('');
        return;
    }

    game.dealTurn();

    var roundProjection = new RoundProjection(game);

    var turn = roundProjection.getCommunityCards().slice(-1).pop();

    Controller.sendToEveryoneInGame(game.id, 'turn', turn);
    Controller.sendToEveryoneInGame(game.id, 'pot', roundProjection.getPot());

    res.send('');
};

Controller.dealRiver = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!Controller.isGameAdmin(game, req)) {
        res.send('');
        return;
    }

    game.dealRiver();

    var roundProjection = new RoundProjection(game);

    var river = roundProjection.getCommunityCards().slice(-1).pop();

    Controller.sendToEveryoneInGame(game.id, 'river', river);
    Controller.sendToEveryoneInGame(game.id, 'pot', roundProjection.getPot());
    res.send('');
};

Controller.finish = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!Controller.isGameAdmin(game, req)) {
        res.send('');
        return;
    }

    game.finish();

    var seatsProjection = new SeatsProjection(game);
    var roundProjection = new RoundProjection(game);

    var winningPlayerId = roundProjection.getWinner();
    var winningHand = roundProjection.getPlayerHand(winningPlayerId);
    winningHand.playerChips = seatsProjection.getPlayerChips(winningPlayerId);
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
    var roundProjection = new RoundProjection(game);

    var activeHands = roundProjection.activeHands();
    if (activeHands.length !== 1) {
        return;
    }

    var seatsProjection = new SeatsProjection(game);

    var winningHand = activeHands[0];
    winningHand.playerChips = seatsProjection.getPlayerChips(winningHand.playerId);
    Controller.sendToEveryoneInGame(game.id, 'winnerByDefault', winningHand);

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

    var seatsProjection = new SeatsProjection(game);
    var roundProjection = new RoundProjection(game);

    var playerChips = seatsProjection.getPlayerChips(playerId);
    var amountBetInBettingRound = roundProjection.getPlayerBet(playerId);

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