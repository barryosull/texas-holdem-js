//*************************************
//  Test to diagnose why a particular game failed
//*************************************

const LogParser = require('../src/application/log-parser');
const Game = require('../src/domain/game');
const GameRepo = require('../src/domain/game-repository');
const UseCases = require('../src/application/use-cases');
const SocketMapper = require('../src/controllers/socket-mapper');
const RoundQueryable = require('../src/application/round-queryable');
const assert = require('assert');

describe('BrokenGame', () => {

    it ('figures out why the game did nothing', () => {
        let gameId = '586993d2-1693-485d-b29a-0a3d6d0c6411';

        let parser = new LogParser();

        let eventStream = parser.loadStream(gameId);
        eventStream.events.pop();
        let game = new Game(gameId, eventStream);
        GameRepo.store(game);

        let fakeNotifier = {
            broadcast : function() {
                //console.log(arguments);
            },
            broadcastToPlayer : function() {
                //console.log(arguments);
            },
        };

        let useCases = new UseCases(fakeNotifier, SocketMapper);

        useCases.foldHand(gameId, 'e0b5693c-1cf7-4ac6-9804-b68b4321ceeb');

        let nextPlayerToAct = (new RoundQueryable(eventStream)).getNextPlayerToAct();
        assert.equal(nextPlayerToAct, null, "All players have acted, no further action needed.");
    });
});

