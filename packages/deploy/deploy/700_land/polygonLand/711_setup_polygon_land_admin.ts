import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {deployer, sandAdmin} = await getNamedAccounts();
  const admin = await read('PolygonLand', 'getAdmin');
  if (admin != sandAdmin) {
    await catchUnknownSigner(
      execute(
        'PolygonLand',
        {from: deployer, log: true},
        'changeAdmin',
        sandAdmin
      )
    );
  }
};
export default func;
func.tags = [
  'PolygonLand',
  'PolygonLand_setup',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['PolygonLand_deploy'];
