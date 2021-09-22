import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  await deploy(`PolygonDefaultAttributes`, {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    contract: 'DefaultAttributes',
  });
};
export default func;
func.tags = [
  'PolygonDefaultAttributes',
  'PolygonDefaultAttributes_deploy',
  'L2',
];
func.skip = skipUnlessTest; // disabled for now
