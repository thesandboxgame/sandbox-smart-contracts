import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read, execute, catchUnknownSigner} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const LandMigrationBatch = await deployments.get('LandMigrationBatch');

  const LandSwap = await deploy('LandSwap', {
    from: deployer,
    contract: 'LandSwapV2',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 1,
    },
    log: true,
  });

  const isMinter = await read('Land', 'isMinter', LandSwap.address);
  if (!isMinter) {
    const admin = await read('Land', 'getAdmin');
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

  const _batchMigration = await read('LandSwap', '_batchMigration');
  if (_batchMigration !== LandMigrationBatch.address) {
    const landSwapAdmin = await read('LandSwap', 'getAdmin');
    await catchUnknownSigner(
      execute(
        'LandSwap',
        {from: landSwapAdmin},
        'setBatchMigration',
        LandMigrationBatch.address
      )
    );
  }
};

export default func;
func.tags = ['LandSwap', 'LandSwapV2', 'LandSwap_deploy'];
func.dependencies = [
  'Land_deploy',
  'Land_Old_deploy',
  'LAND_SWAP_TRUSTED_FORWARDER',
  'LandMigrationBatch_deploy',
];
