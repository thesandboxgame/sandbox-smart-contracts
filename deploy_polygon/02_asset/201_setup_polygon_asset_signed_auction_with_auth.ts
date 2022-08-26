import {Event} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {fee10000th} from '../../data/assetSignedAuction';
import {queryEvents} from '../../scripts/utils/query-events';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {ethers, deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {assetAuctionFeeCollector} = await getNamedAccounts();

  const PolygonAssetERC1155SignedAuctionWithAuth = await ethers.getContract(
    'PolygonAssetERC1155SignedAuctionWithAuth'
  );
  const isAssetSuperOperator = await read(
    'PolygonAssetERC1155',
    'isSuperOperator',
    PolygonAssetERC1155SignedAuctionWithAuth.address
  );
  if (!isAssetSuperOperator) {
    console.log(
      'setting PolygonAssetERC1155SignedAuctionWithAuth as super operator for PolygonAssetERC1155'
    );
    const currentAssetAdmin = await read('PolygonAssetERC1155', 'getAdmin');
    await catchUnknownSigner(
      execute(
        'PolygonAssetERC1155',
        {from: currentAssetAdmin, log: true},
        'setSuperOperator',
        PolygonAssetERC1155SignedAuctionWithAuth.address,
        true
      )
    );
  }

  const isSandSuperOperator = await read(
    'PolygonSand',
    'isSuperOperator',
    PolygonAssetERC1155SignedAuctionWithAuth.address
  );
  if (!isSandSuperOperator) {
    console.log(
      'setting PolygonAssetERC1155SignedAuctionWithAuth as super operator for PolygonSand'
    );
    const currentSandAdmin = await read('PolygonSand', 'getAdmin');
    await catchUnknownSigner(
      execute(
        'PolygonSand',
        {from: currentSandAdmin, log: true},
        'setSuperOperator',
        PolygonAssetERC1155SignedAuctionWithAuth.address,
        true
      )
    );
  }
  const startBlock =
    (await deployments.get('PolygonAssetERC1155SignedAuctionWithAuth')).receipt
      ?.blockNumber || 0;
  const feeEvents = await queryEvents(
    PolygonAssetERC1155SignedAuctionWithAuth,
    PolygonAssetERC1155SignedAuctionWithAuth.filters.FeeSetup(),
    startBlock
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
    console.log(
      `set PolygonAssetERC1155SignedAuctionWithAuth's fee to ${
        fee10000th / 100
      }%`
    );
    console.log(
      `set PolygonAssetERC1155SignedAuctionWithAuth's fee colletor to ${assetAuctionFeeCollector}`
    );
    const currentAssetAuctionAdmin = await read(
      'PolygonAssetERC1155SignedAuctionWithAuth',
      'getAdmin'
    );
    await catchUnknownSigner(
      execute(
        'PolygonAssetERC1155SignedAuctionWithAuth',
        {from: currentAssetAuctionAdmin, log: true},
        'setFee',
        assetAuctionFeeCollector,
        fee10000th
      )
    );
  }
};
export default func;
func.tags = [
  'PolygonAssetERC1155SignedAuctionWithAuth',
  'PolygonAssetERC1155SignedAuctionWithAuth_setup',
];
func.dependencies = [
  'PolygonAssetERC721_deploy',
  'PolygonAssetERC1155_deploy',
  'PolygonSand_deploy',
];
func.skip = skipUnlessTestnet;
