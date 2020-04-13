## Aggregates

An exploration on what aggregates there are in this system

- Seat:
    - Definitely an aggregate
    - Self contained events, one to one with projections

- Player:
    - Just the name, nothing more

- Round:
    - Looks like a solid candidate
    - Would encapsulate hands, bets, folding, figuring out the winner

- Chips:
    - Looks after a players chips