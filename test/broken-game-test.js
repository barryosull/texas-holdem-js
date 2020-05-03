
const assert = require('assert');
const events = require('../src/domain/events');
const LogParser = require('../src/application/log-parser');
const Game = require('../src/domain/game');
const UseCases = require('../src/application/use-cases');
const SocketMapper = require('../src/controllers/socket-mapper');

describe('BrokenGame', () => {

    it ('figures out why the game did nothing', () => {
        let gameId = '586993d2-1693-485d-b29a-0a3d6d0c6411';

        let parser = new LogParser();
        let eventStream = parser.loadStream(gameId);
        eventStream.events.pop();

        let game = new Game(gameId, eventStream);

        let fakeNotifier = {
            broadcast : function() {},
            broadcastToPlayer : function() {},
        };

        let useCases = new UseCases(fakeNotifier, SocketMapper);

        useCases.foldHand(game, 'e0b5693c-1cf7-4ac6-9804-b68b4321ceeb');
    });
});

