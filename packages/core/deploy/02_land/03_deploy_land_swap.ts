import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read, execute, catchUnknownSigner} = deployments;

  const {deployer, sandAdmin, upgradeAdmin} = await getNamedAccounts();
  const LAND_SWAP_TRUSTED_FORWARDER = await deployments.get(
    'LAND_SWAP_TRUSTED_FORWARDER'
  );
  const LandOld = await deployments.get('Land_Old');
  const Land = await deployments.get('Land');

  const LandSwap = await deploy('LandSwap', {
    from: deployer,
    contract: 'LandSwap',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          sandAdmin,
          LAND_SWAP_TRUSTED_FORWARDER.address,
          LandOld.address,
          Land.address,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });

  const admin = await read('Land', 'getAdmin');
  const isMinter = await read('Land', 'isMinter', LandSwap.address);
  if (!isMinter) {
    await catchUnknownSigner(
      execute('Land', {from: admin}, 'setMinter', LandSwap.address, true)
    );
  }

  const isMetaTransactionProcessor = await read(
    'Land_Old',
    'isMetaTransactionProcessor',
    LandSwap.address
  );
  if (!isMetaTransactionProcessor) {
    const adminOld = await read('Land_Old', 'getAdmin');
    await catchUnknownSigner(
      execute(
        'Land_Old',
        {from: adminOld},
        'setMetaTransactionProcessor',
        LandSwap.address,
        true
      )
    );
  }
};

export default func;
func.tags = ['LandSwap', 'LandSwap_deploy'];
func.dependencies = [
  'Land_deploy',
  'Land_Old_deploy',
  'LAND_SWAP_TRUSTED_FORWARDER',
];
