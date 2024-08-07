import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, catchUnknownSigner} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  await catchUnknownSigner(
    deploy('PolygonLand', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/core/src/solc_0.8/polygon/child/land/PolygonLandV1.sol:PolygonLandV1',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [TRUSTED_FORWARDER.address],
        },
        upgradeIndex: 0,
      },
      log: true,
    })
  );
};
export default func;
func.tags = [
  'PolygonLand',
  'PolygonLandV1',
  'PolygonLand_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
