import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const sand = await deployments.get('Sand');

  const {deployer} = await getNamedAccounts();
  await deploy(`SandPolygonDepositor`, {
    from: deployer,
    log: true,
    args: [sand.address],
  });
};
export default func;
func.tags = ['SandPolygonDepositor'];
