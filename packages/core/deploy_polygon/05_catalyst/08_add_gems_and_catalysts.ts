import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import catalysts from '../../data/catalysts';
import gems from '../../data/gems';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const catalystsToAdd = [];
  const gemsToAdd = [];

  const {deployer, gemsCatalystsRegistryAdmin} = await getNamedAccounts();

  for (const catalyst of catalysts) {
    const doesCatalystExist = await read(
      `PolygonGemsCatalystsRegistry`,
      'doesCatalystExist',
      catalyst.catalystId
    );
    if (!doesCatalystExist) {
      const {address} = await deployments.get(
        `PolygonCatalyst_${catalyst.symbol}`
      );
      catalystsToAdd.push(address);
    }
  }

  for (const gem of gems) {
    const doesGemExist = await read(
      `PolygonGemsCatalystsRegistry`,
      'doesGemExist',
      gem.gemId
    );
    if (!doesGemExist) {
      const {address} = await deployments.get(`PolygonGem_${gem.symbol}`);
      gemsToAdd.push(address);
    }
  }

  let admin = deployer;
  const defaultAdminRole = await read(
    'PolygonGemsCatalystsRegistry',
    'DEFAULT_ADMIN_ROLE'
  );

  const isDeployerAdmin = await read(
    'PolygonGemsCatalystsRegistry',
    'hasRole',
    defaultAdminRole,
    deployer
  );

  if (!isDeployerAdmin) {
    const isNewAdmin = await read(
      'PolygonGemsCatalystsRegistry',
      'hasRole',
      defaultAdminRole,
      gemsCatalystsRegistryAdmin
    );
    if (isNewAdmin) {
      admin = gemsCatalystsRegistryAdmin;
    }
  }

  await execute(
    'PolygonGemsCatalystsRegistry',
    {from: admin, log: true},
    'addGemsAndCatalysts',
    gemsToAdd,
    catalystsToAdd
  );
};
export default func;
func.runAtTheEnd = true;
func.tags = [
  'PolygonGemsCatalystsRegistry',
  'PolygonGemsCatalystsRegistry_setup',
  'L2',
];
func.dependencies = [
  'PolygonGemsCatalystsRegistry_deploy',
  'PolygonCatalysts',
  'PolygonGems',
];
