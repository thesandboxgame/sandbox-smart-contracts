import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot} from '../../utils';
import {Contract} from 'ethers';

const name = `The Sandbox's ASSETs ERC721`;
const symbol = 'ASSETERC721';

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

  await deployments.deploy('PolygonAssetERC721', {
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
  const polygonAssetERC721 = await ethers.getContract(
    'PolygonAssetERC721',
    deployer
  );
  const polygonAssetERC721AsAdmin = await ethers.getContract(
    'PolygonAssetERC721',
    adminRole
  );

  // Grant roles
  const minterRole = await polygonAssetERC721.MINTER_ROLE();
  await polygonAssetERC721AsAdmin.grantRole(minterRole, minter);
  const polygonAssetERC721AsMinter = await ethers.getContract(
    'PolygonAssetERC721',
    minter
  );
  const polygonAssetERC721AsOther = await ethers.getContract(
    'PolygonAssetERC721',
    other
  );
  const polygonAssetERC721AsTrustedForwarder = await ethers.getContract(
    'PolygonAssetERC721',
    trustedForwarder
  );

  const addMinter = async function (
    adminRole: string,
    assetERC721: Contract,
    addr: string
  ): Promise<void> {
    const assetERC721AsAdmin = await ethers.getContract(
      'AssetERC721',
      adminRole
    );
    const minterRole = await assetERC721.MINTER_ROLE();
    await assetERC721AsAdmin.grantRole(minterRole, addr);
  };

  return {
    symbol,
    name,
    polygonAssetERC721,
    polygonAssetERC721AsAdmin,
    polygonAssetERC721AsMinter,
    polygonAssetERC721AsOther,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    polygonAssetERC721AsTrustedForwarder,
    adminRole,
    minterRole,
    minter,
    other,
    dest,
    addMinter,
  };
});
