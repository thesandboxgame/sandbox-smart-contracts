import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenAdmin} = await getNamedAccounts();
  const assetContract = await deployments.get('Asset');
  const testMetaTxForwarder = await deployments.get('TestMetaTxForwarder');

  await deploy('GameToken', {
    from: deployer,
    log: true,
    args: [testMetaTxForwarder.address, gameTokenAdmin, assetContract.address],
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['GameToken', 'GameToken_deploy'];
func.dependencies = ['Asset_deploy', 'TestMetaTxForwarder_deploy'];
func.skip = skipUnlessTest; // TODO enable
