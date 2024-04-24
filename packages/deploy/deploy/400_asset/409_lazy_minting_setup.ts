import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log, read, catchUnknownSigner} = deployments;
  const {assetAdmin, treasury} = await getNamedAccounts();

  const exchangeContract = await deployments.get('Exchange');

  const LAZY_MINTING_FEE_BPS = 0;

  const mintingFee = await read('AssetCreate', 'lazyMintFeeInBps');
  if (Number(mintingFee) !== LAZY_MINTING_FEE_BPS) {
    await catchUnknownSigner(
      execute(
        'AssetCreate',
        {from: assetAdmin, log: true},
        'setLazyMintFee',
        LAZY_MINTING_FEE_BPS
      )
    );
    log(
      `[AssetCreate-Lazy Minting] Lazy minting fee set to ${LAZY_MINTING_FEE_BPS}`
    );
  }

  const mintingFeeReceiver = await read('AssetCreate', 'lazyMintFeeReceiver');
  if (mintingFeeReceiver !== treasury) {
    await catchUnknownSigner(
      execute(
        'AssetCreate',
        {from: assetAdmin, log: true},
        'setLazyMintFeeReceiver',
        treasury
      )
    );
    log(
      `[AssetCreate-Lazy Minting] Lazy minting fee receiver set to ${treasury}`
    );
  }

  const exchangeAddress = await read('AssetCreate', 'exchangeContract');
  if (exchangeAddress !== exchangeContract.address) {
    await catchUnknownSigner(
      execute(
        'AssetCreate',
        {from: assetAdmin, log: true},
        'setExchangeContract',
        exchangeContract.address
      )
    );
    log(
      `[AssetCreate-Lazy Minting] Exchange address set to ${exchangeContract.address}`
    );
  }
};

export default func;

func.tags = ['Asset', 'AssetCreate', 'AssetCreate_lazy_setup'];
func.dependencies = ['AssetCreate_upgrade'];
