import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  await deploy('Land', {
    from: deployer,
    contract: '@sandbox-smart-contracts/core/src/solc_0.5/LandV3.sol:LandV3',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 2,
    },
    log: true,
  });

  const admin = await deployments.read('Land', 'getAdmin');

  const operatorFilterRegistry = await deployments.get(
    'OperatorFilterRegistry'
  );
  const OperatorFilterLandSubscription = await deployments.get(
    'OperatorFilterLandSubscription'
  );

  await deployments.execute(
    'Land',
    {from: admin},
    'setOperatorRegistry',
    operatorFilterRegistry.address
  );

  await deployments.execute(
    'Land',
    {from: admin},
    'register',
    OperatorFilterLandSubscription.address,
    true
  );
};

export default func;
func.tags = ['Land', 'LandV3', 'LandV3_deploy'];
func.dependencies = [
  'Land_deploy',
  'LandV2_deploy',
  'OperatorFilterLandSubscription',
];
