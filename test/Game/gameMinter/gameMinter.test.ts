import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import {BigNumber, Contract, BytesLike, utils} from 'ethers';
import Prando from 'prando';
import {expect} from '../../chai-setup';
import {expectEventWithArgs} from '../../utils';
import {Address} from 'hardhat-deploy/types';
import {supplyAssets} from '../assets';
import {toUtf8Bytes} from 'ethers/lib/utils';
import {gameMintingFee, gameUpdateFee} from '../../../data/gameMinterFees';

const rng = new Prando('GameMinter');

type Update = {
  assetIdsToRemove: BigNumber[];
  assetAmountsToRemove: number[];
  assetIdsToAdd: BigNumber[];
  assetAmountsToAdd: number[];
  uri: BytesLike;
};

const update: Update = {
  assetIdsToRemove: [],
  assetAmountsToRemove: [],
  assetIdsToAdd: [],
  assetAmountsToAdd: [],
  uri: utils.keccak256(ethers.utils.toUtf8Bytes('')),
};

async function getRandom(): Promise<number> {
  return rng.nextInt(1, 1000000000);
}

async function getURI(string: string): Promise<string> {
  return utils.keccak256(toUtf8Bytes(string));
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
  // @note valid calls to minter can be 1 of 6 types:
  // - direct calls from either gameOwner or gameEditor
  // - Sandbox-style metaTXs on behalf of either gameOwner or gameEditor
  // - ERC2771-style metaTXs on behalf of either gameOwner or gameEditor
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

      assets = await supplyAssets(users[1].address, [77, 3, 14]);

      editorAssets = await supplyAssets(users[8].address, [11]);
    });

    it('should fail with incorrect "from" address', async function () {
      await expect(
        users[0].GameMinter.createGame(
          users[1].address,
          users[1].address,
          {...update, uri: await getURI('Test Game URI')},
          ethers.constants.AddressZero,
          await getRandom()
        )
      ).to.be.revertedWith('CREATE_ACCESS_DENIED');
    });

    it('should fail to create GAME if user has insufficient SAND', async function () {
      await expect(
        users[2].GameMinter.createGame(
          users[2].address,
          users[2].address,
          {...update, uri: await getURI('Test Game URI')},
          ethers.constants.AddressZero,
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
        {...update, uri: await getURI('Test Game URI')},
        users[8].address,
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

    // assetIdsToRemove
    // assetAmountsToRemove
    // assetIdsToAdd
    // assetAmountsToAdd

    it('should allow owner to add assets', async function () {
      const receipt = await users[1].GameMinter.updateGame(
        users[1].address,
        gameId1,
        {
          ...update,
          assetIdsToAdd: [assets[0], assets[1]],
          assetAmountsToAdd: [77, 3],
          uri: await getURI('Updated URI with Assets!'),
        },
        ethers.constants.AddressZero
      );
      const updateEvent = await expectEventWithArgs(
        gameTokenContract,
        receipt,
        'GameTokenUpdated'
      );
      const oldId = updateEvent.args[0];
      const newId = updateEvent.args[1];
      const updateArgs = updateEvent.args[2];
      expect(oldId).to.be.equal(gameId1);
      expect(newId).to.be.equal(gameId1.add(1));
      expect(updateArgs[0]).to.deep.equal([]);
      expect(updateArgs[1]).to.deep.equal([]);
      expect(updateArgs[2]).to.deep.equal([assets[0], assets[1]]);
      expect(updateArgs[3][0]).to.deep.equal(77);
      expect(updateArgs[3][1]).to.deep.equal(3);
      expect(updateArgs[4]).to.be.equal(
        await getURI('Updated URI with Assets!')
      );
    });

    it('should charge a fee when owner adds assets', async function () {
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      await users[1].GameMinter.updateGame(
        users[1].address,
        gameId1,
        {
          ...update,
          assetIdsToAdd: [assets[2]],
          assetAmountsToAdd: [14],
          uri: await getURI('Updated URI with Assets!'),
        },
        ethers.constants.AddressZero
      );

      const balancesAfter = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameUpdateFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameUpdateFee)
      );
    });

    it('should allow editor to add assets', async function () {
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[8].address,
        gameTokenFeeBeneficiary
      );

      await expect(
        users[8].GameMinter.updateGame(
          users[8].address,
          gameId1,
          {
            ...update,
            assetIdsToAdd: editorAssets,
            assetAmountsToAdd: [11],
            uri: await getURI('Updated URI with Assets!'),
          },
          users[8].address
        )
      )
        .to.emit(gameTokenContract, 'AssetsAdded')
        .withArgs(gameId1, editorAssets, [11]);

      const balancesAfter = await getTokenBalances(
        sandContract,
        users[8].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameUpdateFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameUpdateFee)
      );
    });

    it('should allow owner to remove assets', async function () {
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      await expect(
        users[1].GameMinter.updateGame(
          users[1].address,
          gameId1,
          {
            ...update,
            assetIdsToRemove: [assets[1]],
            assetAmountsToRemove: [3],
            uri: await getURI('Updated URI when removing Assets'),
          },
          ethers.constants.AddressZero
        )
      )
        .to.emit(gameTokenContract, 'AssetsRemoved')
        .withArgs(gameId1, {
          ...update,
          assetIdsToRemove: [assets[1]],
          assetAmountsToRemove: [3],
          uri: await getURI('Updated URI when removing Assets'),
        });

      const balancesAfter = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameUpdateFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameUpdateFee)
      );
    });

    it('should allow editor to remove assets', async function () {
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[8].address,
        gameTokenFeeBeneficiary
      );

      await expect(
        users[8].GameMinter.updateGame(
          users[8].address,
          gameId1,
          {
            ...update,
            assetIdsToRemove: [assets[0]],
            assetAmountsToRemove: [3],
            uri: await getURI('Updated URI when editor removing Assets'),
          },
          ethers.constants.AddressZero
        )
      )
        .to.emit(gameTokenContract, 'AssetsRemoved')
        .withArgs(gameId1, {
          ...update,
          assetIdsToRemove: [assets[0]],
          assetAmountsToRemove: [3],
          uri: await getURI('Updated URI when editor removing Assets'),
        });

      const balancesAfter = await getTokenBalances(
        sandContract,
        users[8].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameUpdateFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameUpdateFee)
      );
    });

    it('should fail if not authorized to add assets', async function () {
      await expect(
        users[0].GameMinter.updateGame(
          users[1].address,
          gameId1,
          {...update},
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
        users[2].GameMinter.updateGame(
          users[2].address,
          gameId1,
          {...update},
          ethers.constants.AddressZero
        )
      ).to.be.revertedWith('not enough fund');
    });

    it('should fail if not authorized to remove assets', async function () {
      await expect(
        users[0].GameMinter.updateGame(
          users[1].address,
          gameId1,
          {...update},
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
        balancesBefore[0].sub(gameUpdateFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameUpdateFee)
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
        balancesBefore[0].sub(gameUpdateFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameUpdateFee)
      );
    });
  });
  describe('GameMinter: Sandbox MetaTXs', function () {
    let sandAsExecutionAdmin: Contract;
    let sandAsExecutionOperator: Contract;
    let gameId2: BigNumber;
    let users: User[];
    let GameMinter: Contract;
    let sandContract: Contract;
    let sandAsAdmin: Contract;
    let gameTokenContract: Contract;
    let assets: BigNumber[];
    let quantities: number[];
    let editorAssets: BigNumber[];
    let gameTokenFeeBeneficiary: Address;

    before(async function () {
      ({GameMinter, users} = await setupTest());
      const {
        sandExecutionAdmin,
        sandAdmin,
        gameTokenAdmin,
      } = await getNamedAccounts();
      sandContract = await ethers.getContract('Sand');
      sandAsExecutionAdmin = await sandContract.connect(
        ethers.provider.getSigner(sandExecutionAdmin)
      );

      sandAsExecutionOperator = await sandContract.connect(
        ethers.provider.getSigner(users[6].address)
      );
      await sandAsExecutionAdmin.setExecutionOperator(users[6].address, true);
      gameTokenContract = await ethers.getContract('GameToken');
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

      assets = await supplyAssets(users[1].address, [42, 3]);
      editorAssets = await supplyAssets(users[8].address, [5]);
    });

    it('should allow anyone to create a game via MetaTx', async function () {
      const gas = 1000000;

      const balancesBefore = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );
      const gamesBefore = await gameTokenContract.balanceOf(users[1].address);

      const {data} = await GameMinter.populateTransaction.createGame(
        users[1].address,
        users[1].address,
        {...update, uri: await getURI('Sandbox MetaTx URI')},
        users[8].address,
        await getRandom()
      );

      const receipt = await sandAsExecutionOperator.executeWithSpecificGas(
        GameMinter.address,
        gas,
        data
      );

      const event = await expectEventWithArgs(
        gameTokenContract,
        receipt,
        'Transfer'
      );
      gameId2 = event.args[2];
      const balancesAfter = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      const gamesAfter = await gameTokenContract.balanceOf(users[1].address);

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameMintingFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameMintingFee)
      );
      expect(gamesAfter).to.be.equal(gamesBefore.add(1));
    });

    it('should allow GAME Owner to add assets via MetaTx', async function () {
      const gas = 1000000;
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      const {data} = await GameMinter.populateTransaction.updateGame(
        users[1].address,
        gameId2,
        {
          ...update,
          assetIdsTOAdd: assets,
          assetAmountsToAdd: [42, 3],
          uri: await getURI('Sandbox MetaTx URI'),
        },
        ethers.constants.AddressZero
      );

      const receipt = await sandAsExecutionOperator.executeWithSpecificGas(
        GameMinter.address,
        gas,
        data
      );
      const event = await expectEventWithArgs(
        gameTokenContract,
        receipt,
        'AssetsAdded'
      );
      const balancesAfter = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameUpdateFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameUpdateFee)
      );
      expect(event.args[0]).to.be.equal(gameId2);
      expect(event.args[1]).to.deep.equal(assets);
      expect(event.args[2]).to.deep.equal([42, 3]);
    });

    it('should allow GAME Owner to remove assets via MetaTx', async function () {
      const gas = 1000000;

      const balancesBefore = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      const {data} = await GameMinter.populateTransaction.updateGame(
        users[1].address,
        gameId2,
        {
          ...update,
          assetIdsToRemove: [assets[0]],
          assetAmountsToRemove: [42],
          uri: await getURI('Sandbox MetaTx URI'),
        },
        users[1].address,
        ethers.constants.AddressZero
      );

      const receipt = await sandAsExecutionOperator.executeWithSpecificGas(
        GameMinter.address,
        gas,
        data
      );
      const event = await expectEventWithArgs(
        gameTokenContract,
        receipt,
        'AssetsRemoved'
      );
      const balancesAfter = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );

      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameUpdateFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameUpdateFee)
      );
      expect(event.args[0]).to.be.equal(gameId2);
      expect(event.args[1]).to.deep.equal([assets[0]]);
      expect(event.args[2]).to.deep.equal([quantities[0]]);
      expect(event.args[3]).to.be.equal(users[1].address);
    });

    it('should allow GAME Owner to set URI via MetaTx', async function () {
      const gas = 1000000;
      const balancesBefore = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );
      const {data} = await GameMinter.populateTransaction.setTokenUri(
        users[1].address,
        gameId2,
        'Sandbox MetaTx change URI',
        ethers.constants.AddressZero
      );
      const receipt = await sandAsExecutionOperator.executeWithSpecificGas(
        GameMinter.address,
        gas,
        data
      );
      const event = await expectEventWithArgs(
        gameTokenContract,
        receipt,
        'TokenURIChanged'
      );
      const balancesAfter = await getTokenBalances(
        sandContract,
        users[1].address,
        gameTokenFeeBeneficiary
      );
      const newURI = await gameTokenContract.tokenURI(gameId2);

      expect(newURI).to.be.equal('Sandbox MetaTx change URI');
      expect(event.args[0]).to.be.equal(gameId2);
      expect(event.args[1]).to.be.equal('Sandbox MetaTx change URI');
      expect(balancesAfter[0]).to.be.equal(
        balancesBefore[0].sub(gameUpdateFee)
      );
      expect(balancesAfter[1]).to.be.equal(
        balancesBefore[1].add(gameUpdateFee)
      );
    });

    it.skip('MetaTx should fail with wrong "editor" address', async function () {
      const gas = 1000000;
      const {data} = await GameMinter.populateTransaction.updateGame(
        users[1].address,
        gameId2,
        assets,
        quantities,
        'Sandbox MetaTx URI',
        users[9].address
      );

      const assetsBefore = await gameTokenContract.getAssetBalances(gameId2, [
        assets[0],
        assets[1],
      ]);

      const receipt = await sandAsExecutionOperator.executeWithSpecificGas(
        GameMinter.address,
        gas,
        data
      );
      const events = await expectEventWithArgs(
        gameTokenContract,
        receipt,
        'AssetsAdded'
      );
      // @note The revert message is maybe not surfacing... try to test failure another way, ie: via lack of events && no GAME state changes
      const assetsAfter = await gameTokenContract.getAssetBalances(gameId2, [
        assets[0],
        assets[1],
      ]);
      expect(events.args.length).to.be.equal(0);
      expect(assetsAfter).to.deep.equal(assetsBefore);
    });

    it('should allow GAME Editor to add assets via MetaTx', async function () {});

    it('should allow GAME Editor to remove assets via MetaTx', async function () {});

    it('should allow GAME Editor to set URI via MetaTx', async function () {});
  });
});
