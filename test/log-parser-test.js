
const assert = require('assert');
const events = require('../src/domain/events');
const LogParser = require('../src/application/log-parser');

describe('LogParser', () => {

    it ('parses a log file', () => {
        let gameId = '586993d2-1693-485d-b29a-0a3d6d0c6411';

        let parser = new LogParser();
        let eventStream = parser.loadStream(gameId);

        assert.equal(eventStream.events.length, 36);

        let firstEvent = eventStream.events[0];
        let lastEvent = eventStream.events[35];
        assert.equal(firstEvent instanceof events.PlayerNamed, true);
        assert.equal(lastEvent instanceof events.HandFolded, true);
    });
});

