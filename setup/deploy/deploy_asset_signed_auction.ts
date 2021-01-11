import {Event} from 'ethers';
import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {ethers, deployments, getNamedAccounts} = hre;
  const {deploy, log, read, execute} = deployments;

  const {
    deployer,
    assetAuctionAdmin,
    assetAuctionFeeCollector,
  } = await getNamedAccounts();

  const assetAuctionFee10000th = 500;

  const asset = await deployments.get('Asset');
  const sandContract = await deployments.get('Sand');

  await deploy('AssetSignedAuction', {
    from: deployer,
    args: [
      asset.address,
      assetAuctionAdmin,
      sandContract.address,
      assetAuctionFeeCollector,
      assetAuctionFee10000th,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const assetAuction = await ethers.getContract('AssetSignedAuction');

  const isSandSuperOperator = await read(
    'Sand',
    'isSuperOperator',
    assetAuction.address
  );
  if (!isSandSuperOperator) {
    log('setting AssetSignedAuction as super operator for Sand');
    const currentSandAdmin = await read('Sand', 'getAdmin');
    await execute(
      'Sand',
      {from: currentSandAdmin},
      'setSuperOperator',
      assetAuction.address,
      true
    );
  }

  const isAssetSuperOperator = await read(
    'Asset',
    'isSuperOperator',
    assetAuction.address
  );
  if (!isAssetSuperOperator) {
    log('setting AssetSignedAuction as super operator for Asset');
    const currentAssetAdmin = await read('Asset', 'getAdmin');
    await execute(
      'Asset',
      {from: currentAssetAdmin},
      'setSuperOperator',
      assetAuction.address,
      true
    );
  }

  const fee10000th = 500;
  const feeEvents = await assetAuction.queryFilter(
    assetAuction.filters.FeeSetup()
  );
  let lastFeeEvent: Event | undefined;
  if (feeEvents.length > 0) {
    lastFeeEvent = feeEvents[feeEvents.length - 1];
    // console.log(JSON.stringify(lastFeeEvent));
  }
  let feeToSet = false;
  if (!lastFeeEvent) {
    feeToSet = true;
  } else {
    const eventArg = lastFeeEvent.args;
    if (eventArg) {
      feeToSet = !eventArg[1].eq(fee10000th);
    } else {
      throw new Error(`ínvalid event`);
    }
  }

  if (feeToSet) {
    log("set AssetSignedAuction's fee to 5%");
    const currentAssetAuctionAdmin = await read(
      'AssetSignedAuction',
      'getAdmin'
    );
    await execute(
      'AssetSignedAuction',
      {from: currentAssetAuctionAdmin},
      'setFee',
      assetAuctionFeeCollector,
      fee10000th
    );
  }
};
export default func;
if (require.main === module) {
  func(hre);
}
