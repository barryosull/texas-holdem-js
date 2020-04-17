
var Server = require('socket.io');
var GameRepo = require('./domain/game-repository');
var SeatsProjection = require('./application/seats-projection');
var RoundProjection = require('./application/round-projection');
var ChipsProjection = require('./application/chips-projection');
var PlayersProjection = require('./application/players-projection');

var SEAT_COUNT = 8;

/**
 * @type {{io: Server}}
 */
var Controller = {
    io: null
};

Controller.join = function(req, res)
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

    var gameState = Controller.makeGameStateViewModel(game, playerId);

    res.json(gameState);
};

Controller.makeGameStateViewModel = function(game, playerId)
{
    var roundProjection = new RoundProjection(game);

    return {
        players: Controller.makePlayersViewModel(game),
        round: Controller.makeRoundStartedViewModel(game, playerId),
        cards: roundProjection.getCommunityCards(),
        pot: roundProjection.getPot()
    };
};

Controller.makePlayersViewModel = function(game)
{
    var seatsProjection = new SeatsProjection(game);
    var chipsProjection = new ChipsProjection(game);
    var playersProjection = new PlayersProjection(game);

    var viewModel = [];
    for (var seat = 0; seat < SEAT_COUNT; seat++) {
        var playerId = seatsProjection.getPlayerInSeat(seat);
        var chips = chipsProjection.getPlayerChips(playerId);
        viewModel.push({
            playerId: playerId,
            playerName: playersProjection.getPlayerName(playerId),
            chips: chips,
            seat: seat
        });
    }

    return viewModel;
};


Controller.playerDisconnected = function()
{
    var socketId = this.id;

    var gameId = SocketsToGameMap.getGame(socketId);

    SocketsToPlayersMap.deassociate(socketId);
    SocketsToGameMap.deassociate(socketId);

    if (SocketsToGameMap.isGameEmpty(gameId)) {
        GameRepo.remove(gameId);
    }
};

Controller.removeDisconnectedPlayers = function(game)
{
    var seatsProjection = new SeatsProjection(game);

    var players = seatsProjection.getActivePlayers();

    var disconnectedPlayers = players.filter(playerId => {
        return !SocketsToPlayersMap.getSocketIdForPlayer(playerId);
    });

    disconnectedPlayers.forEach(playerId => {
        game.removePlayer(playerId);
    });
};

Controller.dealCards = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!Controller.isGameAdmin(game, req)) {
        res.send('');
        return;
    }

    Controller.removeDisconnectedPlayers(game);

    var seatsProjection = new SeatsProjection(game);

    Controller.sendToEveryoneInGame(game.id, 'players', Controller.makePlayersViewModel(game));

    game.startNewRound();

    var roundStarted = seatsProjection.getRoundStarted();

    var activePlayers = seatsProjection.getActivePlayers();

    activePlayers.forEach(playerId => {
        Controller.sendToPlayerInGame(playerId, 'roundStarted', Controller.makeRoundStartedViewModel(game, playerId));
    });

    broadcastBet(game, roundStarted.smallBlind);
    broadcastBet(game, roundStarted.bigBlind);

    Controller.announceNextPlayersTurn(game);

    res.send('');
};

Controller.makeRoundStartedViewModel = function(game, playerId)
{
    var seatsProjection = new SeatsProjection(game);
    var roundProjection = new RoundProjection(game);

    var roundStarted = seatsProjection.getRoundStarted();

    if (!roundStarted) {
        return null;
    }

    var activePlayers = seatsProjection.getActivePlayers();
    var bankruptedPlayers = roundProjection.bankruptedInLastRound();

    var hand = roundProjection.getPlayerHand(playerId);

    return {
        hand: hand,
        dealer: roundStarted.dealer,
        activePlayers: activePlayers,
        bankruptedPlayers: bankruptedPlayers
    }
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
    Controller.announceNextPlayersTurn(game);
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
    Controller.announceNextPlayersTurn(game);

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
    Controller.announceNextPlayersTurn(game);
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

    var roundProjection = new RoundProjection(game);
    var chipsProjection = new ChipsProjection(game);

    var winningPlayerId = roundProjection.getWinner();
    var winningHand = roundProjection.getPlayerHand(winningPlayerId);
    winningHand.playerChips = chipsProjection.getPlayerChips(winningPlayerId);
    Controller.sendToEveryoneInGame(game.id, 'winningHand', winningHand);

    res.send('');
};

Controller.givePlayerChips = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    if (!Controller.isGameAdmin(game, req)) {
        res.send('Nice try bucko');
        return;
    }
    var playerId = req.body.playerId;
    var amount = parseInt(req.body.amount);

    if (!playerId) {
        return;
    }

    game.givePlayerChips(playerId, amount);

    Controller.sendToEveryoneInGame(game.id, 'players', Controller.makePlayersViewModel(game));

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

    var winningHand = roundProjection.getWinner();
    if (!winningHand) {
        Controller.announceNextPlayersTurn(game);
        return;
    }

    var chipsProjection = new ChipsProjection(game);

    winningHand.playerChips = chipsProjection.getPlayerChips(winningHand.playerId);
    Controller.sendToEveryoneInGame(game.id, 'winnerByDefault', winningHand);
}

Controller.placeBet = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = SocketsToPlayersMap.getPlayerIdForSocket(socketId);
    var amount = parseInt(req.body.amount);

    game.placeBet(playerId, amount);

    broadcastBet(game, playerId);

    Controller.announceNextPlayersTurn(game);

    res.send('');
};

Controller.announceNextPlayersTurn = function(game)
{
    var roundProjection = new RoundProjection(game);
    var chipsProjection = new ChipsProjection(game);

    var nextPlayerToAct = roundProjection.getNextPlayerToAct();

    var amountToPlay = roundProjection.getAmountToPlay(nextPlayerToAct);

    var playerChips = chipsProjection.getPlayerChips(nextPlayerToAct);

    var playersTurn = {
        playerId: nextPlayerToAct,
        amountToPlay: Math.min(playerChips, amountToPlay)
    };
    Controller.sendToEveryoneInGame(game.id, 'playersTurn', playersTurn);
};

function broadcastBet(game, playerId)
{
    var chipsProjection = new ChipsProjection(game);
    var roundProjection = new RoundProjection(game);

    var playerChips = chipsProjection.getPlayerChips(playerId);
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
    },
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

    getGame: function(socketId)
    {
        return SocketsToGameMap.map[socketId];
    },

    isGameEmpty: function(gameId)
    {
        return Object.values(SocketsToGameMap.map).indexOf(gameId) === -1;
    }
};


module.exports = Controller;