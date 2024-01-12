import {Signer} from 'ethers';
import {ethers} from 'hardhat';

export type TesteableContracts = 'LandV3' | 'PolygonLandV2';

export async function deploy(
  name: string,
  users: Signer[] = [],
  ...args: unknown[]
): Promise<unknown> {
  const factory = await ethers.getContractFactory(name);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const ret = [];
  for (const s of users) {
    ret.push(await contract.connect(s));
  }
  ret.push(contract);
  return ret;
}

export function getId(layer: number, x: number, y: number): string {
  const h = BigInt(x + y * 408) + (BigInt(layer - 1) << 248n);
  return '0x' + h.toString(16).padStart(62, '0');
}

async function initLand(
  landAsAdmin,
  landAsDeployer,
  deployer,
  landAdmin,
  minter,
) {
  const [metaTransactionContract] = await deploy('MockContract', [deployer]);
  await landAsDeployer.initialize(metaTransactionContract, landAdmin);
  await landAsAdmin.setMinter(minter, true);
  // from: 05_remove_land_sand_meta_tx
  await landAsAdmin.setMetaTransactionProcessor(metaTransactionContract, false);
  return {metaTransactionContract};
}

async function initPolygonLand(
  landAsAdmin,
  landAsDeployer,
  deployer,
  landAdmin,
  minter,
) {
  const [trustedForwarder] = await deploy('MockMetaTxForwarder', [deployer]);
  await landAsDeployer.initialize(trustedForwarder);
  // TODO: this must be fixed in the contract, admin must be an initializing argument.
  await landAsDeployer.changeAdmin(landAdmin);
  await landAsAdmin.setMinter(minter, true);
  return {trustedForwarder};
}

export async function setupMainContract(mainContract: TesteableContracts) {
  const [deployer, landAdmin, minter, owner, other, other1, other2] =
    await ethers.getSigners();
  const [
    landAsDeployer,
    landAsAdmin,
    landAsMinter,
    landAsOwner,
    landAsOther,
    landAsOther1,
    landAsOther2,
  ] = await deploy(mainContract, [
    deployer,
    landAdmin,
    minter,
    owner,
    other,
    other1,
    other2,
  ]);
  const [testERC721TokenReceiver] = await deploy('MockERC721TokenReceiver', [
    deployer,
  ]);
  await testERC721TokenReceiver.setTokenContract(landAsOther);

  const initData =
    mainContract === 'LandV3'
      ? await initLand(landAsAdmin, landAsDeployer, deployer, landAdmin, minter)
      : await initPolygonLand(
          landAsAdmin,
          landAsDeployer,
          deployer,
          landAdmin,
          minter,
        );
  return {
    ...initData,
    deployer,
    landAdmin,
    minter,
    owner,
    other,
    other1,
    other2,
    landAsDeployer,
    landAsAdmin,
    landAsMinter,
    landAsOwner,
    landAsOther,
    landAsOther1,
    landAsOther2,
    mintQuad: async (
      to: Signer | string,
      size: number,
      x: number,
      y: number,
    ) => {
      await landAsMinter.mintQuad(to, size, x, y, '0x');
    },
    testERC721TokenReceiver,
  };
}

export async function setupOperatorFilter(mainContract: TesteableContracts) {
  const [
    deployer,
    operatorFilterSubscription,
    defaultSubscription,
    landAdmin,
    minter,
    other,
    other1,
  ] = await ethers.getSigners();
  const [mockMarketPlace1] = await deploy('MockMarketPlaceToFilter', [
    deployer,
  ]);
  const [mockMarketPlace2] = await deploy('MockMarketPlaceToFilter', [
    deployer,
  ]);
  // Any contract will to, but must be !-MockMarketPlace
  const [mockMarketPlace3] = await deploy('MockMarketPlace', [deployer]);
  const [landAsDeployer, landAsAdmin, landAsOther, landAsOther1] = await deploy(
    'Mock' + mainContract,
    [deployer, landAdmin, other, other1],
  );
  const [operatorFilterRegistry] = await deploy(
    'MockOperatorFilterRegistry',
    [deployer],
    defaultSubscription,
    [mockMarketPlace1, mockMarketPlace2],
  );
  const [
    landRegistryNotSetAsDeployer,
    landRegistryNotSetAsAdmin,
    landRegistryNotSetAsOther,
  ] = await deploy('Mock' + mainContract, [deployer, landAdmin, other]);

  let initData;
  if (mainContract === 'LandV3') {
    initData = await initLand(
      landAsAdmin,
      landAsDeployer,
      deployer,
      landAdmin,
      minter,
    );
    await landRegistryNotSetAsDeployer.initialize(
      initData.metaTransactionContract,
      landAdmin,
    );
  } else {
    initData = await initPolygonLand(
      landAsAdmin,
      landAsDeployer,
      deployer,
      landAdmin,
      minter,
    );
  }
  await operatorFilterRegistry.registerAndCopyEntries(
    operatorFilterSubscription,
    defaultSubscription,
  );
  await landAsAdmin.setOperatorRegistry(operatorFilterRegistry);
  await landAsAdmin.register(operatorFilterSubscription, true);

  return {
    ...initData,
    landAsAdmin,
    landAsDeployer,
    landAsOther,
    landAsOther1,
    landRegistryNotSetAsDeployer,
    landRegistryNotSetAsAdmin,
    landRegistryNotSetAsOther,
    operatorFilterRegistry,
    defaultSubscription,
    mockMarketPlace1,
    mockMarketPlace2,
    mockMarketPlace3,
    deployer,
    operatorFilterSubscription,
    other,
    other1,
  };
}
