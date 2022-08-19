import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('PolygonLease', {
    contract: 'Lease',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [],
  });
};
export default func;
func.tags = ['PolygonLease', 'PolygonLease_deploy', 'L2'];
func.dependencies = [
  // 'TRUSTED_FORWARDERV2',
  // 'PolygonAssetERC1155_deploy',
  // 'PolygonLand_deploy',
  // 'PolygonSand_deploy',
];
func.skip = skipUnlessTest;
