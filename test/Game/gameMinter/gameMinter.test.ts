import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {BigNumber, Contract} from 'ethers';
import Prando from 'prando';
import {expect} from '../../chai-setup';
import {expectEventWithArgs} from '../../utils';
import {Address} from 'hardhat-deploy/types';
import {supplyAssets} from '../assets';
import {
  gameMintingFee,
  gameModificationFee,
} from '../../../data/gameMinterFees';

const rng = new Prando('GameMinter');

async function getRandom(): Promise<number> {
  return rng.nextInt(1, 1000000000);
}

async function getTokenBalances(
  contract: Contract,
  addr1: Address,
  addr2: Address
): Promise<BigNumber[]> {
  const balances: BigNumber[] = [];
  balances.push(await contract.balanceOf(addr1));
  balances.push(await contract.balanceOf(addr2));
  return balances;
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
  // @note valid calls to minter can be 1 of 4 types:
  // - direct calls from either gameOwner or gameEditor
  // - metaTXs on behalf of either gameOwner or gameEditor
  describe('GameMinter: Calling Directly', function () {
    let gameId1: BigNumber;
    let users: User[];
    let GameMinter: Contract;
    let sandContract: Contract;
    let sandAsAdmin: Contract;
    let gameTokenContract: Contract;
    let assets: BigNumber[];
    let quantities: number[];
    let editorAssets: BigNumber[];
    let editorQuantities: number[];
    let gameTokenFeeBeneficiary: Address;

    before(async function () {
      ({GameMinter, users} = await setupTest());
      const {sandAdmin, gameTokenAdmin} = await getNamedAccounts();
      gameTokenContract = await ethers.getContract('GameToken');
      sandContract = await ethers.getContract('Sand');
      sandAsAdmin = await sandContract.connect(
        ethers.provider.getSigner(sandAdmin)
      );
      await sandAsAdmin.setSuperOperator(GameMinter.address, true);
      const gameAsAdmin = await gameTokenContract.connect(
        ethers.provider.getSigner(gameTokenAdmin)
      );
      await gameAsAdmin.changeMinter(GameMinter.address);
      const signers = await ethers.getSigners();
      gameTokenFeeBeneficiary = await signers[3].getAddress();

      // Supply users with sand and assets:
      await sandAsAdmin.transfer(
        users[1].address,
        BigNumber.from('1000000000000000000000000')
      );
      await sandAsAdmin.transfer(
        users[8].address,
        BigNumber.from('1000000000000000000000000')
      );

      ({assets, quantities} = await supplyAssets(
        users[1].address,
        users[1].address,
        [77, 3, 14]
      ));

      ({
        assets: editorAssets,
        quantities: editorQuantities,
      } = await supplyAssets(users[8].address, users[8].address, [11]));
    });

    it('should fail with incorrect "from" address', async function () {
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

    it('should fail to create GAME if user has insufficient SAND', async function () {
      await expect(
        users[2].GameMinter.createGame(
          users[2].address,
          users[2].address,
          [],
          [],
          ethers.constants.AddressZero,
          'Test Game URI',
          await getRandom()
        )
      ).to.be.revertedWith('not enough fund');
    });

    it('should allow anyone to create a game', async function () {
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
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

      const balancesAfter = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameMintingFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameMintingFee)
      );
    });

    it('should allow owner to add assets', async function () {
      await expect(
        users[1].GameMinter.addAssets(
          users[1].address,
          gameId1,
          [assets[0], assets[1]],
          [quantities[0], quantities[1]],
          'Updated URI with Assets!',
          ethers.constants.AddressZero
        )
      )
        .to.emit(gameTokenContract, 'AssetsAdded')
        .withArgs(
          gameId1,
          [assets[0], assets[1]],
          [quantities[0], quantities[1]]
        );
    });

    it('should charge a fee when owner adds assets', async function () {
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      await users[1].GameMinter.addAssets(
        users[1].address,
        gameId1,
        [assets[2]],
        [quantities[2]],
        'Updated URI with Assets!',
        ethers.constants.AddressZero
      );

      const balancesAfter = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameModificationFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameModificationFee)
      );
    });

    it('should allow editor to add assets', async function () {
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[8].address,
        gameTokenFeeBeneficiary
      );

      await expect(
        users[8].GameMinter.addAssets(
          users[8].address,
          gameId1,
          editorAssets,
          editorQuantities,
          'Updated URI with Assets!',
          ethers.constants.AddressZero
        )
      )
        .to.emit(gameTokenContract, 'AssetsAdded')
        .withArgs(gameId1, editorAssets, editorQuantities);

      const balancesAfter = await getTokenBalances(
        sandContract,
        users[8].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameModificationFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameModificationFee)
      );
    });

    it('should allow owner to remove assets', async function () {
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      await expect(
        users[1].GameMinter.removeAssets(
          users[1].address,
          gameId1,
          [assets[1]],
          [quantities[1]],
          users[1].address,
          'Updated URI when removing Assets',
          ethers.constants.AddressZero
        )
      )
        .to.emit(gameTokenContract, 'AssetsRemoved')
        .withArgs(gameId1, [assets[1]], [quantities[1]], users[1].address);

      const balancesAfter = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameModificationFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameModificationFee)
      );
    });

    it('should allow editor to remove assets', async function () {
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[8].address,
        gameTokenFeeBeneficiary
      );

      await expect(
        users[8].GameMinter.removeAssets(
          users[8].address,
          gameId1,
          [assets[0]],
          [quantities[0]],
          users[1].address,
          'Updated URI when editor removing Assets',
          ethers.constants.AddressZero
        )
      )
        .to.emit(gameTokenContract, 'AssetsRemoved')
        .withArgs(gameId1, [assets[0]], [quantities[0]], users[1].address);

      const balancesAfter = await getTokenBalances(
        sandContract,
        users[8].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameModificationFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameModificationFee)
      );
    });

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

    it('should fail to modify GAME if user has insufficient SAND', async function () {
      const gameAsGameOwner = await gameTokenContract.connect(
        ethers.provider.getSigner(users[1].address)
      );
      await gameAsGameOwner.setGameEditor(
        users[1].address,
        gameId1,
        users[2].address,
        true
      );
      await expect(
        users[2].GameMinter.addAssets(
          users[2].address,
          gameId1,
          [],
          [],
          'Test Game URI',
          ethers.constants.AddressZero
        )
      ).to.be.revertedWith('not enough fund');
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
    it('allows GAME owner to set GAME URI', async function () {
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      await expect(
        users[1].GameMinter.setTokenUri(
          users[1].address,
          gameId1,
          'Updating URI',
          ethers.constants.AddressZero
        )
      )
        .to.emit(gameTokenContract, 'TokenURIChanged')
        .withArgs(gameId1, 'Updating URI');

      const balancesAfter = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameModificationFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameModificationFee)
      );
    });
    it('allows GAME editor to set GAME URI', async function () {
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[8].address,
        gameTokenFeeBeneficiary
      );

      await expect(
        users[8].GameMinter.setTokenUri(
          users[8].address,
          gameId1,
          'Updating URI Again ...',
          ethers.constants.AddressZero
        )
      )
        .to.emit(gameTokenContract, 'TokenURIChanged')
        .withArgs(gameId1, 'Updating URI Again ...');

      const balancesAfter = await getTokenBalances(
        sandContract,
        users[8].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameModificationFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameModificationFee)
      );
    });
  });
  // describe('GameMinter: MetaTXs', function () {}); TODO
});
