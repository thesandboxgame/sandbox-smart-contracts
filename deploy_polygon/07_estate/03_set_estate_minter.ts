import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;

  const {estateTokenAdmin} = await getNamedAccounts();

  const estateMinter = await deployments.get('EstateMinter');

  const minterRole = await read('EstateToken', 'MINTER_ROLE');
  const isMinter = await read(
    'EstateToken',
    'hasRole',
    minterRole,
    estateMinter.address
  );
  if (!isMinter) {
    await execute(
      'EstateToken',
      {from: estateTokenAdmin, log: true},
      'grantRole',
      minterRole,
      estateMinter.address
    );
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = ['PolygonEstateToken', 'PolygonEstateToken_setup'];
func.dependencies = ['PolygonEstateToken_deploy', 'PolygonEstateMinter_deploy'];
// TODO: Setup deploy-polygon folder and network.
func.skip = skipUnlessTestnet; // TODO enable
