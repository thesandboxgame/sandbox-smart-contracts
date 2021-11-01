import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const {deployer} = await getNamedAccounts();
  await deploy(`PolygonGemsCatalystsRegistry`, {
    from: deployer,
    log: true,
    args: [deployer, TRUSTED_FORWARDER.address],
    contract: `GemsCatalystsRegistry`,
  });
};
export default func;
func.tags = [
  'PolygonGemsCatalystsRegistry',
  'PolygonGemsCatalystsRegistry_deploy',
  'L2',
];
func.dependencies = ['TRUSTED_FORWARDER'];
