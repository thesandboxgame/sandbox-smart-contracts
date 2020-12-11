import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import Prando from 'prando';
import {expect} from '../chai-setup';
import {expectEventWithArgs} from '../utils';
import {Address} from 'hardhat-deploy/types';
import {supplyAssets} from './supplyAssets';

const rng = new Prando('GameMinter');

async function getRandom(): Promise<number> {
  return rng.nextInt(1, 1000000000);
}

type User = {
  address: Address;
  GameMinter: Contract;
};


const setupTest = deployments.createFixture(
  async (): Promise<{
    GameMinter: Contract;
    users: User[];
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
    it.skip('should charge the correct fee', async function () {});
    it.skip('should handle not enough funds', async function () {});
  });

  describe('GameMinter: Access Control', function () {
    // @note valid calls to minter can be 1 of 4 types:
    // - direct calls from either gameOwner or gameEditor
    // - metaTXs on behalf of either gameOwner or gameEditor
    describe('GameMinter: Calling Directly', function () {
      let gameId1: BigNumber;
      let users: User[];
      let GameMinter: Contract;

      it('should fail with incorrect "from" address', async function () {
        ({users, GameMinter} = await setupTest());
        await expect(
          users[0].GameMinter.createGame(
            users[1].address,
            users[1].address,
            [],
            [],
            ethers.constants.AddressZero,
            'Test Game URI',
            await getRandom()
          )
        ).to.be.revertedWith('CREATE_ACCESS_DENIED');
      });

      it('should allow anyone to create a game', async function () {
        const {sandAdmin, gameTokenAdmin} = await getNamedAccounts();
        const sandContract = await ethers.getContract('Sand');
        const sandAsAdmin = await sandContract.connect(
          ethers.provider.getSigner(sandAdmin)
        );
        await sandAsAdmin.setSuperOperator(GameMinter.address, true);

        const gameTokenContract = await ethers.getContract('GameToken');
        const gameAsAdmin = await gameTokenContract.connect(
          ethers.provider.getSigner(gameTokenAdmin)
        );
        await gameAsAdmin.changeMinter(GameMinter.address);

        await sandAsAdmin.transfer(
          users[1].address,
          BigNumber.from('1000000000000000000000000')
        );

        const receipt = await users[1].GameMinter.createGame(
          users[1].address,
          users[1].address,
          [],
          [],
          users[8].address,
          'Test Game URI',
          await getRandom()
        );
        const event = await expectEventWithArgs(
          gameTokenContract,
          receipt,
          'Transfer'
        );
        gameId1 = event.args[2];
      });

  //     await expect(() => token.transfer(walletTo.address, 200))
  // .to.changeTokenBalances(token, [wallet, walletTo], [-200, 200]);

      it('should fail if not authorized to add assets', async function () {
        await expect(
          users[0].GameMinter.addAssets(
            users[1].address,
            gameId1,
            [],
            [],
            'Test Game URI',
            ethers.constants.AddressZero
          )
        ).to.be.revertedWith('AUTH_ACCESS_DENIED');
      });

      it('should fail if not authorized to remove assets', async function () {
        await expect(
          users[0].GameMinter.removeAssets(
            users[1].address,
            gameId1,
            [],
            [],
            users[1].address,
            'Test Game URI',
            ethers.constants.AddressZero
          )
        ).to.be.revertedWith('AUTH_ACCESS_DENIED');
      });

      it('should fail if not authorized to set GAME URI', async function () {
        await expect(
          users[0].GameMinter.setTokenUri(
            users[1].address,
            gameId1,
            'Test Game URI',
            ethers.constants.AddressZero
          )
        ).to.be.revertedWith('AUTH_ACCESS_DENIED');
      });

      it('allows GAME owner to add assets', async () {})
      it('allows GAME owner to remove assets', async () {})
      it('allows GAME owner to set GAME URI', async () {})

      it('allows GAME editor to add assets', async () {})
      it('allows GAME editor to remove assets', async () {})
      it('allows GAME editor to set GAME URI', async () {})
    });
    // describe('GameMinter: MetaTXs', function () {}); TODO
  });
});
