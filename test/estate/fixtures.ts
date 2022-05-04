import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot} from '../utils';
import {BigNumber, BigNumberish, Contract, ContractReceipt} from 'ethers';
import {expect} from '../chai-setup';

export const setupEstate = withSnapshot(
  [
    'MockLandWithMint',
    'PolygonAsset',
    'ChildGameToken',
    'GameMinter',
    'PolygonEstateToken',
    'PolygonEstateMinter',
    'PolygonSand',
  ],
  async () => {
    const {
      estateTokenFeeBeneficiary,
      sandBeneficiary,
      gameTokenFeeBeneficiary,
    } = await getNamedAccounts();

    // Game minter use Sand and we need Polygon Sand!!!
    const others = await getUnnamedAccounts();
    const minter = others[4];
    const user0 = others[0];
    const user1 = others[1];

    const gameToken = await ethers.getContract('ChildGameToken');
    const gameMinter = await ethers.getContract('GameMinter');
    const estateContract = await ethers.getContract('EstateToken');
    const estateMinter = await ethers.getContract('EstateMinter');
    const estateMinterContract = await ethers.getContract('EstateMinter');
    const landContract = await ethers.getContract('MockLandWithMint');
    const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
    // to be able to call deposit on sand with FakeChildChainManager
    const polygonSand = await ethers.getContract('PolygonSand');
    await childChainManager.setPolygonAsset(polygonSand.address);
    // GAME MINTER USE REGULAR Sand
    const sandContractAsUser0 = await ethers.getContract('Sand', user0);
    const sandContractAsBeneficiary = await ethers.getContract(
      'Sand',
      sandBeneficiary
    );
    const landContractAsUser0 = await landContract.connect(
      ethers.provider.getSigner(user0)
    );
    const landContractAsMinter = await landContract.connect(
      ethers.provider.getSigner(minter)
    );

    return {
      sandContractAsUser0,
      sandContractAsBeneficiary,
      polygonSand,
      childChainManager,
      estateMinter,
      estateContract,
      estateMinterContract,
      landContract,
      landContractAsMinter,
      landContractAsUser0,
      gameTokenFeeBeneficiary,
      minter,
      user0,
      user1,
      gameToken,
      gameMinter,
      estateTokenFeeBeneficiary,
    };
  }
);

async function setupEstateAndLand(gameContract?: Contract) {
  const {deployer} = await getNamedAccounts();
  const [
    upgradeAdmin,
    trustedForwarder,
    landAdmin,
    landMinter,
    estateTokenAdmin,
    estateMinter,
    checkpointManager,
    fxRoot,
    other,
  ] = await getUnnamedAccounts();
  // Land
  await deployments.deploy('Land', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      execute: {
        methodName: 'initialize',
        args: [trustedForwarder, landAdmin],
      },
    },
  });
  const landContract = await ethers.getContract('Land', deployer);
  const landContractAsAdmin = await ethers.getContract('Land', landAdmin);
  const landContractAsMinter = await ethers.getContract('Land', landMinter);
  await landContractAsAdmin.setMinter(landMinter, true);
  const landContractAsOther = await ethers.getContract('Land', other);

  // Estate
  const chainIndex = 100;
  let args, contract;
  if (gameContract) {
    contract = 'PolygonEstateTokenV1';
    args = [
      trustedForwarder,
      estateTokenAdmin,
      landContract.address,
      gameContract.address,
      chainIndex,
    ];
  } else {
    contract = 'EstateTokenV1';
    args = [
      trustedForwarder,
      estateTokenAdmin,
      landContract.address,
      chainIndex,
    ];
  }
  console.log(args.length);
  await deployments.deploy('Estate', {
    from: deployer,
    contract,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initV1',
        args,
      },
    },
  });
  const estateContractAsAdmin = await ethers.getContract(
    'Estate',
    estateTokenAdmin
  );
  const estateContract = await ethers.getContract('Estate', estateMinter);
  await estateContractAsAdmin.changeMinter(estateMinter);

  // Estate tunnel
  await deployments.deploy('MockEstateTunnel', {
    from: deployer,
    args: [checkpointManager, fxRoot, estateContract.address, trustedForwarder],
  });
  const estateTunnel = await ethers.getContract('MockEstateTunnel', deployer);

  const GRID_SIZE = 408;
  const sizeToLayer: {[k: number]: BigNumber} = {
    1: BigNumber.from(0),
    3: BigNumber.from(
      '0x0100000000000000000000000000000000000000000000000000000000000000'
    ),
    6: BigNumber.from(
      '0x0200000000000000000000000000000000000000000000000000000000000000'
    ),
    12: BigNumber.from(
      '0x0300000000000000000000000000000000000000000000000000000000000000'
    ),
    24: BigNumber.from(
      '0x0400000000000000000000000000000000000000000000000000000000000000'
    ),
  };

  function getId(size: number, x: BigNumberish, y: BigNumberish): BigNumber {
    return BigNumber.from(x)
      .add(BigNumber.from(y).mul(GRID_SIZE))
      .add(sizeToLayer[size]);
  }

  return {
    landContract,
    landContractAsMinter,
    landContractAsOther,
    landContractAsAdmin,
    estateContractAsAdmin,
    estateContract,
    upgradeAdmin,
    trustedForwarder,
    landAdmin,
    landMinter,
    estateTokenAdmin,
    estateMinter,
    estateTunnel,
    other,
    GRID_SIZE,
    getId,
    getXsYsSizes: (x0: number, y0: number, size: number) => {
      const xs = [];
      const ys = [];
      const sizes = [];
      for (let x = 0; x < Math.floor(24 / size); x++) {
        for (let y = 0; y < Math.floor(24 / size); y++) {
          xs.push(x0 + x * size);
          ys.push(y0 + y * size);
          sizes.push(size);
        }
      }
      return {xs, ys, sizes};
    },
    mintQuad: async (
      to: string,
      size: number,
      x: BigNumberish,
      y: BigNumberish
    ): Promise<BigNumber> => {
      await landContractAsMinter.mintQuad(to, size, x, y, []);
      const quadId = getId(size, x, y);
      expect(await landContractAsMinter._owners(quadId)).to.be.equal(other);
      return quadId;
    },
    createEstate: async (
      sizes: BigNumberish[],
      xs: BigNumberish[],
      ys: BigNumberish[]
    ): Promise<{estateId: BigNumber; gasUsed: BigNumber}> => {
      const tx = await estateContract.createEstate(
        other,
        {
          quadTuple: [sizes, xs, ys],
          tiles: [],
          uri: ethers.utils.formatBytes32String('uri ???'),
        },
        []
      );
      const receipt: ContractReceipt = await tx.wait();
      const estateCreationEvents = receipt.events?.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      const estateId =
        estateCreationEvents &&
        estateCreationEvents.length > 0 &&
        estateCreationEvents[0].args &&
        estateCreationEvents[0].args[1];
      return {
        estateId: BigNumber.from(estateId),
        gasUsed: BigNumber.from(receipt.gasUsed),
      };
    },
    createEstateWithGame: async (data: {
      freelandQuads: {
        sizes: BigNumberish[];
        xs: BigNumberish[];
        ys: BigNumberish[];
      };
      games?: {
        gameId: BigNumberish;
        quadsToAdd?: {
          sizes: BigNumberish[];
          xs: BigNumberish[];
          ys: BigNumberish[];
        };
        quadsToUse?: {
          sizes: BigNumberish[];
          xs: BigNumberish[];
          ys: BigNumberish[];
        };
      }[];
    }): Promise<{estateId: BigNumber; gasUsed: BigNumber}> => {
      const landAndGameAssociations = data.games
        ? data.games.map((x) => ({
            gameId: x.gameId,
            quadTupleToAdd: x.quadsToAdd
              ? [x.quadsToAdd.sizes, x.quadsToAdd.xs, x.quadsToAdd.ys]
              : [],
            quadTupleToUse: x.quadsToUse
              ? [x.quadsToUse.sizes, x.quadsToUse.xs, x.quadsToUse.ys]
              : [],
            tilesToUse: [],
          }))
        : [];
      //   uint256 gameId;
      // uint256[][3] quadTupleToAdd; //(size, x, y) transfer when adding
      // uint256[][3] quadTupleToUse; //(size, x, y) take from free-lands
      // TileWithCoordLib.TileWithCoord[] tilesToUse;
      const tx = await estateContract.createEstateWithGame(
        other,
        {
          landAndGameAssociations,
          estateData: {
            quadTuple: [
              data.freelandQuads.sizes,
              data.freelandQuads.xs,
              data.freelandQuads.ys,
            ],
            tiles: [],
            uri: ethers.utils.formatBytes32String('uri ???'),
          },
        },
        []
      );
      const receipt: ContractReceipt = await tx.wait();
      const estateCreationEvents = receipt.events?.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      const estateId =
        estateCreationEvents &&
        estateCreationEvents.length > 0 &&
        estateCreationEvents[0].args &&
        estateCreationEvents[0].args[1];
      return {
        estateId: BigNumber.from(estateId),
        gasUsed: BigNumber.from(receipt.gasUsed),
      };
    },
  };
}

export const setupL1EstateAndLand = withSnapshot([], async () =>
  setupEstateAndLand()
);
export const setupL2EstateGameAndLand = withSnapshot([], async () => {
  const {deployer} = await getNamedAccounts();
  // Fake Game
  await deployments.deploy('ERC721Mintable', {
    from: deployer,
    args: ['FAKEGAME', 'FAKEGAME'],
  });
  const gameContract = await ethers.getContract('ERC721Mintable', deployer);
  const data = await setupEstateAndLand(gameContract);
  const gameContractAsOther = await ethers.getContract(
    'ERC721Mintable',
    data.other
  );
  return {gameContract, gameContractAsOther, ...data};
});
