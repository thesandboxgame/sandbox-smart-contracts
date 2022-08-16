import {Event} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {queryEvents} from '../../scripts/utils/query-events';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {ethers, deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {assetAuctionFeeCollector} = await getNamedAccounts();

  const PolygonAssetERC1155SignedAuction = await ethers.getContract(
    'PolygonAssetERC1155SignedAuction'
  );
  const isAssetSuperOperator = await read(
    'PolygonAssetERC1155',
    'isSuperOperator',
    PolygonAssetERC1155SignedAuction.address
  );
  if (!isAssetSuperOperator) {
    console.log(
      'setting PolygonAssetERC1155SignedAuction as super operator for PolygonAssetERC1155'
    );
    const currentAssetAdmin = await read('PolygonAssetERC1155', 'getAdmin');
    await catchUnknownSigner(
      execute(
        'PolygonAssetERC1155',
        {from: currentAssetAdmin, log: true},
        'setSuperOperator',
        PolygonAssetERC1155SignedAuction.address,
        true
      )
    );
  }

  const isSandSuperOperator = await read(
    'PolygonSand',
    'isSuperOperator',
    PolygonAssetERC1155SignedAuction.address
  );
  if (!isSandSuperOperator) {
    console.log(
      'setting PolygonAssetERC1155SignedAuction as super operator for PolygonSand'
    );
    const currentSandAdmin = await read('PolygonSand', 'getAdmin');
    await catchUnknownSigner(
      execute(
        'PolygonSand',
        {from: currentSandAdmin, log: true},
        'setSuperOperator',
        PolygonAssetERC1155SignedAuction.address,
        true
      )
    );
  }
  const startBlock = PolygonAssetERC1155SignedAuction.deployTransaction.blockNumber || 0;
  const fee10000th = 500;
  const feeEvents = await queryEvents(
    PolygonAssetERC1155SignedAuction,
    PolygonAssetERC1155SignedAuction.filters.FeeSetup(),
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
      `set PolygonAssetERC1155SignedAuction's fee to ${fee10000th / 100}%`
    );
    console.log(
      `set PolygonAssetERC1155SignedAuction's fee colletor to ${assetAuctionFeeCollector}`
    );
    const currentAssetAuctionAdmin = await read(
      'PolygonAssetERC1155SignedAuction',
      'getAdmin'
    );
    await catchUnknownSigner(
      execute(
        'PolygonAssetERC1155SignedAuction',
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
  'PolygonAssetERC1155SignedAuction',
  'PolygonAssetERC1155SignedAuction_setup',
];
func.dependencies = [
  'PolygonAssetERC721_deploy',
  'PolygonAssetERC1155_deploy',
  'PolygonSand_deploy',
];
func.skip = skipUnlessTestnet;
