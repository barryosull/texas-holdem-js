# Refresh Issue

There is an issue with this app. When the user refreshes the page it attempts to reload the current game state, but it is imprecise.
The state is loaded but not everything is shown, and it isn't fixed until the start of a new round.

If the admin refreshes the page then the problem is made worse, as it will lose track of the current games state.

Another problem that's partially related is that users will not see new players until a game starts.

## How it currently works
There are two systems at play here
- Socket Notifications
- HTTP Query

Notifications are sent and update a single piece of data, e.g. a players hand.

Queries are made and return the entire state of the game state (or at least they're supposed to).

This means that there are two ways to do the same thing. This is obviously causing problems, and even if we solve the issue as it stands now, it is likely that the problem will re-emerge later if we don't design a proper solution.

The HTTP query is actually made up existing notifications mashed together into a single ViewModel, and the app side extracts these notifications and passes them to the controllers. This was a lazy attempt to fix the issue, and it's not quite good enough, yet it might be on the right track.

## Ideas
1. Send full state in the HTTP query
2. Replay every notification
3. Send a subset of notifications

**1. Send full state in the HTTP query**
I don't like this one, as it's forcing the system to have two ways of rendering. It makes it more likely that things will get out of sync in future.

**2. Replay every notification**
Again this is a very naive solution. We could log a record of every notification, but it would kill the app to reload them, especially if it's a long running game.

**3. Send a subset of notifications**
This is the best idea so far. We could send back a subset of the notifications sent during a game. E.g. we would only send the notifications sent from the start of the current round of poker.

## Implementation
If we went with the subset of notifications we'd need:
- Some way to keep track of what notifications were sent
- An easy way to resend them.
- To make sure it doesn't send notifications it shouldn't, e.g. send a different players hand
- To design notifications with this in mind. E.g. send a "players" notification at the beginning of each round with all the player/seat info
- An implementation of the notifier that is aware of rounds starting/finishing

We could go further with this and do a complete overall of all notifications, figure out the absolute minimum info we'd need to send to render the board, but that can come later. For now this is the simplest thing to do.

### Things to consider
1. How many notifications are there per round? ~50
    - Would this cause problems, would the user notice this happening and what does it look like?
    - Is it enough of a problem?
    - Can we render this all before the page is attached? That way there's no rendering until the end?
2. How do we send the notifications?
    - Respond with them as an array in PHP
3. How do we get the notifications
    - Create a new implementation of the notifier
    - Keeps track of notifications
        - Both general and user specific
    - Can fetch the list at any time
    - Looks for the RoundStarted notification and then blanks the list afterwards

## Redesign of Notifications
In order for this to work I'll need to redesign the current notification structure.

The hard part of this is the seats. I would like players to appear and disappear as they connect and disconnect.

At the moment I'm broadcasting player state as one giant notification, but that does not allow new players to enter or leave. It's a bit of a mess TBH.

I could remove this notification and have specific notifications for players entering or leaving, which would update everyone.

The only issue with this is that these events are no longer tied to a round starting, so I'd need to keep track of all these events, then merge in the round notifications and send those. Not impossible, actually quite doable, but potentially messy.

The existing players message also contains all player chips counts, which is needed for this to work.

It sounds like the PlayersList notification is most useful when a round starts. It's used to reset the render of the board. It contains a projection of all players.

Ok, so changes to notifications:
1. Remove player hand from the round started notification, it just muddies the water.
2. Make a new notification for the player hand
3. Round started includes a list of all players and their chip counts
4. Add player added and player removed notifications, used to update the board in real-time
5. Player given chips is now it's own notification

The above will allow the game to be reloaded easily from just this rounds notifications.

**What about before the first round starts?**
A good question. The notification relay system should broadcast all the notification before the round starts. Simple.