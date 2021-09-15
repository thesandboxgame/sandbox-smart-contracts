import {Event} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {ethers, deployments, getNamedAccounts} = hre;
  const {deploy, read, execute, catchUnknownSigner} = deployments;

  const {
    deployer,
    assetAuctionAdmin,
    assetAuctionFeeCollector,
  } = await getNamedAccounts();

  const fee10000th = 500;

  const asset = await deployments.get('Asset');
  const sandContract = await deployments.get('Sand');

  await deploy('AssetSignedAuction', {
    from: deployer,
    args: [
      asset.address,
      assetAuctionAdmin,
      sandContract.address,
      assetAuctionFeeCollector,
      fee10000th,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const assetAuction = await ethers.getContract('AssetSignedAuction');

  const isAssetSuperOperator = await read(
    'Asset',
    'isSuperOperator',
    assetAuction.address
  );
  if (!isAssetSuperOperator) {
    console.log('setting AssetSignedAuction as super operator for Asset');
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
    console.log('setting AssetSignedAuction as super operator for Sand');
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
    console.log(`set AssetSignedAuction's fee to ${fee10000th / 100}%`);
    console.log(
      `set AssetSignedAuction's fee colletor to ${assetAuctionFeeCollector}`
    );
    const currentAssetAuctionAdmin = await read(
      'AssetSignedAuction',
      'getAdmin'
    );
    await catchUnknownSigner(
      execute(
        'AssetSignedAuction',
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
  'AssetSignedAuction',
  'AssetSignedAuction_deploy',
  'AssetSignedAuction_setup',
];
func.dependencies = ['Asset_deploy', 'Sand_deploy'];
