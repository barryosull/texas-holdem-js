# Multi-player
There is an issue with mutiplayer at the moment. We had a game with four players, game went as expected until someone folded, then it froze. This meant that the game couldn't continue. I investigated the issue, even loaded up the game and played it forward to that command, all looked fine to me.

This means that there are bugs I can't currently diagnose.

Up until now I've been testing with 1, 2 and 3 players. It seems that this isn't enough. I need to test this app more thoroughly.

## Ideas

### 1. AI players
The first idea is a mad one, create AI players that will play the game as if it they're actual players. They don't have to be good, they just have to be able to play a game.

In order for this to be most useful these players will need to play the actual UI, rather than just making calls to the backend. I need to know that the UI actually works. AIs would also periodically refresh the page, just so we can prove the refreshes work and aren't messing up the game.

Couple of ideas on how to implement:
1. Allow player IDs to be set from the URL, not the cookie, allows multiple games from a single browser.
2. Create a HTML page that uses iframes to include multiple games, player game at top, AI games in a row at the bottom.
3. AIs watch for DOM changes, trigger their actions based on that
4. AI code is completely independent of game code. They read the board like a player, they have no access to the rest of game functionality.

### 2. Manual override
When the game gets into an invalid state and cannot progress we need someway to override behaviour and trigger the next round. It could be a replay of the notification log, a force refresh, just something to keep the game going.

The reason for this idea is that the previous game seemed to work, there were no errors in the log, so I don't think this is a bug, at least not an error throwing one, instead I think it's a notification logic issue. By making it possible to trigger notification paths, we could help diagnose the issues in real time when they happen.

### 3. More tests
At the moment the app has limited tests. The domain and most of the application projections are tested, but most of the inputs and outputs of the system have not. 

If I went down this page I'd need to add input tests for the HTTP controller actions and output tests for the notification systems.

Not sure if acceptance tests are needed, but it's hard to say. They'd test it all end to end, but there are many combinatory paths that the tests would end up testing one path and being quite brittle.