import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin} = await getNamedAccounts();
  const RoyaltyManager = await deployments.get('RoyaltyManager');
  const current = await read('Land', 'getRoyaltyManager');
  if (current != RoyaltyManager.address) {
    await catchUnknownSigner(
      execute(
        'Land',
        {from: sandAdmin, log: true},
        'setRoyaltyManager',
        RoyaltyManager.address
      )
    );
  }
};

export default func;
func.tags = [
  'Land',
  'LandV4_setup',
  'LandRoyaltyManager',
  'LandRoyaltyManager_setup',
  'L1',
];
func.dependencies = ['LandV4_deploy', 'RoyaltyManager_deploy'];
