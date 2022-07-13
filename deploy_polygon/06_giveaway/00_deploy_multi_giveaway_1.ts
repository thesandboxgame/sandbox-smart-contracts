import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');

  await deploy('PolygonMulti_Giveaway_1', {
    contract: 'MultiGiveaway',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [deployer, TRUSTED_FORWARDER_V2.address], // admin, trustedForwarder
  });
};
export default func;
func.tags = ['PolygonMulti_Giveaway_1', 'PolygonMulti_Giveaway_1_deploy', 'L2'];
func.skip = skipUnlessTest;
