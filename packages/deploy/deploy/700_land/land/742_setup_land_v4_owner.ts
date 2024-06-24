import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin, commonRoyaltyReceiver} = await getNamedAccounts();
  const owner = await read('Land', 'owner');
  if (owner != commonRoyaltyReceiver) {
    await catchUnknownSigner(
      execute(
        'Land',
        {from: sandAdmin, log: true},
        'transferOwnership',
        commonRoyaltyReceiver
      )
    );
  }
};

export default func;
func.tags = ['Land', 'LandV4_setup', 'LandOwner', 'LandOwner_setup', 'L1'];
func.dependencies = ['LandV4_deploy'];
