import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot} from '../utils';
import {BigNumber, BigNumberish, Contract, ContractReceipt} from 'ethers';
import {Event} from '@ethersproject/contracts';

async function setupLand(isLayer1: boolean) {
  const {deployer} = await getNamedAccounts();
  const [
    upgradeAdmin,
    trustedForwarder,
    landAdmin,
    landMinter,
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
  const landContractAsDeployer = await ethers.getContract('Land', deployer);
  const landContractAsAdmin = await ethers.getContract('Land', landAdmin);
  const landContractAsMinter = await ethers.getContract('Land', landMinter);
  const landContractAsOther = await ethers.getContract('Land', other);
  if (isLayer1) {
    await landContractAsAdmin.setMinter(landMinter, true);
  } else {
    await landContractAsDeployer.setMinter(landMinter, true);
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

  async function mintQuad(
    to: string,
    size: BigNumberish,
    x: BigNumberish,
    y: BigNumberish
  ): Promise<BigNumber> {
    await landContractAsMinter.mintQuad(to, size, x, y, []);
    return getId(size, x, y);
  }

  return {
    deployer,
    upgradeAdmin,
    trustedForwarder,
    landAdmin,
    landMinter,
    other,
    getUnnamedAccounts: () => rest,
    landContractAsDeployer,
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
    mintQuad,
  };
}

async function deployEstate(
  contractName: string,
  setup: {
    chainIndex: BigNumberish;
    estateDefaultAdmin: string;
    deployer: string;
    upgradeAdmin: string;
    trustedForwarder: string;
    landContractAsDeployer: Contract;
    mapLibAddress: string;
  }
) {
  await deployments.deploy('Estate', {
    from: setup.deployer,
    contract: contractName,
    libraries: {
      MapLib: setup.mapLibAddress,
    },
    proxy: {
      owner: setup.upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initV1',
        args: [
          setup.trustedForwarder,
          setup.estateDefaultAdmin,
          setup.landContractAsDeployer.address,
          setup.chainIndex,
          contractName,
          'ESTATE',
        ],
      },
    },
  });
}

async function setupEstateAndLand(
  isLayer1: boolean,
  deployFunc: (setup: {
    chainIndex: BigNumberish;
    estateDefaultAdmin: string;
    deployer: string;
    upgradeAdmin: string;
    trustedForwarder: string;
    landContractAsDeployer: Contract;
    mapLibAddress: string;
  }) => Promise<void>
) {
  const setup = await setupLand(isLayer1);
  const chainIndex = BigNumber.from(1243);
  const [
    estateDefaultAdmin,
    estateAdmin,
    estateMinter,
    estateBurner,
    checkpointManager,
    fxRoot,
  ] = setup.getUnnamedAccounts();

  // Estate
  const mapLib = await deployments.deploy('MapLib', {from: setup.deployer});
  await deployFunc({
    chainIndex,
    mapLibAddress: mapLib.address,
    estateDefaultAdmin,
    ...setup,
  });
  const estateContractAsDeployer = await ethers.getContract(
    'Estate',
    setup.deployer
  );
  const estateContractAsDefaultAdmin = await ethers.getContract(
    'Estate',
    estateDefaultAdmin
  );
  const estateContractAsAdmin = await ethers.getContract('Estate', estateAdmin);
  const estateContractAsMinter = await ethers.getContract(
    'Estate',
    estateMinter
  );
  const estateContractAsBurner = await ethers.getContract(
    'Estate',
    estateBurner
  );
  const estateContractAsOther = await ethers.getContract('Estate', setup.other);
  const adminRole = await estateContractAsDefaultAdmin.ADMIN_ROLE();
  await estateContractAsDefaultAdmin.grantRole(adminRole, estateAdmin);

  const minterRole = await estateContractAsDefaultAdmin.MINTER_ROLE();
  await estateContractAsDefaultAdmin.grantRole(minterRole, estateMinter);
  // On layer 2 the estate contract has a special remover role
  const burnerRole = await estateContractAsDefaultAdmin.BURNER_ROLE();
  await estateContractAsDefaultAdmin.grantRole(burnerRole, estateBurner);

  // Estate tunnel
  await deployments.deploy('MockEstateTunnel', {
    from: setup.deployer,
    args: [
      checkpointManager,
      fxRoot,
      estateContractAsMinter.address,
      setup.trustedForwarder,
    ],
  });
  const estateTunnel = await ethers.getContract(
    'MockEstateTunnel',
    setup.deployer
  );

  async function createAndReturnEstateId(
    contract: Contract,
    quads: [BigNumberish[], BigNumberish[], BigNumberish[]]
  ) {
    const receipt = await (await contract.create(quads)).wait();
    const events = receipt.events.filter(
      (v: Event) => v.event === 'EstateTokenCreated'
    );
    return {
      estateId: BigNumber.from(events[0].args['estateId']),
      gasUsed: BigNumber.from(receipt.gasUsed),
    };
  }

  return {
    chainIndex,
    mapLib,
    estateBurner,
    estateMinter,
    estateContractAsDeployer,
    estateContractAsDefaultAdmin,
    estateContractAsAdmin,
    estateContractAsMinter,
    estateContractAsBurner,
    estateContractAsOther,
    estateTunnel,
    estateDefaultAdmin,
    estateAdmin,
    ...setup,
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
    mintApproveAndCreateAsOther: async (
      size: BigNumberish,
      x: BigNumberish,
      y: BigNumberish
    ) => {
      await setup.mintQuad(setup.other, size, x, y);
      await setup.landContractAsOther.setApprovalForAll(
        estateContractAsOther.address,
        true
      );
      return createAndReturnEstateId(estateContractAsOther, [[size], [x], [y]]);
    },
    createEstateAsOther: async (data: {
      sizes: BigNumberish[];
      xs: BigNumberish[];
      ys: BigNumberish[];
    }): Promise<{estateId: BigNumber; gasUsed: BigNumber}> => {
      return createAndReturnEstateId(estateContractAsOther, [
        data.sizes,
        data.xs,
        data.ys,
      ]);
    },
    updateEstateAsOther: async (
      oldId: BigNumberish,
      landToAdd?: {
        sizes: BigNumberish[];
        xs: BigNumberish[];
        ys: BigNumberish[];
      },
      landToRemove?: {
        sizes: BigNumberish[];
        xs: BigNumberish[];
        ys: BigNumberish[];
      },
      expToUnlink?: {
        exps: BigNumberish[];
      }
    ): Promise<{updateEstateId: BigNumber; updateGasUsed: BigNumber}> => {
      const a1 = landToAdd
        ? [landToAdd.sizes, landToAdd.xs, landToAdd.ys]
        : [[], [], []];
      const a2 = expToUnlink ? expToUnlink.exps : [];
      const a3 = landToRemove
        ? [landToRemove.sizes, landToRemove.xs, landToRemove.ys]
        : [[], [], []];
      const args = isLayer1 ? [oldId, a1, a3] : [oldId, a1, a2, a3];
      const tx = await estateContractAsOther.update(...args);
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
}

export const setupL1EstateAndLand = withSnapshot([], async () => {
  return await setupEstateAndLand(true, (setup) =>
    deployEstate('EstateTokenV1', setup)
  );
});

export const setupL2EstateAndLand = withSnapshot([], async () => {
  return await setupEstateAndLand(false, (setup) =>
    deployEstate('PolygonEstateTokenV1', setup)
  );
});

export const setupL2EstateExperienceAndLand = withSnapshot([], async () => {
  const setup = await setupEstateAndLand(false, (s) =>
    deployEstate('PolygonEstateTokenV1', s)
  );
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
      setup.landContractAsDeployer.address,
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
  // Set the registry in the estate contract.
  await setup.estateContractAsAdmin.setRegistry(
    registryContractAsOther.address
  );
  return {
    registryContract,
    registryContractAsOther,
    experienceContract,
    experienceContractAsOther,
    ...setup,
  };
});

export const setupTestEstateBaseToken = withSnapshot([], async () => {
  const name = 'TestEstateBaseToken';
  const symbol = 'TEB';
  const setup = await setupEstateAndLand(true, async (s) => {
    await deployments.deploy('Estate', {
      from: s.deployer,
      contract: name,
      args: [
        s.trustedForwarder,
        s.estateDefaultAdmin,
        s.landContractAsDeployer.address,
        s.chainIndex,
        name,
        symbol,
      ],
      libraries: {
        MapLib: s.mapLibAddress,
      },
    });
  });
  return {
    name,
    symbol,
    ...setup,
  };
});
