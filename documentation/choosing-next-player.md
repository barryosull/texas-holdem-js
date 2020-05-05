# Choosing  the next player bug

There is a bug currently were a user is chosen as the next player even though there should be no next player.

E.g. playerA goes all in with 100 chips, then playerB with 200 calls the 100.
This should mean the round is over, but instead it loops back to playerA, asking them to act. 

Still has this bug to some degree. This time it's the bots that found it. The last player is forcibly chosen again and again to make the next move, eventually it means the player folds and the player that went all wins by default.