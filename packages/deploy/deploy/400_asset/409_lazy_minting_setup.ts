import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, log, read, catchUnknownSigner} = deployments;
  const {assetAdmin, treasury, sandAdmin} = await getNamedAccounts();

  const exchangeContract = await deployments.get('Exchange');
  const AssetCreate = await deployments.get('AssetCreate');
  const CatalystContract = await deployments.get('Catalyst');

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

  const exchangeAddress = await read('AssetCreate', 'getExchangeContract');
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

  const ERC1776_OPERATOR_ROLE = await read('Exchange', 'ERC1776_OPERATOR_ROLE');
  const hasERC1776OperatorRole = await read(
    'Exchange',
    'hasRole',
    ERC1776_OPERATOR_ROLE,
    AssetCreate.address
  );
  if (!hasERC1776OperatorRole) {
    await catchUnknownSigner(
      execute(
        'Exchange',
        {from: sandAdmin, log: true},
        'grantRole',
        ERC1776_OPERATOR_ROLE,
        AssetCreate.address
      )
    );
    log(
      `[AssetCreate-Lazy Minting] Granted ERC1776_OPERATOR_ROLE to AssetCreate`
    );
  }

  const TSB_ROLE = await read('OrderValidator', 'TSB_ROLE');
  const addressesToGrant = [];
  addressesToGrant[TSB_ROLE] = [CatalystContract.address];
  for (const role in addressesToGrant) {
    for (const address of addressesToGrant[role]) {
      const hasRole = await read('OrderValidator', 'hasRole', role, address);

      if (!hasRole) {
        await catchUnknownSigner(
          execute(
            'OrderValidator',
            {from: sandAdmin, log: true},
            'grantRole',
            role,
            address
          )
        );
      }
    }
  }
};

export default func;

func.tags = ['Asset', 'AssetCreate', 'AssetCreate_lazy_setup'];
func.dependencies = ['AssetCreate_upgrade', 'Exchange_setup'];
