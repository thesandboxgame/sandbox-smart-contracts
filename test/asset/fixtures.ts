import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {Contract} from 'ethers';
import {withSnapshot} from '../utils';

const name = `Sandbox's Assets`;
const symbol = 'ASSET';
const baseUri = 'http://sandbox.testAsset.erc721';
export const setupAssetERC721Test = withSnapshot([], async function () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    minter,
    other,
    dest,
  ] = await getUnnamedAccounts();

  await deployments.deploy('AssetERC721', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [trustedForwarder, adminRole],
      },
    },
  });

  const assetERC721AsAdmin = await ethers.getContract('AssetERC721', adminRole);
  // Set baseUri
  await assetERC721AsAdmin.setBaseUri(baseUri);

  const addMinter = async function (
    adminRole: string,
    assetERC721: Contract,
    addr: string
  ): Promise<void> {
    const minterRole = await assetERC721.MINTER_ROLE();
    await assetERC721AsAdmin.grantRole(minterRole, addr);
  };

  const assetERC721 = await ethers.getContract('AssetERC721', deployer);
  return {
    baseUri,
    symbol,
    name,
    assetERC721,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    adminRole,
    minter,
    other,
    dest,
    addMinter,
  };
});
