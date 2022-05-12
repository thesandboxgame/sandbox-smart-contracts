import {expect} from '../chai-setup';
import {setupEstateGameRecordLibTest} from './fixtures';

describe('Estate Game Records Test', function () {
  it('createGame', async function () {
    const {tester} = await setupEstateGameRecordLibTest();
    const gameIdBase = 12;
    for (let i = 0; i < 10; i++) {
      const gameId = gameIdBase + i;
      expect(await tester.cant(0)).to.be.equal(i);
      await tester.createGame(0, gameId);
      await expect(tester.createGame(0, gameId)).to.revertedWith(
        'already exists'
      );

      expect(await tester.getGameIdAt(0, i)).to.be.equal(gameId);
      expect(await tester.cant(0)).to.be.equal(i + 1);
      expect(await tester.contains(0, gameId)).to.be.true;
    }
  });

  it('deleteGame', async function () {
    const {tester} = await setupEstateGameRecordLibTest();
    const gameId = 123;
    await tester.createGame(0, gameId);
    expect(await tester.getGameIdAt(0, 0)).to.be.equal(gameId);
    await tester.deleteGame(0, gameId);

    await expect(tester.getGameIdAt(0, 0)).to.revertedWith('out-of-bounds');
    expect(await tester.cant(0)).to.be.equal(0);
    expect(await tester.contains(0, gameId)).to.be.false;
    await expect(tester.deleteGame(0, gameId)).to.revertedWith('not found');
  });

  it('delete one game from a list', async function () {
    const {tester} = await setupEstateGameRecordLibTest();
    const cant = 10;
    const gameIdBase = 12;

    for (let i = 0; i < cant; i++) {
      const gameId = gameIdBase + i;
      await tester.createGame(0, gameId);
    }

    const gameId = gameIdBase + 4;

    expect(await tester.getGameIdAt(0, 4)).to.be.equal(gameId);
    await tester.deleteGame(0, gameId);
    expect(await tester.getGameIdAt(0, 4)).to.not.be.equal(gameId);
    expect(await tester.cant(0)).to.be.equal(cant - 1);
    expect(await tester.contains(0, gameId)).to.be.false;

    await expect(tester.deleteGame(0, gameId)).to.revertedWith('not found');
  });
  // TODO: test map operations
});
