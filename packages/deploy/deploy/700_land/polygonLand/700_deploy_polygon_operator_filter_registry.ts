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
    const MockMarketPlace1 = await deploy('MockMarketPlace1', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/dependency-operator-filter/contracts/mock/MockMarketPlace1.sol:MockERC1155MarketPlace1',
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const MockMarketPlace2 = await deploy('MockMarketPlace2', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/dependency-operator-filter/contracts/mock/MockMarketPlace2.sol:MockERC1155MarketPlace2',
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const defaultSubscription = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';

    await deploy('PolygonOperatorFilterRegistry', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/core/src/solc_0.8/test/MockOperatorFilterRegistry.sol:MockOperatorFilterRegistry',
      args: [
        defaultSubscription,
        [MockMarketPlace1.address, MockMarketPlace2.address],
      ],
      log: true,
      skipIfAlreadyDeployed: true,
    });
  }
};
export default func;
func.tags = ['PolygonOperatorFilterRegistry', 'L1'];
