import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {landAdmin} = await getNamedAccounts();

  let currentAdmin;
  try {
    currentAdmin = await read('Land', 'getAdmin');
  } catch (e) {
    // no admin
  }
  if (currentAdmin) {
    if (currentAdmin.toLowerCase() !== landAdmin.toLowerCase()) {
      await execute(
        'Land',
        {from: currentAdmin, log: true},
        'changeAdmin',
        landAdmin
      );
    }
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['Land', 'Land_setup'];
func.dependencies = ['Land_deploy'];
func.skip = async (hre) => hre.network.name !== 'hardhat';
