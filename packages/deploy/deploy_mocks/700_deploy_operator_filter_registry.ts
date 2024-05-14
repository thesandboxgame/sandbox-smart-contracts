import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const MockMarketPlace1 = await deployments.get('MockERC1155MarketPlace1');
  const MockMarketPlace2 = await deployments.get('MockERC1155MarketPlace2');

  const defaultSubscription = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';

  await deploy('OperatorFilterRegistry', {
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
};
export default func;
func.tags = ['OperatorFilterRegistry'];
func.dependencies = ['MockERC1155MarketPlace1', 'MockERC1155MarketPlace2'];
