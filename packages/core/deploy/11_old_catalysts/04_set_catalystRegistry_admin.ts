import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {log, read, execute} = deployments;

  const {catalystRegistryAdmin} = await getNamedAccounts();
  const currentAdmin = await read('CatalystRegistry', 'getAdmin');
  if (currentAdmin.toLowerCase() !== catalystRegistryAdmin.toLowerCase()) {
    log('setting CatalystRegistry Admin');
    await execute(
      'CatalystRegistry',
      {from: currentAdmin},
      'changeAdmin',
      catalystRegistryAdmin
    );
  }
};
export default func;
func.tags = ['OldCatalystRegistry'];
func.dependencies = ['OldCatalystRegistry_deploy'];
func.runAtTheEnd = true;
// comment to deploy old system
func.skip = skipUnlessTestnet; // not meant to be redeployed
