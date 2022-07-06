import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot} from '../utils';
import {BigNumber, BigNumberish, Contract, ContractReceipt} from 'ethers';
import {expect} from '../chai-setup';
import {Event} from '@ethersproject/contracts';

async function setupLand(isLayer1: boolean) {
  const {deployer} = await getNamedAccounts();
  const [
    upgradeAdmin,
    trustedForwarder,
    landAdmin,
    landMinter,
    estateTokenAdmin,
    estateMinter,
    other,
    ...rest
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

  function getId(
    size: BigNumberish,
    x: BigNumberish,
    y: BigNumberish
  ): BigNumber {
    return BigNumber.from(x)
      .add(BigNumber.from(y).mul(GRID_SIZE))
      .add(sizeToLayer[BigNumber.from(size).toNumber()]);
  }

  return {
    deployer,
    upgradeAdmin,
    trustedForwarder,
    landAdmin,
    landMinter,
    estateTokenAdmin,
    estateMinter,
    other,
    getUnnamedAccounts: () => rest,
    landContract,
    landContractAsMinter,
    landContractAsOther,
    landContractAsAdmin,
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
      size: BigNumberish,
      x: BigNumberish,
      y: BigNumberish
    ): Promise<BigNumber> => {
      if (isLayer1) {
        await landContractAsMinter.mintQuad(to, size, x, y, []);
      } else {
        await landContractAsMinter.mint(to, size, x, y, []);
      }
      return getId(size, x, y);
    },
  };
}

async function setupEstateAndLand(isLayer1: boolean) {
  const landSetup = await setupLand(isLayer1);
  const [
    estateTokenAdmin,
    estateMinter,
    checkpointManager,
    fxRoot,
  ] = landSetup.getUnnamedAccounts();

  // Estate
  const chainIndex = 100;
  const mapLib = await deployments.deploy('MapLib', {from: landSetup.deployer});
  const name = isLayer1 ? 'EstateTokenV1' : 'PolygonEstateTokenV1';
  await deployments.deploy('Estate', {
    from: landSetup.deployer,
    contract: name,
    libraries: {
      MapLib: mapLib.address,
    },
    proxy: {
      owner: landSetup.upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initV1',
        args: [
          landSetup.trustedForwarder,
          estateTokenAdmin,
          landSetup.landContract.address,
          chainIndex,
          name,
          isLayer1 ? 'EST' : 'PEST',
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
  const estateContractAsOther = await ethers.getContract(
    'Estate',
    landSetup.other
  );
  const minterRole = await estateContractAsAdmin.MINTER_ROLE();
  await estateContractAsAdmin.grantRole(minterRole, estateMinter);
  // On layer 2 the estate contract has a special remover role
  if (estateContractAsAdmin.REMOVER_ROLE) {
    const removerRole = await estateContractAsAdmin.REMOVER_ROLE();
    await estateContractAsAdmin.grantRole(removerRole, landSetup.other);
  }
  // Estate tunnel
  await deployments.deploy('MockEstateTunnel', {
    from: landSetup.deployer,
    args: [
      checkpointManager,
      fxRoot,
      estateContractAsMinter.address,
      landSetup.trustedForwarder,
    ],
  });
  const estateTunnel = await ethers.getContract(
    'MockEstateTunnel',
    landSetup.deployer
  );

  return {
    estateContractAsAdmin,
    estateContractAsMinter,
    estateContractAsOther,
    estateTunnel,
    mapLib,
    ...landSetup,
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
      size: BigNumberish,
      x: BigNumberish,
      y: BigNumberish
    ): Promise<BigNumber> => {
      if (isLayer1) {
        await landSetup.landContractAsMinter.mintQuad(to, size, x, y, []);
      } else {
        await landSetup.landContractAsMinter.mint(to, size, x, y, []);
      }
      const quadId = landSetup.getId(size, x, y);
      if (isLayer1) {
        expect(
          await landSetup.landContractAsMinter._owners(quadId)
        ).to.be.equal(landSetup.other);
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
        data ? [data.sizes, data.xs, data.ys] : [[], [], []]
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
  // Fake Game
  await deployments.deploy('MockExperience', {
    from: setup.deployer,
    args: [],
  });
  const experienceContract = await ethers.getContract(
    'MockExperience',
    setup.deployer
  );
  const experienceContractAsOther = await ethers.getContract(
    'MockExperience',
    setup.other
  );

  //Registry
  await deployments.deploy('ExperienceEstateRegistry', {
    from: setup.deployer,
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
    setup.deployer
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
      const lands = data ? [data.sizes, data.xs, data.ys] : [[], [], []];
      const tx = await setup.estateContractAsOther.create(lands);
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
      oldId: BigNumberish;
      landToAdd?: {
        sizes: BigNumberish[];
        xs: BigNumberish[];
        ys: BigNumberish[];
      };
      expToUnlink?: {
        exps: BigNumberish[];
      };
      landToRemove?: {
        sizes: BigNumberish[];
        xs: BigNumberish[];
        ys: BigNumberish[];
      };
    }): Promise<{updateEstateId: BigNumber; updateGasUsed: BigNumber}> => {
      const tx = await setup.estateContractAsOther.update(
        data.oldId,
        data.landToAdd
          ? [data.landToAdd.sizes, data.landToAdd.xs, data.landToAdd.ys]
          : [[], [], []],
        data.expToUnlink ? [data.expToUnlink.exps] : [],
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
export const setupTestEstateBaseToken = withSnapshot([], async () => {
  const landSetup = await setupLand(true);
  const [defaultAdmin, admin, minter, burner] = landSetup.getUnnamedAccounts();
  const chainIndex = BigNumber.from(1123);
  const name = 'TestEstateBaseToken';
  const symbol = 'TEB';

  const mapLib = await deployments.deploy('MapLib', {from: landSetup.deployer});
  await deployments.deploy('TestEstateBaseToken', {
    from: landSetup.deployer,
    args: [
      landSetup.trustedForwarder,
      defaultAdmin,
      landSetup.landContract.address,
      chainIndex,
      name,
      symbol,
    ],
    libraries: {
      MapLib: mapLib.address,
    },
  });
  const contractAsDeployer = await ethers.getContract(
    'TestEstateBaseToken',
    landSetup.deployer
  );
  const contractAsOther = await ethers.getContract(
    'TestEstateBaseToken',
    landSetup.other
  );
  const contractAsDefaultAdmin = await ethers.getContract(name, defaultAdmin);
  const ADMIN_ROLE = await contractAsDefaultAdmin.ADMIN_ROLE();
  await contractAsDefaultAdmin.grantRole(ADMIN_ROLE, admin);
  const contractAsAdmin = await ethers.getContract(name, admin);
  const MINTER_ROLE = await contractAsDefaultAdmin.MINTER_ROLE();
  await contractAsDefaultAdmin.grantRole(MINTER_ROLE, minter);
  const contractAsMinter = await ethers.getContract(name, minter);
  const BURNER_ROLE = await contractAsDefaultAdmin.BURNER_ROLE();
  await contractAsDefaultAdmin.grantRole(BURNER_ROLE, burner);
  const contractAsBurner = await ethers.getContract(name, burner);

  async function mintQuadAndApprove(
    to: string,
    contract: Contract,
    size: BigNumberish,
    x: BigNumberish,
    y: BigNumberish
  ) {
    const quadId = await landSetup.mintQuad(to, size, x, y);
    await contract.setApprovalForAllFor(to, contractAsOther.address, quadId);
    return quadId;
  }

  return {
    ADMIN_ROLE,
    chainIndex,
    admin,
    minter,
    burner,
    defaultAdmin,
    contractAsDeployer,
    contractAsOther,
    contractAsDefaultAdmin,
    contractAsAdmin,
    contractAsMinter,
    contractAsBurner,
    name,
    symbol,
    ...landSetup,
    mintQuadAndApproveAsOther: async (
      size: BigNumberish,
      x: BigNumberish,
      y: BigNumberish
    ) => {
      return mintQuadAndApprove(
        landSetup.other,
        landSetup.landContractAsOther,
        size,
        x,
        y
      );
    },
    mintQuadAndApprove,
    createEstate: async (
      quads: {
        size: BigNumberish;
        x: BigNumberish;
        y: BigNumberish;
      }[]
    ) => {
      const sizes = [];
      const xs = [];
      const ys = [];
      for (const {size, x, y} of quads) {
        await mintQuadAndApprove(
          landSetup.other,
          landSetup.landContractAsOther,
          size,
          x,
          y
        );
        sizes.push(size);
        xs.push(x);
        ys.push(y);
      }
      const receipt = await (
        await contractAsOther.create([sizes, xs, ys])
      ).wait();
      const events = receipt.events.filter(
        (v: Event) => v.event === 'EstateTokenCreated'
      );
      return BigNumber.from(events[0].args['estateId']);
    },
  };
});
