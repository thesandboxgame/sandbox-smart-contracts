import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin} = await getNamedAccounts();
  await deploy('FaucetsERC1155', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [sandAdmin],
  });
};

func.tags = ['FaucetsERC1155', 'FaucetsERC1155_deploy'];
func.skip = skipUnlessTestnet;

export default func;
