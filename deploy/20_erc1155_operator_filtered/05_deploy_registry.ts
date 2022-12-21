import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';
import {ethers} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();
  const MockMarketPlace1 = await ethers.getContract('MockMarketPlace1');
  const MockMarketPlace2 = await ethers.getContract('MockMarketPlace2');
  const subscription = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';

  await deploy('MockOperatorFilterRegistry', {
    from: deployer,
    args: [subscription, [MockMarketPlace1.address, MockMarketPlace2.address]],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['OperatorFilterRegistry', 'OperatorFilterRegistry_deploy'];
func.dependencies = [
  'MockMarketPlace1_deploy',
  'MockMarketPlace2_deploy',
  'MockMarketPlace3_deploy',
];
func.skip = skipUnlessTestnet;
