
var assert = require('assert');
var Game = require('../src/domain/game');
var SeatsProjection = require('../src/application/seats-projection');
var RoundProjection = require('../src/application/round-projection');
var ChipsProjection = require('../src/application/chips-projection');

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

        var players = (new SeatsProjection(game)).getPlayers();

        assert.deepEqual([playerA, playerB], players);
    });

    it('players cannot be added twice', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = playerA;
        game.addPlayer(playerA, "Name A");
        game.addPlayer(playerB, "Name B");

        var players = (new SeatsProjection(game)).getPlayers();

        assert.deepEqual([playerA], players);
    });

    it('blinds are paid automatically', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        let playerC = '9e29bbb2-e76c-4cf6-8931-2e22be61f345';
        game.addPlayer(playerA, "Name");
        game.addPlayer(playerB, "Name");
        game.addPlayer(playerC, "Name");

        game.startNewRound("test-seed");

        var smallBlind = (new RoundProjection(game)).getPlayerBet(playerB);
        var bigBlind = (new RoundProjection(game)).getPlayerBet(playerC);

        assert.equal(20, smallBlind);
        assert.equal(40, bigBlind);
    });

    it ('players can play a game of poker', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        game.addPlayer(playerA, "Name A");
        game.addPlayer(playerB, "Name B");

        game.startNewRound('test-seed');

        var playerAHand = (new RoundProjection(game)).getPlayerHand(playerA);

        // Small blind limping in
        game.placeBet(playerB, 20);

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
        var winningPlayer = (new RoundProjection(game)).getWinner();
        var winningHand = (new RoundProjection(game)).getPlayerHand(winningPlayer);
        assert.equal(playerA, winningPlayer);
        assert.deepEqual(playerAHand, winningHand);

        // Winner gets chips
        var playerAChips = (new ChipsProjection(game)).getPlayerChips(playerA);
        var playerBChips = (new ChipsProjection(game)).getPlayerChips(playerB);
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

        // Small blind limping in
        game.placeBet(playerB, 20);

        game.dealFlop();

        game.placeBet(playerA, 0);
        game.foldHand(playerB);

        // Player A wins by default
        var winningPlayer = (new RoundProjection(game)).getWinner();
        var playerAChips = (new ChipsProjection(game)).getPlayerChips(playerA);
        var playerBChips = (new ChipsProjection(game)).getPlayerChips(playerB);
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

        // Small blind limping in;
        game.placeBet(playerB, 20);

        game.dealFlop();

        game.placeBet(playerA, 0);
        game.removePlayer(playerB);

        // Player A wins by default
        var winningPlayer = (new RoundProjection(game)).getWinner();
        var playerAChips = (new ChipsProjection(game)).getPlayerChips(playerA);
        var playerBChips = (new ChipsProjection(game)).getPlayerChips(playerB);
        assert.equal(playerA, winningPlayer);
        assert.equal(1040, playerAChips);
        assert.equal(960, playerBChips);
    });

    it ('keeps track of who is the next player to act', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        let playerC = '9e29bbb2-e76c-4cf6-8931-2e22be61f345';
        game.addPlayer(playerA, "playerA");
        game.addPlayer(playerB, "playerB");
        game.addPlayer(playerC, "playerC");

        game.startNewRound('test-seed');

        var nextToAct = (new RoundProjection(game)).getNextPlayerToAct();
        assert.equal(playerA, nextToAct);

        game.placeBet(playerA, 40);

        nextToAct = (new RoundProjection(game)).getNextPlayerToAct();
        assert.equal(playerB, nextToAct);

        game.placeBet(playerB, 20);

        nextToAct = (new RoundProjection(game)).getNextPlayerToAct();
        // Big blind has bet 40 but has not acted, so they get a turn to act
        assert.equal(playerC, nextToAct);

        game.placeBet(playerC, 0);

        nextToAct = (new RoundProjection(game)).getNextPlayerToAct();
        assert.equal(null, nextToAct);

        game.dealFlop();

        nextToAct = (new RoundProjection(game)).getNextPlayerToAct();
        assert.equal(playerB, nextToAct);
    });

    it ('knows when a round of betting is complete', () => {

    });
});