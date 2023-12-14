import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute} = deployments;

  const {
    deployer,
    gemAdmin,
    gemMinter,
    extraCatalystAndGemMinter,
  } = await getNamedAccounts();

  const currentAdmin = await read('Gems', 'getAdmin');

  // TODO get all enabled minter from event and remove right unless specified
  const isDeployerMinter = await read('Gems', 'isMinter', deployer);
  if (isDeployerMinter) {
    await execute(
      'Gems',
      {from: currentAdmin, log: true},
      'setMinter',
      deployer,
      false
    );
  }

  const isGemMinter = await read('Gems', 'isMinter', gemMinter);
  if (!isGemMinter) {
    await execute(
      'Gems',
      {from: currentAdmin, log: true},
      'setMinter',
      gemMinter,
      true
    );
  }

  if (extraCatalystAndGemMinter) {
    const isGemMinter = await read(
      'Gems',
      'isMinter',
      extraCatalystAndGemMinter
    );
    if (!isGemMinter) {
      await execute(
        'Gems',
        {from: currentAdmin, log: true},
        'setMinter',
        extraCatalystAndGemMinter,
        true
      );
    }
  }

  if (currentAdmin.toLowerCase() !== gemAdmin.toLowerCase()) {
    await execute(
      'Gems',
      {from: currentAdmin, log: true},
      'changeAdmin',
      gemAdmin
    );
  }
};
export default func;
func.tags = ['OldGems'];
func.dependencies = ['OldGems_deploy'];
func.runAtTheEnd = true;
// comment to deploy old system
func.skip = skipUnlessTestnet; // not meant to be redeployed
