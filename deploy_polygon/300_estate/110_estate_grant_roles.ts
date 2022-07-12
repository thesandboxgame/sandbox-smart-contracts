import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessL1, skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {sandAdmin} = await getNamedAccounts();
  const adminRole = sandAdmin;

  const estateTunnel = await deployments.get('PolygonEstateTunnel');
  // Grant roles.
  const minterRole = await deployments.read('PolygonEstate', 'MINTER_ROLE');
  await deployments.execute(
    'PolygonEstate',
    {from: adminRole, log: true},
    'grantRole',
    minterRole,
    estateTunnel.address
  );

  const burnerRole = await deployments.read('PolygonEstate', 'BURNER_ROLE');
  await deployments.execute(
    'PolygonEstate',
    {from: adminRole, log: true},
    'grantRole',
    burnerRole,
    estateTunnel.address
  );
};

export default func;
func.tags = ['PolygonEstateTunnel', 'PolygonEstate_grant_roles'];
func.dependencies = ['PolygonEstate_deploy', 'PolygonEstateTunnel_deploy'];
func.skip = async (hre) =>
  (await skipUnlessTestnet(hre)) && (await skipUnlessL1(hre));
