import {Event} from 'ethers';
import {ethers, getNamedAccounts} from 'hardhat';
import {DeployFunction, DeploymentsExtension} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {fee10000th} from '../../data/assetSignedAuction';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  await setupContract(deployments, 'AssetSignedAuction', fee10000th);
  const skip = await skipUnlessTestnet(hre);
  if (!skip) {
    await setupContract(deployments, 'AssetSignedAuctionWithAuth', fee10000th);
  }
};

async function setupContract(
  deployments: DeploymentsExtension,
  contractName: string,
  fee10000th: number
) {
  const {execute, read, catchUnknownSigner} = deployments;
  const {assetAuctionFeeCollector} = await getNamedAccounts();

  const assetAuction = await ethers.getContract(contractName);

  const isAssetSuperOperator = await read(
    'Asset',
    'isSuperOperator',
    assetAuction.address
  );
  if (!isAssetSuperOperator) {
    console.log(`setting ${contractName} as super operator for Asset`);
    const currentAssetAdmin = await read('Asset', 'getAdmin');
    await catchUnknownSigner(
      execute(
        'Asset',
        {from: currentAssetAdmin, log: true},
        'setSuperOperator',
        assetAuction.address,
        true
      )
    );
  }

  const isSandSuperOperator = await read(
    'Sand',
    'isSuperOperator',
    assetAuction.address
  );
  if (!isSandSuperOperator) {
    console.log(`setting ${contractName} as super operator for Sand`);
    const currentSandAdmin = await read('Sand', 'getAdmin');
    await catchUnknownSigner(
      execute(
        'Sand',
        {from: currentSandAdmin, log: true},
        'setSuperOperator',
        assetAuction.address,
        true
      )
    );
  }

  const feeEvents = await assetAuction.queryFilter(
    assetAuction.filters.FeeSetup()
  );
  let lastFeeEvent: Event | undefined;
  if (feeEvents.length > 0) {
    lastFeeEvent = feeEvents[feeEvents.length - 1];
  }
  let isFeeSet;
  if (!lastFeeEvent) {
    isFeeSet = false;
  } else {
    const eventArg = lastFeeEvent.args;
    if (eventArg) {
      isFeeSet =
        eventArg[0] === assetAuctionFeeCollector && eventArg[1].eq(fee10000th);
    } else {
      throw new Error(`invalid event`);
    }
  }

  if (!isFeeSet) {
    console.log(`set ${contractName}'s fee to ${fee10000th / 100}%`);
    console.log(
      `set ${contractName}'s fee collector to ${assetAuctionFeeCollector}`
    );
    const currentAssetAuctionAdmin = await read(contractName, 'getAdmin');
    await catchUnknownSigner(
      execute(
        contractName,
        {from: currentAssetAuctionAdmin, log: true},
        'setFee',
        assetAuctionFeeCollector,
        fee10000th
      )
    );
  }
}

export default func;
func.tags = [
  'AssetSignedAuction',
  'AssetSignedAuction_setup',
  'AssetSignedAuctionWithAuth',
  'AssetSignedAuctionWithAuth_setup',
];
func.dependencies = [
  'AssetSignedAuction_deploy',
  'AssetSignedAuctionWithAuth_deploy',
];
