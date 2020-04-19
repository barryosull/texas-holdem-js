
var express = require('express');
var Server = require('socket.io');
var Controller = require('./controller');
var Notifier = require('./application/notifier');

/**
 * @param app
 * @param io {Server}
 */
function boot(app, io)
{
    Controller.io = io;
    Controller.notifier = new Notifier(io);

    // Serve public files
    app.use(express.static('public'));

    app.post('/api/game/:gameId/join', Controller.join);

    app.post('/api/game/:gameId/deal', Controller.dealCards);

    app.post('/api/game/:gameId/flop', Controller.dealFlop);

    app.post('/api/game/:gameId/turn', Controller.dealTurn);

    app.post('/api/game/:gameId/river', Controller.dealRiver);

    app.post('/api/game/:gameId/finish', Controller.finish);

    app.post('/api/game/:gameId/give-chips-to-player', Controller.givePlayerChips);

    app.post('/api/game/:gameId/fold/:playerId', Controller.foldHand);

    app.post('/api/game/:gameId/bet/:playerId', Controller.placeBet);
}

module.exports = boot;

