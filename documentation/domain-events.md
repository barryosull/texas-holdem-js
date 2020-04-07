## Domain Events
- GameStarted
- GameFinished
- PlayerAdded
- SeatFilled
- SeatEmptied
- RoundStarted
- HandDealt
- HandFolded
- FlopDealt
- TurnDealt
- RiverDealt
- HandWon

### Details
- GameStarted
    - id
    
- GameFinished
    - id
    
- PlayerAdded
    - playerId

- PlayerNamed
    - playerId
    - name   
    
- SeatFilled
    - seat
    - playerId

- SeatEmptied
    - seat

- RoundStarted
    
- HandDealt
    - seat
    - cards
    
- HandFolded
    - seat

- FlopDealt
    - cards

- TurnDealt
    - card
    
- RiverDealt
    - card
    
- HandWon
    - seat