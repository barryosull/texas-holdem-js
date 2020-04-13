
var assert = require('assert');
var Game = require('../src/domain/game');
var SeatsProjection1 = require('../src/application/seats-projection-1');

function makeGame()
{
    var fakeLogger = () => {};
    return new Game("c92a18ab-ad0c-4a60-958c-7146ead2cfa8", fakeLogger);
}

describe('Game', () => {

    it('adds players to game', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        game.addPlayer(playerA, "Name");
        game.addPlayer(playerB, "Name");

        var players = (new SeatsProjection1(game)).getPlayers();

        assert.deepEqual([playerA, playerB], players);
    });

    it('players cannot be added twice', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = playerA;
        game.addPlayer(playerA, "Name A");
        game.addPlayer(playerB, "Name B");

        var players = (new SeatsProjection1(game)).getPlayers();

        assert.deepEqual([playerA], players);
    });

    it ('players can play a game of poker', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        game.addPlayer(playerA, "Name A");
        game.addPlayer(playerB, "Name B");

        game.startNewRound('test-seed');

        var playerAHand = game.round.getPlayerHand(playerA);

        game.placeBet(playerA, 40);
        game.placeBet(playerB, 40);

        game.dealFlop();

        game.placeBet(playerA, 0);
        game.placeBet(playerB, 0);

        game.dealTurn();

        game.placeBet(playerA, 80);
        game.placeBet(playerB, 80);

        game.dealRiver();

        game.placeBet(playerA, 40);
        game.placeBet(playerB, 40);

        game.finish();

        // Player A wins
        var winningPlayer = game.round.getWinner();
        var winningHand = game.round.getPlayerHand(winningPlayer);
        assert.equal(playerA, winningPlayer);
        assert.deepEqual(playerAHand, winningHand);

        // Winner gets chips
        var playerAChips = (new SeatsProjection1(game)).getPlayerChips(playerA);
        var playerBChips = (new SeatsProjection1(game)).getPlayerChips(playerB);
        assert.equal(1160, playerAChips);
        assert.equal(840, playerBChips);
    });

    it ('folding causes the last remaining player to win by default', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        game.addPlayer(playerA, "Name A");
        game.addPlayer(playerB, "Name B");

        game.startNewRound('test-seed');

        game.placeBet(playerA, 40);
        game.placeBet(playerB, 40);

        game.dealFlop();

        game.placeBet(playerA, 0);
        game.foldHand(playerB);

        // Player A wins by default
        var winningPlayer = game.round.getWinner();
        var playerAChips = (new SeatsProjection1(game)).getPlayerChips(playerA);
        var playerBChips = (new SeatsProjection1(game)).getPlayerChips(playerB);
        assert.equal(playerA, winningPlayer);
        assert.equal(1040, playerAChips);
        assert.equal(960, playerBChips);
    });

    it ('leaving the game causes the last remaining player to win by default', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        game.addPlayer(playerA, "Name A");
        game.addPlayer(playerB, "Name B");

        game.startNewRound('test-seed');

        game.placeBet(playerA, 40);
        game.placeBet(playerB, 40);

        game.dealFlop();

        game.placeBet(playerA, 0);
        game.removePlayer(playerB);

        // Player A wins by default
        var winningPlayer = game.round.getWinner();
        var playerAChips = (new SeatsProjection1(game)).getPlayerChips(playerA);
        var playerBChips = (new SeatsProjection1(game)).getPlayerChips(playerB);
        assert.equal(playerA, winningPlayer);
        assert.equal(1040, playerAChips);
        assert.equal(960, playerBChips);
    });
});