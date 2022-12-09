import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    deployer,
    upgradeAdmin,
    sandAdmin,
    kycAdmin,
  } = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');
  const authValidatorContract = await deployments.get('PolygonAuthValidator');

  const BASE_TOKEN_URI = 'https://helloIamAbaseURI.game/';

  await deploy('PolygonKYCERC721', {
    from: deployer,
    contract: 'KYCERC721',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          sandAdmin,
          kycAdmin,
          TRUSTED_FORWARDER_V2.address,
          authValidatorContract.address,
          BASE_TOKEN_URI,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = ['PolygonKYCERC721', 'PolygonKYCERC721_deploy', 'L2'];
func.dependencies = ['PolygonAuthValidator_deploy'];
func.skip = skipUnlessTestnet;
