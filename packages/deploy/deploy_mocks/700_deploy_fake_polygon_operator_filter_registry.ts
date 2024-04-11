import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const operatorFilterRegistry = await deployments.getOrNull(
    'PolygonOperatorFilterRegistry'
  );

  if (!operatorFilterRegistry) {
    const defaultSubscription = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';

    await deploy('PolygonOperatorFilterRegistry', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/dependency-operator-filter/contracts/mock/MockOperatorFilterRegistry.sol:MockOperatorFilterRegistry',
      args: [defaultSubscription, []],
      log: true,
      skipIfAlreadyDeployed: true,
    });
  }
};
export default func;
func.tags = ['PolygonOperatorFilterRegistry', 'L1'];
// skip when the network is hardhat or localhost
func.skip = async (hre: HardhatRuntimeEnvironment) => {
  return hre.network.name !== 'hardhat' && hre.network.name !== 'localhost';
};
