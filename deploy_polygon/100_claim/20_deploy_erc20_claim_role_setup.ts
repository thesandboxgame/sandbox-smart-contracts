import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {sandAdmin, backendAuthWallet} = await getNamedAccounts();

  const signerRole = await deployments.read('ERC20SignedClaim', 'SIGNER_ROLE');
  await deployments.execute(
    'ERC20SignedClaim',
    {from: sandAdmin, log: true},
    'grantRole',
    signerRole,
    backendAuthWallet
  );
};

export default func;
func.tags = ['ERC20SignedClaim', 'ERC20SignedClaim_role_setup'];
func.dependencies = ['ERC20SignedClaim_deploy'];
func.skip = skipUnlessTestnet;
