
var Server = require('socket.io');
var GameRepo = require('./domain/game-repository');
var SeatsProjection = require('./application/seats-projection');
var RoundProjection = require('./application/round-projection');
var ChipsProjection = require('./application/chips-projection');
var PlayersProjection = require('./application/players-projection');
var notifications = require('./application/notifications');

var SEAT_COUNT = 8;

/**
 * @type {{io: Server}}
 */
var Controller = {
    io: null,
    notifier: null
};

Controller.join = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = req.body.playerId;
    var playerName = req.body.playerName;

    var existingSocketId = SocketsToPlayersMap.getSocketIdForPlayer(playerId);

    if (existingSocketId && existingSocketId !== socketId) {
        Controller.notifier.broadcastToPlayer(playerId, new notifications.ExistingSession());
        return;
    }

    SocketsToPlayersMap.associate(socketId, playerId);
    SocketsToGameMap.associate(socketId, game.id);

    game.addPlayer(playerId, playerName);

    var gameState = Controller.generateGameStateViewModel(game, playerId);

    res.json(gameState);
};

Controller.generateGameStateViewModel = function(game, playerId)
{
    var roundProjection = new RoundProjection(game);

    return {
        playerList: Controller.generatePlayerListNotification(game),
        round: Controller.generateRoundStartedNotification(game, playerId),
        cards: roundProjection.getCommunityCards(),
        pot: roundProjection.getPot()
    };
};

Controller.generatePlayerListNotification = function(game)
{
    const seatsProjection = new SeatsProjection(game);
    const chipsProjection = new ChipsProjection(game);
    const playersProjection = new PlayersProjection(game);

    let players = [];
    for (var seat = 0; seat < SEAT_COUNT; seat++) {
        let playerId = seatsProjection.getPlayerInSeat(seat);
        let chips = chipsProjection.getPlayerChips(playerId);
        let name = playersProjection.getPlayerName(playerId);
        players.push( new notifications.Player(playerId, name, chips, seat));
    }

    return new notifications.PlayerList(players);
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

    var players = seatsProjection.getPlayers();

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

    let playersListNotification = Controller.generatePlayerListNotification(game);
    Controller.notifier.broadcast(game.id, playersListNotification);

    game.startNewRound();

    var roundStarted = seatsProjection.getRoundStarted();

    var players = seatsProjection.getPlayers();

    players.forEach(playerId => {
        let roundStartedNotification = Controller.generateRoundStartedNotification(game, playerId);
        Controller.sendToPlayerInGame(playerId, roundStartedNotification);
    });

    broadcastBet(game, roundStarted.smallBlind);
    broadcastBet(game, roundStarted.bigBlind);

    Controller.announceNextPlayersTurn(game);

    res.send('');
};

Controller.generateRoundStartedNotification = function(game, playerId)
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

    return new notifications.RoundStarted(hand, roundStarted.dealer, activePlayers, bankruptedPlayers);
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

    let cards = roundProjection.getCommunityCards().slice(0, 3);
    Controller.notifier.broadcast(game.id, new notifications.FlopDealt(cards));

    var amount = roundProjection.getPot();
    Controller.notifier.broadcast(game.id, new notifications.PotTotal(amount));

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

    var card = roundProjection.getCommunityCards().slice(-1).pop();
    var amount = roundProjection.getPot();

    Controller.notifier.broadcast(game.id, new notifications.TurnDealt(card));
    Controller.notifier.broadcast(game.id, new notifications.PotTotal(amount));
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

    var card = roundProjection.getCommunityCards().slice(-1).pop();

    Controller.notifier.broadcast(game.id, new notifications.RiverDealt(card));

    var amount = roundProjection.getPot();
    Controller.notifier.broadcast(game.id, new notifications.PotTotal(amount));

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
    var playerChips = chipsProjection.getPlayerChips(winningPlayerId);

    Controller.notifier.broadcast(game.id, new notifications.WinningHand(winningHand, playerChips));

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

    let playersListNotification = Controller.generatePlayerListNotification(game);
    Controller.notifier.broadcast(game.id, playersListNotification);

    res.send('');
};

Controller.foldHand = function(req, res)
{
    var game = GameRepo.fetchOrCreate(req.params.gameId);

    var socketId = req.header('Authorization').replace("Bearer ", "");
    var playerId = SocketsToPlayersMap.getPlayerIdForSocket(socketId);

    game.foldHand(playerId);

    Controller.notifier.broadcast(game.id, new notifications.PlayerFolded(playerId));

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

    let playerChips = chipsProjection.getPlayerChips(winningHand.playerId);
    Controller.notifier.broadcast(game.id, new notifications.WinnerByDefault(winningHand, playerChips));
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

    amountToPlay = Math.min(playerChips, amountToPlay);

    var playersTurn = new notifications.PlayersTurn(nextPlayerToAct, amountToPlay);
    Controller.notifier.broadcast(game.id, playersTurn);
};

function broadcastBet(game, playerId)
{
    var chipsProjection = new ChipsProjection(game);
    var roundProjection = new RoundProjection(game);

    var playerChips = chipsProjection.getPlayerChips(playerId);
    var amountBetInBettingRound = roundProjection.getPlayerBet(playerId);

    let notification = new notifications.BetMade(playerId, amountBetInBettingRound, playerChips);
    Controller.notifier.broadcast(game.id, notification);
}

Controller.sendToPlayerInGame = function(playerId, notification)
{
    var socketId = SocketsToPlayersMap.getSocketIdForPlayer(playerId);
    Controller.notifier.broadcastToPlayer(socketId, notification);
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