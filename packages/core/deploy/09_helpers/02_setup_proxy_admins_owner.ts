import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {proxyAdminOwner} = await getNamedAccounts();

  let currentOwner;
  try {
    currentOwner = await read('ProxyAdmin', 'owner');
  } catch (e) {
    // no admin
  }

  if (currentOwner) {
    if (currentOwner.toLowerCase() !== proxyAdminOwner.toLowerCase()) {
      await execute(
        'ProxyAdmin',
        {from: currentOwner, log: true},
        'transferOwnership',
        proxyAdminOwner
      );
    }
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['ProxyAdmin', 'ProxyAdmin_setup'];

func.skip = skipUnlessTest; // TODO reenable once all assets are migrated
