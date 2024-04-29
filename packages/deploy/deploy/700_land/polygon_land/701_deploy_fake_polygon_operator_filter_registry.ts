import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, landAdmin} = await getNamedAccounts();

  const operatorFilterRegistry = await deployments.getOrNull(
    'PolygonOperatorFilterRegistry'
  );

  if (!operatorFilterRegistry) {
    const mockMarketPlace1 = await deploy('MockMarketPlace1', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/dependency-operator-filter/contracts/mock/MockMarketPlace1.sol:MockERC1155MarketPlace1',
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const mockMarketPlace2 = await deploy('MockMarketPlace2', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/dependency-operator-filter/contracts/mock/MockMarketPlace2.sol:MockERC1155MarketPlace2',
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const mockMarketPlace3 = await deploy('MockMarketPlace3', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/dependency-operator-filter/contracts/mock/MockMarketPlace3.sol:MockERC1155MarketPlace3',
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const mockMarketPlace4 = await deploy('MockMarketPlace4', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/dependency-operator-filter/contracts/mock/MockMarketPlace4.sol:MockERC1155MarketPlace4',
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const defaultSubscription = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';
    const OperatorFilterLandSubscription = await deployments.get(
      'OperatorFilterLandSubscription'
    );

    await deploy('PolygonOperatorFilterRegistry', {
      from: deployer,
      contract: 'MockOperatorFilterRegistry',
      args: [
        defaultSubscription,
        [mockMarketPlace1.address, mockMarketPlace2.address],
      ],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await deployments.execute(
      'PolygonOperatorFilterRegistry',
      {from: landAdmin, log: true},
      'registerAndCopyEntries',
      OperatorFilterLandSubscription.address,
      defaultSubscription
    );
  }
};
export default func;
func.tags = ['PolygonOperatorFilterRegistry', 'L2'];
func.dependencies = ['OperatorFilterLandSubscription'];
