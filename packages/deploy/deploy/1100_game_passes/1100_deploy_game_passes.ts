import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    treasury,
    commonRoyaltyReceiver,
    backendAuthWallet,
    sandAdmin,
    upgradeAdmin,
  } = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('SandboxForwarder');
  const sandContract = await deployments.get('PolygonSand');
  const BASE_URL = 'https://contracts.sandbox.game';

  await deploy('GamePasses', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/game-passes/contracts/GamePasses.sol:GamePasses',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          {
            baseURI: BASE_URL,
            royaltyReceiver: commonRoyaltyReceiver,
            royaltyFeeNumerator: 500, // 5%
            admin: sandAdmin,
            operator: deployer,
            signer: backendAuthWallet,
            paymentToken: sandContract.address,
            trustedForwarder: TRUSTED_FORWARDER.address,
            defaultTreasury: treasury,
            owner: sandAdmin,
          },
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;

func.tags = [
  'GamePass',
  'GamePass_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'OperatorFilterAssetSubscription_deploy',
  'TRUSTED_FORWARDER_V2',
  'RoyaltyManager_deploy',
];
