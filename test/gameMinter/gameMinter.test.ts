import {expect} from '../chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {Contract} from 'ethers';
import Prando from 'prando';

const rng = new Prando('GameMinter');

async function getRandom(): Promise<number> {
  return rng.nextInt(1, 1000000000);
}

const setupTest = deployments.createFixture(
  async (): Promise<{
    GameMinter: Contract;
    users: {
      address: string;
      GameMinter: Contract;
    }[];
  }> => {
    await deployments.fixture('GameMinter');
    const users = await getUnnamedAccounts();
    return {
      GameMinter: await ethers.getContract('GameMinter'),
      users: await Promise.all(
        users.map((acc: string) =>
          (async () => {
            return {
              address: acc,
              GameMinter: await ethers.getContract('GameMinter', acc),
            };
          })()
        )
      ),
    };
  }
);

describe('GameMinter', function () {
  describe('GameMinter: Fees', function () {
    it('should charge the correct fee', async function () {});
    it('should handle not enough funds', async function () {});
    // it('should handle change correctly', async function () {});
    // it('should forward fees to the correct address', async function () {});
  });
  // describe('GameMinter: MetaTXs', function () {}); // TODO

  it('calling it directly without pre-approval result in Allowance error', async function () {
    const {users} = await setupTest();
    await expect(
      users[0].GameMinter.createGame(
        users[1].address,
        users[1].address,
        [],
        [],
        [],
        'Test Game URI',
        await getRandom()
      )
    ).to.be.revertedWith('CREATE_ACCESS_DENIED');
  });
});
