## Replaying Notifications

We currently have the ability to replay notifications, but only while the game is ongoing. Once everyone leaves the game the notification list is deleted.

We now have the ability to build notifications from the event stream. So we can rebuild the notifications stream on load. 

The problem with this is how the projections are built, they are passed the full event stream and play it up to the most recent event, even if the notification projection system is actually being built of a much older event.

So we need someway to only play a subset of the event stream. Another problem is that the projections are shared by other parts of the application, so they could potentially get out of sync. 

Going to need to really think about this, the current architecture is getting in the way.