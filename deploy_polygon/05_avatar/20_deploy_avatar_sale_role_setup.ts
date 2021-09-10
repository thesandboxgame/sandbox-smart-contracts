import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    sandAdmin,
    backendAuthWallet,
    sandboxAccount,
  } = await getNamedAccounts();

  const avatarSaleContract = await deployments.get('PolygonAvatarSale');
  const adminRole = sandAdmin;

  // Grant roles.
  const minterRole = await deployments.read('PolygonAvatar', 'MINTER_ROLE');
  await deployments.execute(
    'PolygonAvatar',
    {from: adminRole, log: true},
    'grantRole',
    minterRole,
    avatarSaleContract.address
  );

  const signerRole = await deployments.read('PolygonAvatarSale', 'SIGNER_ROLE');
  await deployments.execute(
    'PolygonAvatarSale',
    {from: adminRole, log: true},
    'grantRole',
    signerRole,
    backendAuthWallet
  );

  const sellerRole = await deployments.read('PolygonAvatarSale', 'SELLER_ROLE');
  await deployments.execute(
    'PolygonAvatarSale',
    {from: adminRole, log: true},
    'grantRole',
    sellerRole,
    sandboxAccount
  );
};

export default func;
func.tags = ['PolygonAvatarSale', 'PolygonAvatarSale_role_setup'];
func.dependencies = ['PolygonAvatarSale_deploy'];
func.skip = skipUnlessTestnet;
