//*********************************************************************
//  Tests to isolate bugs from real games and regression test them
//*********************************************************************

const GameRepo = require('../../src/domain/game-repository');
const EventRepoFilesystem = require('../../src/domain/event-repo-filesystem');
const RoundQueryable = require('../../src/application/round-queryable');
const assert = require('assert');

describe('buggy-games', () => {

    let eventRepoFileSystem = new EventRepoFilesystem(__dirname + '/logs');
    let gameRepo = new GameRepo(eventRepoFileSystem);

    it ('figures out why the last player kept betting', () => {
        let gameId = '16a119b3-2edb-436c-9e14-1678073fb7c9';

        let game = gameRepo.fetchOrCreate(gameId);

        let nextPlayerToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(nextPlayerToAct, null, "All players have acted, no further action needed.");
    });

    it ('figures out why a player was skipped even though they could have gone all in', () => {
        let gameId = '92ebb9e6-2101-4ff5-a4d4-f6e13be314cb';

        let game = gameRepo.fetchOrCreate(gameId);

        let nextPlayerToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        let expectedPlayerId = 'ac2aad15-bd6f-4a32-ba7c-93c24c6961ec';
        assert.equal(nextPlayerToAct, expectedPlayerId, "Player checked previously, should be their turn now");
    });

    it ('figures out why a player was allowed to check even though the bet was all in', () => {
        let gameId = '2ab9eb40-abef-45a9-aa78-00112c99f2e1';

        let game = gameRepo.fetchOrCreate(gameId);

        let nextPlayerToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        let expectedPlayerId = 'ac2aad15-bd6f-4a32-ba7c-93c24c6961ec';
        assert.equal(nextPlayerToAct, expectedPlayerId, "Player checked previously, should be their turn now");
    });
});

