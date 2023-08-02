import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
export const DEFAULT_BPS = 300;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log, read, catchUnknownSigner} = deployments;
  const {assetAdmin, contractRoyaltySetter} = await getNamedAccounts();

  const Asset = await deployments.get('Asset');

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

  await catchUnknownSigner(
    execute(
      'RoyaltyManager',
      {from: contractRoyaltySetter, log: true},
      'setContractRoyalty',
      Asset.address,
      DEFAULT_BPS
    )
  );
};

export default func;

func.tags = ['Asset', 'Asset_setup'];
func.dependencies = ['Asset_deploy'];
