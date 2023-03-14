import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  await deploy('PolygonOperatorFilterSubscription', {
    from: deployer,
    contract: 'OperatorFilterSubscription',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'polygonOperatorFilterSubscription',
  'polygonOperatorFilterSubscription_deploy',
];
