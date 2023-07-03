import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  const AssetContract = await deployments.get('Asset');

  await deploy('MockMinter', {
    from: deployer,
    contract: 'MockMinter',
    args: [AssetContract.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['MockMinter'];
func.dependencies = ['Asset', 'AuthValidator'];
