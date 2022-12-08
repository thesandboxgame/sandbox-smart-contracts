import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('MockMarketPlace3', {
    from: deployer,
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['MockMarketPlace3', 'MockMarketPlace3_deploy'];
func.skip = skipUnlessTestnet;
