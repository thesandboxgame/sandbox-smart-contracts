import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin, backendInstantGiveawayWallet} = await getNamedAccounts();
  const signerRole = await read('SignedMultiGiveaway', 'SIGNER_ROLE');
  if (
    !(await read(
      'SignedMultiGiveaway',
      'hasRole',
      signerRole,
      backendInstantGiveawayWallet
    ))
  ) {
    await catchUnknownSigner(
      execute(
        'SignedMultiGiveaway',
        {from: sandAdmin, log: true},
        'grantRole',
        signerRole,
        backendInstantGiveawayWallet
      )
    );
  }
};

export default func;
func.tags = ['SignedMultiGiveaway', 'SignedMultiGiveaway_role_setup', 'L2'];
func.dependencies = ['SignedMultiGiveaway_deploy'];
