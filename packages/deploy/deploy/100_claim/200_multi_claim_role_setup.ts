import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin, backendCashbackWallet} = await getNamedAccounts();
  const signerRole = await read('MultiGiveawayV1', 'SIGNER_ROLE');
  if (
    !(await read(
      'MultiGiveawayV1',
      'hasRole',
      signerRole,
      backendCashbackWallet
    ))
  ) {
    await catchUnknownSigner(
      execute(
        'MultiGiveawayV1',
        {from: sandAdmin, log: true},
        'grantRole',
        signerRole,
        backendCashbackWallet
      )
    );
  }
};

export default func;
func.tags = ['MultiGiveawayV1', 'MultiGiveawayV1_role_setup', 'L2'];
func.dependencies = ['MultiGiveawayV1_deploy'];
