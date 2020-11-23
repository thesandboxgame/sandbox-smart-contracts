import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sandContract = await deployments.get('Sand');

  await deploy('Asset', {
    from: deployer,
    args: [
      sandContract.address,
      deployer, // TODO set_asset_admin
      deployer, // TODO set_asset_admin
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['Asset', 'Asset_deploy'];
func.dependencies = ['Sand'];
