import {Signer} from 'ethers';
import {ethers} from 'hardhat';

async function deploy(
  name: string,
  users: Signer[] = [],
  ...args: unknown[]
): Promise<unknown> {
  const Contract = await ethers.getContractFactory(name);
  const contract = await Contract.deploy(...args);
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

export async function setupLand() {
  const [deployer, landAdmin, minter, owner, other, other1, other2] =
    await ethers.getSigners();
  const [metaTransactionContract] = await deploy('MockContract', [deployer]);
  const [
    landAsDeployer,
    landAsAdmin,
    landAsMinter,
    landAsOwner,
    landAsOther,
    landAsOther1,
    landAsOther2,
  ] = await deploy('LandV3', [
    deployer,
    landAdmin,
    minter,
    owner,
    other,
    other1,
    other2,
  ]);
  await landAsDeployer.initialize(metaTransactionContract, landAdmin);
  // from: 05_remove_land_sand_meta_tx
  await landAsAdmin.setMetaTransactionProcessor(metaTransactionContract, false);
  await landAsAdmin.setMinter(minter, true);

  const [testERC721TokenReceiver] = await deploy('MockERC721TokenReceiver', [
    deployer,
  ]);
  await testERC721TokenReceiver.setTokenContract(landAsOther);
  return {
    deployer,
    landAdmin,
    minter,
    owner,
    other,
    other1,
    other2,
    metaTransactionContract,
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

export async function setupLandERC721() {
  const ret = await setupLand();

  let x = 0;

  async function mint(to) {
    const bytes = '0x3333';
    const GRID_SIZE = 408;
    x = ++x;
    const y = 0;
    const size = 1;
    const tokenId = x + y * GRID_SIZE;
    const receipt = await ret.landAsMinter.mintQuad(to, size, x, y, bytes);
    return {receipt, tokenId};
  }

  const tokenIds = [];
  for (let i = 0; i < 3; i++) {
    const {tokenId} = await mint(ret.owner);
    tokenIds.push(tokenId);
  }
  const [nonReceivingContract] = await deploy('MockContract', [ret.deployer]);
  return {nonReceivingContract, tokenIds, mint, ...ret};
}

export async function setupOperatorFilter() {
  const [
    deployer,
    operatorFilterSubscription,
    metaTransactionContract,
    defaultSubscription,
    landAdmin,
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
    'MockLandV3',
    [deployer, landAdmin, other, other1],
  );
  await landAsDeployer.initialize(metaTransactionContract, landAdmin);

  const [operatorFilterRegistry] = await deploy(
    'MockOperatorFilterRegistry',
    [deployer],
    defaultSubscription,
    [mockMarketPlace1, mockMarketPlace2],
  );
  await operatorFilterRegistry.registerAndCopyEntries(
    operatorFilterSubscription,
    defaultSubscription,
  );

  await landAsAdmin.setOperatorRegistry(operatorFilterRegistry);
  await landAsAdmin.register(operatorFilterSubscription, true);

  const [
    landRegistryNotSetAsDeployer,
    landRegistryNotSetAsAdmin,
    landRegistryNotSetAsOther,
  ] = await deploy('MockLandV3', [deployer, landAdmin, other]);
  await landRegistryNotSetAsDeployer.initialize(
    metaTransactionContract,
    landAdmin,
  );

  return {
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
    operatorFilterSubscription,
    other,
    other1,
  };
}
