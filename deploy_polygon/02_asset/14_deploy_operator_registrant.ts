import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('PolygonOperatorFilterSubscription', {
    from: deployer,
    contract: 'OperatorFilterSubscription',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'polygonOperatorFilterSubscription',
  'polygonOperatorFilterSubscription_deploy',
];
func.skip = skipUnlessTestnet;
