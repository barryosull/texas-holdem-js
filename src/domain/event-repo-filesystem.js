
const EventStream = require('./event-stream');
const EventRepo = require('./event-repo');
const fs = require('fs');
const events = require('./events');

/**
 * @extends {EventRepo}
 * @constructor
 */
function EventRepositoryFilesystem()
{
    this.eventStreamToLength = {};
}

/**
 * @param gameId {String}
 * @returns {EventStream}
 */
EventRepositoryFilesystem.prototype.loadStream = function(gameId)
{
    let logPath = getLogPath(gameId);
    let log = null;
    try {
        log = fs.readFileSync(logPath, 'utf8');
    } catch(e) {
        let stream = new EventStream(gameId);
        this.eventStreamToLength[gameId] = stream.events.length;
        return stream;
    }

    log = sanitizeInput(log);

    let storedEvents = JSON.parse(log);

    let events = storedEvents.map(storedEvent => {
        return makeEventFromStoredEvent(storedEvent);
    });
    let stream = new EventStream(gameId);
    stream.events = events;
    this.eventStreamToLength[gameId] = stream.events.length;

    return stream;
};

function sanitizeInput(log)
{
    let removedLastCharacter = log.slice(0, log.length-2);
    let suuroundWithBrackets = "[" + removedLastCharacter + "]";
    return suuroundWithBrackets;
}

function makeEventFromStoredEvent(storedEvent)
{
    let eventType = storedEvent.type;
    let event = new events[eventType];

    for (let key in storedEvent.event) {
        event[key] = storedEvent.event[key];
    }

    return event;
}

function getLogPath(gameId)
{
    return __dirname + '/../../logs/game-' + gameId + '.json';
}

EventRepositoryFilesystem.prototype.write = function(gameId, event)
{
    let logPath = getLogPath(gameId);

    let storedEvent = {
        type: event.constructor.name,
        event: event
    };

    fs.appendFileSync(logPath, JSON.stringify(storedEvent) + ",\n");
};

EventRepositoryFilesystem.prototype.store = function(eventStream)
{
    let oldStreamLength = this.eventStreamToLength[eventStream.gameId] || 0;
    let events = eventStream.events.slice(oldStreamLength, eventStream.events.length);
    events.forEach(event => this.write(eventStream.gameId, event));
};

EventRepositoryFilesystem.prototype.clear = function(gameId)
{
    let logPath = getLogPath(gameId);
    try {
        fs.unlinkSync(logPath);
    } catch (e) {
        return;
    }
};

module.exports = EventRepositoryFilesystem;