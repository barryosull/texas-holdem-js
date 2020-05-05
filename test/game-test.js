
const assert = require('assert');
const EventStream = require('../src/domain/event-stream');
const Game = require('../src/domain/game');
const Pot = require('../src/domain/pot');
const SeatsQueryable = require('../src/application/seats-queryable');
const RoundQueryable = require('../src/application/round-queryable');
const ChipsQueryable = require('../src/application/chips-queryable');

function makeGame()
{
    let gameId = "c92a18ab-ad0c-4a60-958c-7146ead2cfa8";
    let eventStream = new EventStream(gameId);
    return new Game(gameId, eventStream);
}

describe('Game', () => {

    it('adds players to game', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        game.addPlayer(playerA, "Name");
        game.addPlayer(playerB, "Name");
        game.givePlayerChips(playerA, 1000);
        game.givePlayerChips(playerB, 1000);

        let players = (new SeatsQueryable(game.events)).getPlayers();

        assert.deepEqual([playerA, playerB], players);
    });

    it('players cannot be added twice', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = playerA;
        game.addPlayer(playerA, "Name A");
        game.addPlayer(playerB, "Name B");
        game.givePlayerChips(playerA, 1000);
        game.givePlayerChips(playerB, 1000);

        let players = (new SeatsQueryable(game.events)).getPlayers();

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
        game.givePlayerChips(playerA, 1000);
        game.givePlayerChips(playerB, 1000);
        game.givePlayerChips(playerC, 1000);

        game.startNewRound("test-seed");

        let smallBlind = (new RoundQueryable(game.events)).getPlayerBet(playerB);
        let bigBlind = (new RoundQueryable(game.events)).getPlayerBet(playerC);

        assert.equal(20, smallBlind);
        assert.equal(40, bigBlind);
    });

    it ('players can play a game of poker', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        game.addPlayer(playerA, "Name A");
        game.addPlayer(playerB, "Name B");
        game.givePlayerChips(playerA, 1000);
        game.givePlayerChips(playerB, 1000);

        game.startNewRound('test-seed');

        let playerAHand = (new RoundQueryable(game.events)).getPlayerHand(playerA);

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
        let winningPlayers = (new RoundQueryable(game.events)).getWinners();
        let winningHands = (new RoundQueryable(game.events)).getPlayerHands(winningPlayers);
        assert.deepEqual(winningPlayers, [playerA]);
        assert.deepEqual(winningHands, [playerAHand]);

        // Winner gets chips
        let playerAChips = (new ChipsQueryable(game.events)).getPlayerChips(playerA);
        let playerBChips = (new ChipsQueryable(game.events)).getPlayerChips(playerB);
        assert.equal(1160, playerAChips);
        assert.equal(840, playerBChips);
    });

    it ('folding causes the last remaining player to win by default', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        game.addPlayer(playerA, "Name A");
        game.addPlayer(playerB, "Name B");
        game.givePlayerChips(playerA, 1000);
        game.givePlayerChips(playerB, 1000);

        game.startNewRound('test-seed');

        // Small blind limping in
        game.placeBet(playerB, 20);

        game.dealFlop();

        game.placeBet(playerA, 0);
        game.foldHand(playerB);

        // Player A wins by default
        let winningPlayers = (new RoundQueryable(game.events)).getWinners();
        let playerAChips = (new ChipsQueryable(game.events)).getPlayerChips(playerA);
        let playerBChips = (new ChipsQueryable(game.events)).getPlayerChips(playerB);
        assert.deepEqual(winningPlayers, [playerA]);
        assert.equal(1040, playerAChips);
        assert.equal(960, playerBChips);
    });

    it ('leaving the game causes the last remaining player to win by default', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        game.addPlayer(playerA, "Name A");
        game.addPlayer(playerB, "Name B");
        game.givePlayerChips(playerA, 1000);
        game.givePlayerChips(playerB, 1000);

        game.startNewRound('test-seed');

        // Small blind limping in;
        game.placeBet(playerB, 20);

        game.dealFlop();

        game.placeBet(playerA, 0);
        game.removePlayer(playerB);

        // Player A wins by default
        let winningPlayers = (new RoundQueryable(game.events)).getWinners();
        let playerAChips = (new ChipsQueryable(game.events)).getPlayerChips(playerA);
        let playerBChips = (new ChipsQueryable(game.events)).getPlayerChips(playerB);
        assert.deepEqual(winningPlayers, [playerA]);
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
        game.givePlayerChips(playerA, 1000);
        game.givePlayerChips(playerB, 1000);
        game.givePlayerChips(playerC, 1000);

        game.startNewRound('test-seed');

        let nextToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(playerA, nextToAct);

        game.placeBet(playerA, 40);

        nextToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(playerB, nextToAct);

        game.placeBet(playerB, 20);

        nextToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        // Big blind has bet 40 but has not acted, so they get a turn to act
        assert.equal(playerC, nextToAct);

        game.placeBet(playerC, 0);

        nextToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(null, nextToAct);

        game.dealFlop();

        nextToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(playerB, nextToAct);
    });

    it ('Keeps track of who goes next, even in the next betting round', () => {
        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        game.addPlayer(playerA, "playerA");
        game.addPlayer(playerB, "playerB");
        game.givePlayerChips(playerA, 1000);
        game.givePlayerChips(playerB, 1000);

        game.startNewRound('test-seed');

        game.placeBet(playerB, 20);
        game.placeBet(playerA, 0);

        game.dealFlop();

        game.placeBet(playerB, 40);

        let nextToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(playerA, nextToAct);
    });

    it ('Picks the winning hand correctly', () => {
        let game = makeGame();
        let playerA = '4df495c4-1e0c-4e12-8914-cf89a268a4f6';
        let playerB = '6d53ea8e-0e7c-4d11-9551-0ec062394650';
        game.addPlayer(playerA, "Test");
        game.addPlayer(playerB, "Barry");
        game.givePlayerChips(playerA, 1000);
        game.givePlayerChips(playerB, 1000);

        game.startNewRound('0.3ig391obvls');

        game.placeBet(playerB, 20);
        game.placeBet(playerA, 0);

        game.dealFlop();

        game.placeBet(playerB, 40);
        game.placeBet(playerA, 80);
        game.placeBet(playerB, 40);

        game.dealTurn();

        game.placeBet(playerB, 40);
        game.placeBet(playerA, 40);

        game.dealRiver();

        game.placeBet(playerB, 40);
        game.placeBet(playerA, 120);
        game.placeBet(playerB, 120);
        game.placeBet(playerA, 40);

        game.finish();
    });

    it ('folded players are not considered for next player', () => {

        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        let playerC = '9e29bbb2-e76c-4cf6-8931-2e22be61f345';
        game.addPlayer(playerA, "playerA");
        game.addPlayer(playerB, "playerB");
        game.addPlayer(playerC, "playerC");
        game.givePlayerChips(playerA, 1000);
        game.givePlayerChips(playerB, 1000);
        game.givePlayerChips(playerC, 1000);

        game.startNewRound('test-seed');

        game.placeBet(playerA, 40);
        game.foldHand(playerB);
        game.placeBet(playerC, 0);

        let nextToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(nextToAct, null, "All players (acted and bet same amount) or folded.");
        game.dealFlop();

        nextToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(playerC, nextToAct);
    });

    it ('bankrupted players are not considered for next player', () => {

        let game = makeGame();
        let playerA = '553e5f71-2dce-45ed-8639-13ad81804d7d';
        let playerB = 'c9128c1e-f4aa-4009-b0f6-0d4822c28a65';
        let playerC = '9e29bbb2-e76c-4cf6-8931-2e22be61f345';
        game.addPlayer(playerA, "playerA");
        game.addPlayer(playerB, "playerB");
        game.addPlayer(playerC, "playerC");
        game.givePlayerChips(playerA, 1000);
        game.givePlayerChips(playerB, 1000);
        game.givePlayerChips(playerC, 1000);

        game.startNewRound('test-seeda');

        game.placeBet(playerA, 1000);
        game.foldHand(playerB);
        game.placeBet(playerC, 960);

        game.dealFlop();
        game.dealTurn();
        game.dealRiver();
        game.finish();

        game.startNewRound('test-seedb');

        let nextToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(nextToAct, playerA);

        game.placeBet(playerA, 20);

        nextToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(nextToAct, playerB);
    });

    it ('allows split pots', () => {
        let game = makeGame();
        let playerA = 'a53e5f71-2dce-45ed-8639-13ad81804d7d'; // 2nd
        let playerB = 'b9128c1e-f4aa-4009-b0f6-0d4822c28a65'; // 1st
        let playerC = 'ce29bbb2-e76c-4cf6-8931-2e22be61f345'; // 3rd
        game.addPlayer(playerA, "playerA");
        game.addPlayer(playerB, "playerB");
        game.addPlayer(playerC, "playerC");
        game.givePlayerChips(playerB, 1000);
        game.givePlayerChips(playerA, 2000);
        game.givePlayerChips(playerC, 3000);

        game.startNewRound('test-seed');

        // Make everyone go all in
        game.placeBet(playerA, 2000);
        game.placeBet(playerB, 980);
        game.placeBet(playerC, 2960);

        let roundQueryable = new RoundQueryable(game.events);

        let pots = roundQueryable.getPots();

        assert.deepEqual(pots, [
            new Pot(3000, [playerB, playerC, playerA]),
            new Pot(2000, [playerC, playerA]),
            new Pot(1000, [playerC])
        ]);

        game.dealFlop();
        game.dealTurn();
        game.dealRiver();
        game.finish();

        let chipsQueryable = new ChipsQueryable(game.events);

        // Player B wins pot 1
        assert.equal(chipsQueryable.getPlayerChips(playerB), 3000);
        // Player A wins pot 2
        assert.equal(chipsQueryable.getPlayerChips(playerA), 2000);
        // Player C wins pot 3
        assert.equal(chipsQueryable.getPlayerChips(playerC), 1000);
    });

    it ('split pots include amounts from folded players that bet', () => {
        let game = makeGame();
        let playerA = 'a53e5f71-2dce-45ed-8639-13ad81804d7d'; // 2nd
        let playerB = 'b9128c1e-f4aa-4009-b0f6-0d4822c28a65'; // 1st
        let playerC = 'ce29bbb2-e76c-4cf6-8931-2e22be61f345'; // 3rd
        game.addPlayer(playerA, "playerA");
        game.addPlayer(playerB, "playerB");
        game.addPlayer(playerC, "playerC");
        game.givePlayerChips(playerB, 1000);
        game.givePlayerChips(playerA, 2000);
        game.givePlayerChips(playerC, 3000);

        game.startNewRound('test-seed');

        // Make everyone go all in
        game.placeBet(playerA, 2000);
        game.placeBet(playerB, 980);
        game.placeBet(playerC, 2960);

        let nextToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(nextToAct, null);

        game.dealFlop();
        game.dealTurn();

        game.foldHand(playerB);

        game.dealRiver();
        game.finish();

        let chipsQueryable = new ChipsQueryable(game.events);

        // Player A wins pot 1 and 2
        assert.equal(chipsQueryable.getPlayerChips(playerA), 5000);
        // Player C wins pot 3
        assert.equal(chipsQueryable.getPlayerChips(playerC), 1000);
    });
});

