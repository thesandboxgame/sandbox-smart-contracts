import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot} from '../utils';
import {BigNumber, BigNumberish, ContractReceipt} from 'ethers';
import {expect} from '../chai-setup';

export const setupEstate = withSnapshot(
  [
    'MockLandWithMint',
    'PolygonAsset',
    'ChildGameToken',
    'GameMinter',
    'PolygonEstateToken',
    'PolygonSand',
  ],
  async () => {
    const {
      estateTokenFeeBeneficiary,
      sandBeneficiary,
      experienceTokenFeeBeneficiary,
    } = await getNamedAccounts();

    // Game minter use Sand and we need Polygon Sand!!!
    const others = await getUnnamedAccounts();
    const minter = others[4];
    const user0 = others[0];
    const user1 = others[1];

    const experienceToken = await ethers.getContract('ChildGameToken');
    const experienceMinter = await ethers.getContract('GameMinter');
    const estateContract = await ethers.getContract('EstateToken');
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
      estateContract,
      landContract,
      landContractAsMinter,
      landContractAsUser0,
      experienceTokenFeeBeneficiary,
      minter,
      user0,
      user1,
      experienceToken,
      experienceMinter,
      estateTokenFeeBeneficiary,
    };
  }
);

async function setupEstateAndLand(isLayer1: boolean) {
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
    contract: isLayer1 ? 'Land' : 'PolygonLandV1',
    //why land instead of MockLandWithMint?
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      execute: {
        methodName: 'initialize',
        args: isLayer1 ? [trustedForwarder, landAdmin] : [trustedForwarder],
      },
    },
  });
  const landContract = await ethers.getContract('Land', deployer);
  const landContractAsAdmin = await ethers.getContract('Land', landAdmin);
  const landContractAsMinter = await ethers.getContract('Land', landMinter);
  const landContractAsOther = await ethers.getContract('Land', other);
  if (isLayer1) {
    await landContractAsAdmin.setMinter(landMinter, true);
  } else {
    await landContract.setPolygonLandTunnel(landMinter);
  }

  // Estate
  const chainIndex = 100;
  const mapLib = await deployments.deploy('MapLib', {from: deployer});
  await deployments.deploy('Estate', {
    from: deployer,
    contract: isLayer1 ? 'EstateTokenV1' : 'PolygonEstateTokenV1',
    libraries: {
      MapLib: mapLib.address,
    },
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initV1',
        args: [
          trustedForwarder,
          estateTokenAdmin,
          landContract.address,
          chainIndex,
        ],
      },
    },
  });
  const estateContractAsAdmin = await ethers.getContract(
    'Estate',
    estateTokenAdmin
  );
  const estateContractAsMinter = await ethers.getContract(
    'Estate',
    estateMinter
  );
  const estateContractAsOther = await ethers.getContract('Estate', other);
  const minterRole = await estateContractAsAdmin.MINTER_ROLE();
  await estateContractAsAdmin.grantRole(minterRole, estateMinter);
  // On layer 2 the estate contract has a special remover role
  if (estateContractAsAdmin.REMOVER_ROLE) {
    const removerRole = await estateContractAsAdmin.REMOVER_ROLE();
    await estateContractAsAdmin.grantRole(removerRole, other);
  }
  // Estate tunnel
  await deployments.deploy('MockEstateTunnel', {
    from: deployer,
    args: [
      checkpointManager,
      fxRoot,
      estateContractAsMinter.address,
      trustedForwarder,
    ],
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
    estateContractAsMinter,
    estateContractAsOther,
    upgradeAdmin,
    trustedForwarder,
    landAdmin,
    landMinter,
    estateTokenAdmin,
    estateMinter,
    estateTunnel,
    other,
    GRID_SIZE,
    mapLib,
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
      if (isLayer1) {
        await landContractAsMinter.mintQuad(to, size, x, y, []);
      } else {
        await landContractAsMinter.mint(to, size, x, y, []);
      }
      const quadId = getId(size, x, y);
      if (isLayer1) {
        expect(await landContractAsMinter._owners(quadId)).to.be.equal(other);
      } else {
        // don't work on L2 anymore
        // expect(await landContractAsMinter.ownerOf(quadId)).to.be.equal(other);
      }
      return quadId;
    },
    createEstate: async (data?: {
      sizes: BigNumberish[];
      xs: BigNumberish[];
      ys: BigNumberish[];
    }): Promise<{estateId: BigNumber; gasUsed: BigNumber}> => {
      const tx = await estateContractAsOther.create(
        data ? [data.sizes, data.xs, data.ys] : [[], [], []],
        ethers.utils.formatBytes32String('uri ???')
      );
      const receipt: ContractReceipt = await tx.wait();
      const estateCreationEvents = receipt.events?.filter(
        (e) => e.event === 'EstateTokenCreated'
      );
      const estateId =
        estateCreationEvents &&
        estateCreationEvents.length > 0 &&
        estateCreationEvents[0].args &&
        estateCreationEvents[0].args[0];
      return {
        estateId: BigNumber.from(estateId),
        gasUsed: BigNumber.from(receipt.gasUsed),
      };
    },
    updateEstate: async (
      estateId: BigNumberish,
      landToAdd?: {
        sizes: BigNumberish[];
        xs: BigNumberish[];
        ys: BigNumberish[];
      },
      landToRemove?: {
        sizes: BigNumberish[];
        xs: BigNumberish[];
        ys: BigNumberish[];
      }
    ): Promise<{estateId: BigNumber; gasUsed: BigNumber}> => {
      const tx = await estateContractAsOther.update(
        estateId,
        landToAdd
          ? [landToAdd.sizes, landToAdd.xs, landToAdd.ys]
          : [[], [], []],
        landToRemove
          ? [landToRemove.sizes, landToRemove.xs, landToRemove.ys]
          : [[], [], []]
      );
      const receipt: ContractReceipt = await tx.wait();
      const estateCreationEvents = receipt.events?.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      const updateEstateId =
        estateCreationEvents &&
        estateCreationEvents.length > 0 &&
        estateCreationEvents[0].args &&
        estateCreationEvents[0].args[0];
      return {
        estateId: BigNumber.from(updateEstateId),
        gasUsed: BigNumber.from(receipt.gasUsed),
      };
    },
  };
}

export const setupL1EstateAndLand = withSnapshot([], async () => {
  return await setupEstateAndLand(true);
});

export const setupL2EstateAndLand = withSnapshot([], async () => {
  return await setupEstateAndLand(false);
});

export const setupL2EstateExperienceAndLand = withSnapshot([], async () => {
  const setup = await setupEstateAndLand(false);
  const {deployer} = await getNamedAccounts();
  // Fake Game
  await deployments.deploy('MockExperience', {
    from: deployer,
    args: [],
  });
  const experienceContract = await ethers.getContract(
    'MockExperience',
    deployer
  );
  const experienceContractAsOther = await ethers.getContract(
    'MockExperience',
    setup.other
  );

  //Registry
  await deployments.deploy('ExperienceEstateRegistry', {
    from: deployer,
    contract: 'ExperienceEstateRegistry',
    libraries: {
      MapLib: setup.mapLib.address,
    },
    args: [
      setup.estateContractAsMinter.address,
      experienceContract.address,
      setup.landContract.address,
    ],
  });
  const registryContract = await ethers.getContract(
    'ExperienceEstateRegistry',
    deployer
  );
  const registryContractAsOther = await ethers.getContract(
    'ExperienceEstateRegistry',
    setup.other
  );
  return {
    registryContract,
    registryContractAsOther,
    experienceContract,
    experienceContractAsOther,
    ...setup,
    createEstate: async (data?: {
      sizes: BigNumberish[];
      xs: BigNumberish[];
      ys: BigNumberish[];
    }): Promise<{estateId: BigNumber; gasUsed: BigNumber}> => {
      const metadata = ethers.utils.formatBytes32String('uri ???');
      const lands = data ? [data.sizes, data.xs, data.ys] : [[], [], []];
      const tx = await setup.estateContractAsOther.create(lands, metadata);
      const receipt: ContractReceipt = await tx.wait();
      const estateCreationEvents = receipt.events?.filter(
        (e) => e.event === 'EstateTokenCreated'
      );
      const estateId =
        estateCreationEvents &&
        estateCreationEvents.length > 0 &&
        estateCreationEvents[0].args &&
        estateCreationEvents[0].args[0];
      return {
        estateId: BigNumber.from(estateId),
        gasUsed: BigNumber.from(receipt.gasUsed),
      };
    },
    updateEstate: async (data: {
      estateId: BigNumberish;
      landToAdd?: {
        sizes: BigNumberish[];
        xs: BigNumberish[];
        ys: BigNumberish[];
      };
      landToRemove?: {
        sizes: BigNumberish[];
        xs: BigNumberish[];
        ys: BigNumberish[];
      };
    }): Promise<{updateEstateId: BigNumber; updateGasUsed: BigNumber}> => {
      const tx = await setup.estateContractAsOther.update(
        data.estateId,
        data.landToAdd
          ? [data.landToAdd.sizes, data.landToAdd.xs, data.landToAdd.ys]
          : [[], [], []],
        data.landToRemove
          ? [
              data.landToRemove.sizes,
              data.landToRemove.xs,
              data.landToRemove.ys,
            ]
          : [[], [], []]
      );
      const receipt: ContractReceipt = await tx.wait();
      const estateCreationEvents = receipt.events?.filter(
        (e) => e.event === 'EstateTokenUpdated'
      );
      const estateId =
        estateCreationEvents &&
        estateCreationEvents.length > 0 &&
        estateCreationEvents[0].args &&
        estateCreationEvents[0].args[0];
      return {
        updateEstateId: BigNumber.from(estateId),
        updateGasUsed: BigNumber.from(receipt.gasUsed),
      };
    },
  };
});
