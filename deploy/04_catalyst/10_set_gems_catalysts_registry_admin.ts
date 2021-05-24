import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;
  const {gemsCatalystsRegistryAdmin} = await getNamedAccounts();

  const currentAdmin = await read('GemsCatalystsRegistry', 'getAdmin');
  if (currentAdmin.toLowerCase() !== gemsCatalystsRegistryAdmin.toLowerCase()) {
    await execute(
      'GemsCatalystsRegistry',
      {from: currentAdmin, log: true},
      'changeAdmin',
      gemsCatalystsRegistryAdmin
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['GemsCatalystsRegistry', 'GemsCatalystsRegistry_setup'];
func.dependencies = ['GemsCatalystsRegistry_deploy'];
func.skip = skipUnlessTest; // disabled for now
