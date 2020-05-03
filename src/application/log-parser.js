
const EventStream = require('../domain/event-stream');
const events = require('../domain/events');
const fs = require('fs');

function LogParser()
{
}

/**
 * @param gameId {String}
 * @returns {EventStream}
 */
LogParser.prototype.loadStream = function(gameId)
{
    let logPath = __dirname + '/../../logs/game-' +  gameId + '.log';
    let log = null;
    try {
        log = fs.readFileSync(logPath, 'utf8');
    } catch(e) {
        console.log('Error:', e.stack);
        return new EventStream();
    }

    log = sanitizeInput(log);

    let lines = breakIntoLines(log);
    lines = removeNonEventLines(lines);

    let events = lines.map(line => {
        return makeEventFromLine(line);
    });

    let stream = new EventStream();
    stream.events = events;

    return stream;
};

function sanitizeInput(log)
{
    let eventPerLine = log.replace(/\n  /g, " ");
    let apostrophesAroundKeys = eventPerLine.replace(/{/g, "{'").replace(/:/g, "':").replace(/, /g, ", '");
    let quotesAroundKeysAndValues = apostrophesAroundKeys.replace(/'/g, '"');
    let removedDoubleQuotes = quotesAroundKeysAndValues.replace(/""/g, '"');
    return removedDoubleQuotes;
}

function breakIntoLines(log)
{
    return log.split('\n');
}

function removeNonEventLines(lines)
{
    return lines.filter(line => {
        return line.indexOf("Texas holdem server") !== 0
            && line.indexOf("Removing game") !== 0;
    });
}

function makeEventFromLine(line)
{
    let firstSpacePos = line.indexOf(' ');
    let eventName = line.slice(0, firstSpacePos);
    let eventJson = line.slice(firstSpacePos + 1);

    let event = new events[eventName];

    let eventData = parseEventJson(eventJson);

    for (let key in eventData) {
        let trimmedKey = key.trim();
        event[trimmedKey] = eventData[key];
    }

    return event;
}

function parseEventJson(eventJson)
{
    if (eventJson === '{"}') {
        return {};
    }
    return JSON.parse(eventJson);
}


module.exports = LogParser;