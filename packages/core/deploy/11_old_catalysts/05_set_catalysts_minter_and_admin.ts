import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute} = deployments;

  const {
    deployer,
    catalystAdmin,
    catalystMinter,
    extraCatalystAndGemMinter,
  } = await getNamedAccounts();

  const currentAdmin = await read('Catalysts', 'getAdmin');

  // TODO get all enabled minter from event and remove right unless specified
  const isDeployerMinter = await read('Catalysts', 'isMinter', deployer);
  if (isDeployerMinter) {
    await execute(
      'Catalysts',
      {from: currentAdmin, log: true},
      'setMinter',
      deployer,
      false
    );
  }

  const isCatalystMinter = await read('Catalysts', 'isMinter', catalystMinter);
  if (!isCatalystMinter) {
    await execute(
      'Catalysts',
      {from: currentAdmin, log: true},
      'setMinter',
      catalystMinter,
      true
    );
  }

  if (extraCatalystAndGemMinter) {
    const isCatalystMinter = await read(
      'Catalysts',
      'isMinter',
      extraCatalystAndGemMinter
    );
    if (!isCatalystMinter) {
      await execute(
        'Catalysts',
        {from: currentAdmin, log: true},
        'setMinter',
        extraCatalystAndGemMinter,
        true
      );
    }
  }

  if (currentAdmin.toLowerCase() !== catalystAdmin.toLowerCase()) {
    await execute(
      'Catalysts',
      {from: currentAdmin, log: true},
      'changeAdmin',
      catalystAdmin
    );
  }
};
export default func;
func.tags = ['OldCatalysts'];
func.dependencies = ['OldCatalysts_deploy'];
func.runAtTheEnd = true;
// comment to deploy old system
func.skip = skipUnlessTestnet; // not meant to be redeployed
