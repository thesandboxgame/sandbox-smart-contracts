import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin, backendCashbackWallet} = await getNamedAccounts();

  const signerRole = await read('ERC20SignedClaim', 'SIGNER_ROLE');
  if (
    !(await read(
      'ERC20SignedClaim',
      'hasRole',
      signerRole,
      backendCashbackWallet
    ))
  ) {
    await catchUnknownSigner(
      execute(
        'ERC20SignedClaim',
        {from: sandAdmin, log: true},
        'grantRole',
        signerRole,
        backendCashbackWallet
      )
    );
  }
};

export default func;
func.tags = [
  'Cashback',
  'ERC20SignedClaim',
  'ERC20SignedClaim_role_setup',
  'L2',
];
func.dependencies = ['ERC20SignedClaim_deploy'];
