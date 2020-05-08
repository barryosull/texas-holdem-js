
var express = require('express');
var Server = require('socket.io');
var HttpController = require('./controllers/http-controller');
var Notifier = require('./application/notifier');
var SocketMapper = require('./controllers/socket-mapper');

/**
 * @param app
 * @param io {Server}
 */
function boot(app, io)
{
    let controller = new HttpController(new Notifier(io), new SocketMapper());

    // Serve public files
    app.use(express.static('public'));

    app.post('/api/game/:gameId/join', controller.join.bind(controller));

    app.post('/api/game/:gameId/set-small-blind', controller.setSmallBlind.bind(controller));

    app.post('/api/game/:gameId/deal', controller.dealCards.bind(controller));

    app.post('/api/game/:gameId/flop', controller.dealFlop.bind(controller));

    app.post('/api/game/:gameId/turn', controller.dealTurn.bind(controller));

    app.post('/api/game/:gameId/river', controller.dealRiver.bind(controller));

    app.post('/api/game/:gameId/finish', controller.finish.bind(controller));

    app.post('/api/game/:gameId/give-chips-to-player', controller.givePlayerChips.bind(controller));

    app.post('/api/game/:gameId/fold/:playerId', controller.foldHand.bind(controller));

    app.post('/api/game/:gameId/bet/:playerId', controller.placeBet.bind(controller));
}

module.exports = boot;

