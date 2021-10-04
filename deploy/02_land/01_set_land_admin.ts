import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;

  const {landAdmin} = await getNamedAccounts();

  let currentAdmin;
  try {
    currentAdmin = await read('Land', 'getAdmin');
  } catch (e) {
    // no admin
  }
  if (currentAdmin) {
    if (currentAdmin.toLowerCase() !== landAdmin.toLowerCase()) {
      await catchUnknownSigner(
        execute(
          'Land',
          {from: currentAdmin, log: true},
          'changeAdmin',
          landAdmin
        )
      );
    }
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['Land', 'Land_setup', 'LandAdmin'];
func.dependencies = ['Land_deploy'];
