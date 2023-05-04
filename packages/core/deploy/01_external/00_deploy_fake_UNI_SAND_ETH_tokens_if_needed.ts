import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let UNI_SAND_ETH = await deployments.getOrNull('UNI_SAND_ETH');
  if (!UNI_SAND_ETH) {
    UNI_SAND_ETH = await deploy('UNI_SAND_ETH', {
      from: deployer,
      contract: 'FakeDai',
      log: true,
    });
  }
};
export default func;
func.tags = ['UNI_SAND_ETH'];
