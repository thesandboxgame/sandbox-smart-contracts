import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  await deploy('OperatorFiltererLib', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const operatorFiltererLib = await deployments.get('OperatorFiltererLib');

  await deploy('Land', {
    from: deployer,
    contract: 'LandV3',
    libraries: {
      OperatorFiltererLib: operatorFiltererLib.address,
    },
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 2,
    },
    log: true,
  });
};

export default func;
func.tags = ['Land', 'LandV3', 'LandV3_deploy'];
func.dependencies = ['Land_deploy', 'Land_Old_deploy', 'LandV2_deploy'];
