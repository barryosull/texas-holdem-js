# Split pots

The current app has an issue. It's all or nothing when it comes to the pot. If you bet into the pot in anyway and win, you get the entire pot, even if you didn't match the full amount. E.g. you went all in on the first round of betting, but other players kept betting.

## Desired behaviour
The game needs to handle side pots. A sidepot is created whenever a player goes all in, but there are still other players than can bet.

Once a player has a side pot they can no longer bet in the round, and must wait until the other players have finished playing, or through folding there is only one more player remaining, in which case a winner is declared. There can be multiple side-pots depending on the players.

## Scenarios

**Scenario 1:**
- Two players (A, B)
- A has 1000 chips
- B has 1200 chips
- A goes all in
- B goes all in
- There are now two pots
    - Sidepot 1 is for A and B with 2000 chips in it
    - Sidepot 2 is for B with 200 chips in it

- A wins
    - A gets all the chips from sidepot 1
    - B gets all the chips from sidepot 2
or
- B wins
    - B gets all the chips from sidepot 1
    - B gets all the chips from sidepot 2

**Scenario two:**
- Three players (A, B, C)
- A has 1000 chips
- B has 2000 chips
- B has 3000 chips
- A goes all in
- B goes all in
- C goes all in
- There are now three pots
    - Sidepot 1 is for A, B and C with 3000 chips in it
    - Sidepot 2 is created for B and C with 2000 chips in it
    - Sidepot 3 is created for C with 1000 chips in it
  
- A wins
    - A gets all the chips from sidepot 1
    - Winner chosen for remaining pots
    
    - B wins
        - B gets all the chips from sidepot 2
        - C gets all the chips from sidepot 3
    or 
    - C wins
        - C gets all the chips from sidepot 2 and sidepot 3
or
- B wins
    - B gets all the chips from sidepot 1 and sidepot 2
    - C gets all the chips from sidepot 3
or
- C wins
    - C gets all the chips from sidepot 1, sidepot 2 and sidepot 3

## Thoughts
From the above it's fairly clear that sidepots are actually a query side concept, figured out after the fact from looking at all the bets that were made, there's no need to produce events related to the concept.

