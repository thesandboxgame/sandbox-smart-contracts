import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;
  const {gemsCatalystsRegistryAdmin} = await getNamedAccounts();
  //const currentAdmin = await read('GemsCatalystsRegistry', 'getAdmin');
  //const {deployer} = await getNamedAccounts();

  const adminRole = await deployments.read(
    'PolygonGemsCatalystsRegistry',
    'DEFAULT_ADMIN_ROLE'
  );

  const hasRole = await deployments.read(
    'PolygonGemsCatalystsRegistry',
    'hasRole',
    adminRole,
    gemsCatalystsRegistryAdmin
  );

  if (!hasRole) {
    const {deployer} = await getNamedAccounts(); //curent deployer

    await execute(
      'PolygonGemsCatalystsRegistry',
      {from: deployer, log: true},
      'grantRole',
      adminRole,
      gemsCatalystsRegistryAdmin
    );

    await execute(
      'PolygonGemsCatalystsRegistry',
      {from: gemsCatalystsRegistryAdmin, log: true},
      'revokeRole',
      adminRole,
      deployer
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = [
  'PolygonGemsCatalystsRegistry',
  'PolygonGemsCatalystsRegistry_setup',
  'L2',
];
func.dependencies = ['PolygonGemsCatalystsRegistry_deploy'];
