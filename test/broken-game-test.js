//*************************************
//  Test to diagnose why a particular game failed
//*************************************

const GameRepo = require('../src/domain/game-repository');
const RoundQueryable = require('../src/application/round-queryable');
const assert = require('assert');

describe('BrokenGame', () => {

    it ('figures out why the last player kept betting', () => {
        let gameId = '16a119b3-2edb-436c-9e14-1678073fb7c9';

        let game = GameRepo.fetchOrCreate(gameId);

        let nextPlayerToAct = (new RoundQueryable(game.events)).getNextPlayerToAct();
        assert.equal(nextPlayerToAct, null, "All players have acted, no further action needed.");
    });
});

