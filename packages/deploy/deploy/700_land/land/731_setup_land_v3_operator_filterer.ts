import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {sandAdmin} = await getNamedAccounts();
  const {execute, catchUnknownSigner, read} = deployments;

  const operatorFilterRegistry = await deployments.get(
    'OperatorFilterRegistry'
  );
  const operatorFilterSubscription = await deployments.get(
    'OperatorFilterLandSubscription'
  );
  const current = await read('Land', 'operatorFilterRegistry');
  if (current != operatorFilterRegistry.address) {
    await catchUnknownSigner(
      execute(
        'Land',
        {from: sandAdmin},
        'setOperatorRegistry',
        operatorFilterRegistry.address
      )
    );
    await catchUnknownSigner(
      execute(
        'Land',
        {from: sandAdmin},
        'register',
        operatorFilterSubscription.address,
        true
      )
    );
  }
};
export default func;
func.tags = ['Land', 'LandV3_setup', 'L1'];
func.dependencies = ['LandV3_deploy', 'OperatorFilterLandSubscription'];
