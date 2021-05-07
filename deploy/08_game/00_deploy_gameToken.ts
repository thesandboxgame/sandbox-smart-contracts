import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, gameTokenAdmin} = await getNamedAccounts();
  const assetContract = await deployments.get('Asset');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  await deploy('GameToken', {
    from: deployer,
    log: true,
    args: [TRUSTED_FORWARDER.address, gameTokenAdmin, assetContract.address],
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['GameToken', 'GameToken_deploy'];
func.dependencies = ['Asset_deploy', 'TRUSTED_FORWARDER'];
func.skip = skipUnlessTest; // TODO enable
