import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();
  await deploy('AttributesFaucets', {
    contract: 'Faucets',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

func.tags = ['AttributesFaucets', 'AttributesFaucets_deploy'];
func.skip = skipUnlessTestnet;

export default func;
