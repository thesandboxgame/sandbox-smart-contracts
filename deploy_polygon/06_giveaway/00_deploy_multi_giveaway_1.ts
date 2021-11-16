import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, multiGiveawayAdmin} = await getNamedAccounts();

  await deploy('PolygonMulti_Giveaway_1', {
    contract: 'MultiGiveaway',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [multiGiveawayAdmin],
  });
};
export default func;
func.tags = ['PolygonMulti_Giveaway_1', 'PolygonMulti_Giveaway_1_deploy', 'L2'];
func.dependencies = [];
func.skip = skipUnlessTestnet;
