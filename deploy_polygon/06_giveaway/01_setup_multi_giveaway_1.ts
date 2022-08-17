import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import CheckAndSetTrustedForwarder from '../../deploy_utils/CheckAndSetTrustedForwarder';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute} = deployments;
  const {deployer, multiGiveawayAdmin, ozdRelayer} = await getNamedAccounts();

  const DEFAULT_ADMIN_ROLE = await read(
    'PolygonMulti_Giveaway_1',
    'DEFAULT_ADMIN_ROLE'
  );
  const multiGiveawayAdminIsAdmin = await read(
    'PolygonMulti_Giveaway_1',
    'hasRole',
    DEFAULT_ADMIN_ROLE,
    multiGiveawayAdmin
  );
  const ozdRelayerIsAdmin = await read(
    'PolygonMulti_Giveaway_1',
    'hasRole',
    DEFAULT_ADMIN_ROLE,
    ozdRelayer
  );
  const deployerIsAdmin = await read(
    'PolygonMulti_Giveaway_1',
    'hasRole',
    DEFAULT_ADMIN_ROLE,
    deployer
  );
  if (!multiGiveawayAdminIsAdmin && deployerIsAdmin) {
    await execute(
      'PolygonMulti_Giveaway_1',
      {from: deployer, log: true},
      'grantRole',
      DEFAULT_ADMIN_ROLE,
      multiGiveawayAdmin
    );
  }
  if (!ozdRelayerIsAdmin && (deployerIsAdmin || multiGiveawayAdminIsAdmin)) {
    await execute(
      'PolygonMulti_Giveaway_1',
      {from: deployerIsAdmin ? deployer : multiGiveawayAdmin, log: true},
      'grantRole',
      DEFAULT_ADMIN_ROLE,
      ozdRelayer
    );
  }
  if (deployerIsAdmin && hre.network.tags.mainnet) {
    await execute(
      'PolygonMulti_Giveaway_1',
      {from: deployer, log: true},
      'revokeRole',
      DEFAULT_ADMIN_ROLE,
      deployer
    );
  }

  await CheckAndSetTrustedForwarder(
    hre,
    'PolygonMulti_Giveaway_1',
    deployerIsAdmin ? deployer : multiGiveawayAdmin
  );
};
export default func;
func.tags = ['PolygonMulti_Giveaway_1', 'PolygonMulti_Giveaway_1_setup', 'L2'];
func.skip = skipUnlessTest;
