import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  //   const operatorFilterSubscription = await deployments.get(
  //     'PolygonOperatorFilterSubscription'
  //   );

  const TRUSTED_FORWARDER = '0x3d2341ADb2D31f1c5530cDC622016af293177AE0';

  await deploy('PolygonLand', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/core/src/solc_0.8/polygon/child/land/PolygonLandV2.sol:PolygonLandV2',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [TRUSTED_FORWARDER],
        },
      },
    },
    log: true,
  });

  // TODO Work on making this work
  //   const admin = await deployments.read('PolygonLand', 'getAdmin');

  //   const operatorFilterRegistry = await deployments.get(
  //     'PolygonOperatorFilterRegistry'
  //   );

  //   await deployments.execute(
  //     'PolygonLand',
  //     {from: admin},
  //     'setOperatorRegistry',
  //     operatorFilterRegistry.address
  //   );

  //   await deployments.execute(
  //     'PolygonLand',
  //     {from: admin},
  //     'register',
  //     operatorFilterSubscription.address,
  //     true
  //   );
};
export default func;
func.tags = ['PolygonLand', 'PolygonLand_deploy', 'L2'];
