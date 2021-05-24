import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  await deploy(`GemsCatalystsRegistry`, {
    from: deployer,
    log: true,
    args: [deployer],
  });
};
export default func;
func.tags = ['GemsCatalystsRegistry', 'GemsCatalystsRegistry_deploy'];
func.skip = skipUnlessTest; // disabled for now
