# Dealing with being Bankrupted

There is a currently a domain event that occurs when a player is bankrupted. It is used to figure out what players should be ignored in various scenarios.

Problem is that it conflicts with the new way players can be given chips. When a player is bankrupted and is then given chips, they are still considered to be "bankrupt" and thus cannot play.

## Discussion:
The problem comes from the fact that being "bankrupted" is not a command side property, but a query side one. It is figured out from looking at the event stream, not from an event. As such, the solution is to convert being "bankrupted" into purely a query side concept and use that in every instance were the bankrupted event is referenced.

## Next steps:
Figure out if the above is even possible:
- Document how the event is used currently
- See if the event is even required
- If it is, figure out a query side workaround
- Once the event is no longer referenced, remove it from the domain

## Document how the event is used currently
- domain/round-projection::getPlayersBankruptedInRound
    - Can ignore, this is used to figure out who to bankrupt
    - If we remove the bankrupt event then this is redundant
- domain/seats-projecton::getActivePlayers
    - Used to filter out players that are not in the round
        - Only used at the beginning of a round
    - Can replace with a filter to remove players with zero chips
- application/seats-projection::getActivePlayers
    - Method isn't actually used, can just remove
- application/round-projection::bankruptedInLastRound
    - Another method that isn't actually used, can just remove
- application/round-projection::getPlayersActiveInRound
    - Filters out bankrupted players from players that were dealt cards
    - Bankrupted players can never get dealt cards, can just remove
    - Tried the above, caused tests to fail, turns out this method is used to figure out the next player to go after a hand is won
        - Bankrupted event is used to figure this out
        - Need to figure out an alternative
            - Players with zero chips after a hand is won?
        - Test is calling getNextActivePlayer after the round finishes but before the next one starts
        - This can never happen in an actual game, fixed it by removing bogus call to method