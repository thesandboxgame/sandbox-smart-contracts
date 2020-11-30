import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  const sandContract = await deployments.get('Sand');

  await deploy('Asset', {
    from: deployer,
    args: [
      sandContract.address,
      deployer, // is set to assetAdmin in a later stage
      deployer, // is set to assetBouncerAdmin in a later stage]}, // , gasPrice: '10000000000'},
    ],
    log: true,
  });
};
export default func;
func.tags = ['Asset', 'Asset_deploy'];
func.dependencies = ['Sand_deploy'];
