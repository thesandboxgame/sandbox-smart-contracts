import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, multiGiveawayAdmin, sandAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');

  await deploy('PolygonMulti_Giveaway_V2_1', {
    contract: 'MultiGiveawayV2',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [sandAdmin, multiGiveawayAdmin, TRUSTED_FORWARDER_V2.address], // DEFAULT_ADMIN_ROLE, MULTIGIVEAWAY_ROLE, trustedForwarder
  });
};
export default func;
func.tags = [
  'PolygonMulti_Giveaway_V2_1',
  'PolygonMulti_Giveaway_V2_1_deploy',
  'L2',
];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
func.skip = skipUnlessTest;
