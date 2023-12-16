import {Contract, Signer, ZeroAddress} from 'ethers';
import {ethers} from 'hardhat';

export const zeroAddress = '0x0000000000000000000000000000000000000000';

export async function deploy(
  name: string,
  users: Signer[] = [],
  ...args: unknown[]
): Promise<Contract[]> {
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

export async function setupLand() {
  const [deployer, landAdmin, minter, other, other1] =
    await ethers.getSigners();

  const [landAsDeployer, landAsAdmin, landAsMinter, landAsOther] = await deploy(
    'Land',
    [deployer, landAdmin, minter, other],
  );
  const [sandContract] = await deploy('MockLand', [deployer]);
  // TODO: mock sand contract (approve and call)
  await landAsDeployer.initialize(ZeroAddress, landAdmin.address);
  await landAsAdmin.setMinter(minter.address, true);
  const [TestERC1155ERC721TokenReceiver] = await deploy(
    'TestERC1155ERC721TokenReceiver',
    [deployer],
    await landAsOther.getAddress(),
    true,
    true,
    true,
    true,
    false,
  );
  const [
    mockLandAsDeployer,
    mocklandAsAdmin,
    mocklandAsMinter,
    mocklandAsOther,
  ] = await deploy('MockLand', [deployer, landAdmin, minter, other]);
  await mockLandAsDeployer.initialize(ZeroAddress, landAdmin.address);
  await mocklandAsAdmin.setMinter(minter.address, true);
  return {
    deployer,
    landAdmin,
    minter,
    other,
    other1,
    landAsDeployer,
    landAsAdmin,
    landAsMinter,
    landAsOther,
    mintQuad: async (to: string, size: number, x: number, y: number) =>
      await landAsMinter.mintQuad(to, size, x, y, '0x'),
    TestERC1155ERC721TokenReceiver,
    mockLandAsDeployer,
    mocklandAsAdmin,
    mocklandAsMinter,
    mocklandAsOther,
    sandContract,
  };
}

export function getId(layer: number, x: number, y: number): string {
  const h = BigInt(x + y * 408) + (BigInt(layer - 1) << 248n);
  return '0x' + h.toString(16).padStart(62, '0');
}
