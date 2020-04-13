
var assert = require('assert');
var Game = require('../src/domain/game');

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

        var players = game.seats.getPlayers();

        assert.deepEqual([playerA, playerB], players);
    });

    it('players cannot be added twice', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = playerA;
        game.addPlayer(playerA, "Name A");
        game.addPlayer(playerB, "Name B");

        var players = game.seats.getPlayers();

        assert.deepEqual([playerA], players);
    });
});