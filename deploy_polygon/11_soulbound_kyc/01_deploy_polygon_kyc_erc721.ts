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
    kycAdmin,
    backendKYCWallet,
  } = await getNamedAccounts();
  const {deploy} = deployments;

  const BASE_TOKEN_URI = 'https://helloIamAbaseURI.game/';

  await deploy('PolygonKYCERC721', {
    from: deployer,
    contract: 'KYCERC721',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [kycAdmin, backendKYCWallet, BASE_TOKEN_URI],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = ['PolygonKYCERC721', 'PolygonKYCERC721_deploy', 'L2'];
func.dependencies = [];
func.skip = skipUnlessTestnet;
