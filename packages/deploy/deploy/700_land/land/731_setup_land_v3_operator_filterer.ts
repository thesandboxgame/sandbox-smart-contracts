import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {sandAdmin} = await getNamedAccounts();
  const {execute, catchUnknownSigner, read} = deployments;

  const operatorFilterRegistry = await deployments.get(
    'OperatorFilterRegistry'
  );
  const operatorFilterSubscription = await deployments.get(
    'OperatorFilterSubscription'
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
func.tags = [
  'Land',
  'LandV3_setup',
  DEPLOY_TAGS.L1,
  DEPLOY_TAGS.L1_PROD,
  DEPLOY_TAGS.L1_TEST,
];
func.dependencies = ['LandV3_deploy', 'OperatorFilterLandSubscription'];
