import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, catchUnknownSigner, read} = deployments;
  const {sandAdmin} = await getNamedAccounts();

  const operatorFilterRegistry = await deployments.get(
    'OperatorFilterRegistry'
  );
  const operatorFilterSubscription = await deployments.get(
    'OperatorFilterLandSubscription'
  );
  const current = await read('PolygonLand', 'operatorFilterRegistry');
  if (current != operatorFilterRegistry.address) {
    await catchUnknownSigner(
      execute(
        'PolygonLand',
        {from: sandAdmin},
        'setOperatorRegistry',
        operatorFilterRegistry.address
      )
    );
    await catchUnknownSigner(
      execute(
        'PolygonLand',
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
  'PolygonLand',
  'PolygonLandV2_setup',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'PolygonLandV2_deploy',
  'OperatorFilterLandSubscription',
  'PolygonLand_setup',
];
