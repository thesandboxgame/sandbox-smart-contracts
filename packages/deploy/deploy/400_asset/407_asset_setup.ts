import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log, read, catchUnknownSigner} = deployments;
  const {assetAdmin} = await getNamedAccounts();

  const moderatorRole = await read('Asset', 'MODERATOR_ROLE');
  if (!(await read('Asset', 'hasRole', moderatorRole, assetAdmin))) {
    await catchUnknownSigner(
      execute(
        'Asset',
        {from: assetAdmin, log: true},
        'grantRole',
        moderatorRole,
        assetAdmin
      )
    );
    log(`Asset MODERATOR_ROLE granted to ${assetAdmin}`);
  }
};

export default func;

func.tags = ['Asset', 'Asset_setup'];
func.dependencies = ['Asset_deploy'];
