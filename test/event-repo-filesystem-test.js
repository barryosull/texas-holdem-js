
const assert = require('assert');
const events = require('../src/domain/events');
const EventRepositoryFilesystem = require('../src/domain/event-repo-filesystem');

describe('EventRepositoryFilesystem', () => {

    it ('writes to a games event log', () => {
        let gameId = '586993d2-1693-485d-b29a-0a3d6d0c6411';
        let playerId = '553e5f71-2dce-45ed-8639-13ad81804d7d';

        let eventRepo = new EventRepositoryFilesystem('/tmp');
        eventRepo.clear(gameId);
        let eventStream = eventRepo.loadStream(gameId);

        eventStream.push(new events.PlayerNamed(playerId, "Name"));
        eventStream.push(new events.PlayerNamed(playerId, "Name"));
        eventStream.push(new events.PlayerNamed(playerId, "Name"));

        eventRepo.store(eventStream);

        let eventStream2 = eventRepo.loadStream(gameId);

        assert.equal(eventStream2.events.length, 3);
        let event = eventStream2.events[0];
        assert.equal(event instanceof events.PlayerNamed, true);
    });
});

