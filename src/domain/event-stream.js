
var EventStream = function(eventLogger)
{
    this.eventLogger = eventLogger || function(event){ console.log(event) };

    this.events = [];
    this.projectionSnapshots = new ProjectionSnapshots();
};

EventStream.prototype.push = function(...args)
{
    this.events.push(...args);
    for (var i = 0; i< arguments.length; i++) {
        this.eventLogger(arguments[i]);
    }
};

EventStream.prototype.project = function(name, reduceFunction, initial)
{
    let snapshot = this.projectionSnapshots.get(name) || new ProjectionSnapshot(name, 0, initial);

    let eventsToProcess = this.events.slice(snapshot.position);

    let newState = eventsToProcess.reduce(reduceFunction, snapshot.state);

    snapshot = snapshot.update(eventsToProcess.length, newState);

    this.projectionSnapshots.store(snapshot);

    return newState;
};

var ProjectionSnapshot = function(name, eventStreamPosition, state)
{
    this.name = name;
    this.position = eventStreamPosition;
    this.state = state;
};

ProjectionSnapshot.prototype.update = function(processEventCount, state)
{
    var position = this.position + processEventCount;
    return new ProjectionSnapshot(this.name, position, state);
};

var ProjectionSnapshots = function()
{
    this.snapshots = {};
};

ProjectionSnapshots.prototype.get = function(name)
{
    return this.snapshots[name];
};

/**
 * @param snapshot {ProjectionSnapshot}
 */
ProjectionSnapshots.prototype.store = function(snapshot)
{
    this.snapshots[snapshot.name] = snapshot;
};

module.exports = EventStream;
