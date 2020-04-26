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