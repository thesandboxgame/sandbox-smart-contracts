import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import CheckAndSetTrustedForwarder from '../../deploy_utils/CheckAndSetTrustedForwarder';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute} = deployments;
  const {
    deployer,
    multiGiveawayAdmin,
    ozdRelayer,
    sandAdmin,
  } = await getNamedAccounts();

  const DEFAULT_ADMIN_ROLE = await read(
    'PolygonMulti_Giveaway_V2_1',
    'DEFAULT_ADMIN_ROLE'
  );
  const MULTIGIVEAWAY_ROLE = await read(
    'PolygonMulti_Giveaway_V2_1',
    'MULTIGIVEAWAY_ROLE'
  );
  const sandAdminIsDefaultAdmin = await read(
    'PolygonMulti_Giveaway_V2_1',
    'hasRole',
    DEFAULT_ADMIN_ROLE,
    sandAdmin
  );
  const multiGiveawayAdminIsAdmin = await read(
    'PolygonMulti_Giveaway_V2_1',
    'hasRole',
    MULTIGIVEAWAY_ROLE,
    multiGiveawayAdmin
  );
  const ozdRelayerIsAdmin = await read(
    'PolygonMulti_Giveaway_V2_1',
    'hasRole',
    DEFAULT_ADMIN_ROLE,
    ozdRelayer
  );
  const deployerIsAdmin = await read(
    'PolygonMulti_Giveaway_V2_1',
    'hasRole',
    DEFAULT_ADMIN_ROLE,
    deployer
  );
  if (!sandAdminIsDefaultAdmin && deployerIsAdmin) {
    await execute(
      'PolygonMulti_Giveaway_V2_1',
      {from: deployer, log: true},
      'grantRole',
      DEFAULT_ADMIN_ROLE,
      sandAdmin
    );
  }
  if (!ozdRelayerIsAdmin && (deployerIsAdmin || sandAdminIsDefaultAdmin)) {
    await execute(
      'PolygonMulti_Giveaway_V2_1',
      {from: deployerIsAdmin ? deployer : multiGiveawayAdmin, log: true},
      'grantRole',
      DEFAULT_ADMIN_ROLE,
      ozdRelayer
    );
  }
  if (!multiGiveawayAdminIsAdmin) {
    await execute(
      'PolygonMulti_Giveaway_V2_1',
      {from: deployerIsAdmin ? deployer : multiGiveawayAdmin, log: true},
      'grantRole',
      MULTIGIVEAWAY_ROLE,
      multiGiveawayAdmin
    );
  }

  if (deployerIsAdmin && hre.network.tags.mainnet) {
    await execute(
      'PolygonMulti_Giveaway_V2_1',
      {from: deployer, log: true},
      'revokeRole',
      DEFAULT_ADMIN_ROLE,
      deployer
    );
  }
  await CheckAndSetTrustedForwarder(
    hre,
    'PolygonMulti_Giveaway_V2_1',
    deployerIsAdmin ? deployer : multiGiveawayAdmin
  );
};
export default func;
func.tags = [
  'PolygonMulti_Giveaway_V2_1',
  'PolygonMulti_Giveaway_V2_1_setup',
  'L2',
];
func.skip = skipUnlessTest;
