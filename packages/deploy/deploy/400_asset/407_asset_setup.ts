import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';
export const DEFAULT_BPS = 500;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log, read, catchUnknownSigner} = deployments;
  const {assetAdmin, contractRoyaltySetter, royaltyManagerAdmin} =
    await getNamedAccounts();

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

  if (
    (await read('RoyaltyManager', 'getContractRoyalty', Asset.address)) !==
    DEFAULT_BPS
  ) {
    await catchUnknownSigner(
      execute(
        'RoyaltyManager',
        {from: contractRoyaltySetter, log: true},
        'setContractRoyalty',
        Asset.address,
        DEFAULT_BPS
      )
    );
    log(`Asset set on RoyaltyManager with ${DEFAULT_BPS} BPS royalty`);
  }

  const splitterDeployerRole = await read(
    'RoyaltyManager',
    'SPLITTER_DEPLOYER_ROLE'
  );
  if (
    !(await read(
      'RoyaltyManager',
      'hasRole',
      splitterDeployerRole,
      Asset.address
    ))
  ) {
    await catchUnknownSigner(
      execute(
        'RoyaltyManager',
        {from: royaltyManagerAdmin, log: true},
        'grantRole',
        splitterDeployerRole,
        Asset.address
      )
    );
    log(`Asset set on RoyaltyManager with Splitter Deployer Role`);
  }
};

export default func;

func.tags = [
  'Asset',
  'Asset_setup',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['Asset_deploy'];
