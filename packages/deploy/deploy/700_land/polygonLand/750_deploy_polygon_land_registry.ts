import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, catchUnknownSigner} = deployments;
  const {deployer, sandAdmin, upgradeAdmin} = await getNamedAccounts();
  await catchUnknownSigner(
    deploy('LandMetadataRegistry', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/land/contracts/LandMetadataRegistry.sol:LandMetadataRegistry',
      log: true,
      skipIfAlreadyDeployed: true,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [sandAdmin],
        },
        upgradeIndex: 0,
      },
    })
  );
};

func.tags = [
  'PolygonLand',
  'PolygonLandMetadataRegistry',
  'PolygonLandMetadataRegistry_deploy',
  'L2',
];
export default func;
