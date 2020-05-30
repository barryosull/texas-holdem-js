//*********************************************************************
//  Tests to isolate bugs from real games and regression test them
//*********************************************************************

const GameRepo = require('../src/domain/game-repository');
const EventRepoFilesystem = require('../src/domain/event-repo-filesystem');
const AppRoundQueryable = require('../src/application/round-queryable');
const DomainRoundProjection = require('../src/domain/round-projection');
const NextPlayerQueryable = require('../src/application/next-player-queryable');
const assert = require('assert');

describe('buggy-games', () => {

    let eventRepoFileSystem = new EventRepoFilesystem(__dirname + '/regression/logs');
    let gameRepo = new GameRepo(eventRepoFileSystem);

    it ('figures out why the last player kept betting', () => {
        let gameId = '16a119b3-2edb-436c-9e14-1678073fb7c9';

        let game = gameRepo.fetchOrCreate(gameId);

        let nextPlayerToAct = (new NextPlayerQueryable(game.events)).getNextPlayer();
        assert.equal(nextPlayerToAct, null, "All players have acted, no further action needed.");
    });

    it ('figures out why a player was skipped even though they could have gone all in', () => {
        let gameId = '92ebb9e6-2101-4ff5-a4d4-f6e13be314cb';

        let game = gameRepo.fetchOrCreate(gameId);

        let nextPlayerToAct = (new NextPlayerQueryable(game.events)).getNextPlayer();
        let expectedPlayerId = 'ac2aad15-bd6f-4a32-ba7c-93c24c6961ec';
        assert.equal(nextPlayerToAct, expectedPlayerId, "Player checked previously, should be their turn now");
    });

    it ('chose the wrong player after a bet', () => {
        let gameId = '1a5f1c5b-1efd-4026-b5b0-b4cd5b20e9bc';

        let game = gameRepo.fetchOrCreate(gameId);

        let nextPlayerToAct = (new NextPlayerQueryable(game.events)).getNextPlayer();
        let expectedPlayerId = '3b94934c-8b55-42f3-9f04-748aedc99334';

        assert.equal(nextPlayerToAct, expectedPlayerId, "Player checked previously, should be their turn now");
    });

    it ('shouldnt choose a next player to act', () => {
        let gameId = '221f7d4a-fb5a-4abb-801b-cd0a0d70436b';

        let game = gameRepo.fetchOrCreate(gameId);

        let nextPlayerToAct = (new NextPlayerQueryable(game.events)).getNextPlayer();
        let expectedPlayerId = null;

        assert.equal(nextPlayerToAct, expectedPlayerId, "No player should be chosen, as no further moves can be made");
    });

    it ('shouldnt choose a next player to act', () => {
        let gameId = '464da4aa-4a68-47c2-86f7-0ad1d404500f';

        let game = gameRepo.fetchOrCreate(gameId);

        let nextPlayerToAct = (new NextPlayerQueryable(game.events)).getNextPlayer();
        let expectedPlayerId = null;

        assert.equal(nextPlayerToAct, expectedPlayerId, "No player should be chosen, as no further moves can be made");

        let roundQueryable = new AppRoundQueryable(game.events);
        let nextAction = roundQueryable.getNextAction();

        assert.equal(nextAction, 'announceWinners');

        let roundProjection = new DomainRoundProjection(game.events);
        let stage = roundProjection.getStageOfRound();

        assert.equal(stage, 'river');
    });

    it.only ('shouldnt choose a next player to act', () => {
        let gameId = '2ba25c0c-006b-4ce6-9bc7-23e42e87ae9a';

        let game = gameRepo.fetchOrCreate(gameId);

        let nextPlayerToAct = (new NextPlayerQueryable(game.events)).getNextPlayer();
        let expectedPlayerId = null;

        assert.equal(nextPlayerToAct, expectedPlayerId, "No player should be chosen, as no further moves can be made");

        let roundQueryable = new AppRoundQueryable(game.events);
        let nextAction = roundQueryable.getNextAction();

        assert.equal(nextAction, 'flop');

        let roundProjection = new DomainRoundProjection(game.events);
        let stage = roundProjection.getStageOfRound();

        assert.equal(stage, 'start');
    });
});

