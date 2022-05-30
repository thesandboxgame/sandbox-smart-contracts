import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  await deploy('PolygonMulti_Giveaway_1', {
    contract: 'MultiGiveaway',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [deployer, TRUSTED_FORWARDER.address], // admin, trustedForwarder
  });
};
export default func;
func.tags = ['PolygonMulti_Giveaway_1', 'PolygonMulti_Giveaway_1_deploy', 'L2'];
