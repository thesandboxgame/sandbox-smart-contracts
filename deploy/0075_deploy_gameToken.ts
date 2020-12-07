import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenAdmin} = await getNamedAccounts();
  const sandContract = await deployments.get('Sand');
  const assetContract = await deployments.get('Asset');

  const message =
    '!!! GameManager not yet deployed !!! Add a script to set Game Manager address after we add the GM contract.';
  console.log('\n \x1b[31m%s\x1b[0m \n', message);

  await deploy('GameToken', {
    from: deployer,
    log: true,
    args: [sandContract.address, gameTokenAdmin, assetContract.address],
  });
};

export default func;
func.tags = ['GameToken', 'GameToken_deploy'];
func.dependencies = ['Sand_deploy', 'Asset_deploy'];
