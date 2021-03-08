import {ethers} from 'ethers';
import fs from 'fs';
import hre, {getNamedAccounts} from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {MultiClaim} from '../lib/merkleTreeHelper';

const func: DeployFunction = async function () {
  const {deployments} = hre;
  const {execute, catchUnknownSigner} = deployments;

  const {deployer} = await getNamedAccounts();

  let owner;
  let tokenId0;
  let tokenId1;
  let landIds: number[] = [];
  const landIdStart = landIds[0];
  const landIdFinish = landIds[-1];

  const CLAIM_FILE = 'data/giveaways/multi_giveaway_1/claims_0_hardhat.json';
  const sandContract = await deployments.get('Sand');
  const catalystContract = await deployments.get('Catalyst_COMMON');
  const gemContract = await deployments.get('Gem_SPEED');

  // TODO: update for the number of tokenIds
  switch (hre.network.name) {
    case 'mainnet':
      owner = '';
      tokenId0 = '';
      tokenId1 = '';
      landIds = [];

      break;
    case 'rinkeby':
      owner = deployer;
      tokenId0 = '';
      tokenId1 = '';
      landIds = [];
      break;
  }

  if (!owner || owner === '') {
    return;
  }

  const MultiGiveaway = await deployments.get('Multi_Giveaway_1');

  // TODO: update for each claim file
  let claimData: MultiClaim[];
  try {
    claimData = JSON.parse(fs.readFileSync(CLAIM_FILE).toString());
  } catch (e) {
    console.log('Error', e);
    return;
  }

  // Send Assets

  let totalAsset0 = 0;
  let totalAsset1 = 0;
  for (const claim of claimData) {
    for (const asset of claim.erc1155) {
      if (asset.ids[0] !== tokenId0) {
        throw new Error(`invalid asset`);
      }
      if (asset.ids[1] !== tokenId1) {
        throw new Error(`invalid asset`);
      }
      totalAsset0 += asset.values[0];
      totalAsset1 += asset.values[1];
    }
  }

  console.log({
    assetId0: tokenId0,
    assetId1: tokenId1,
    totalAsset0,
    totalAsset1,
  });

  await catchUnknownSigner(
    execute(
      'Asset',
      {from: owner, log: true},
      'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',
      owner,
      MultiGiveaway.address,
      [tokenId0, tokenId1],
      [totalAsset0, totalAsset1],
      '0x'
    )
  );

  // Send Lands

  let totalLands = 0;
  for (const claim of claimData) {
    for (const land of claim.erc721) {
      if (land.ids[0] < landIdStart || land.ids[0] > landIdFinish) {
        throw new Error(`invalid land`);
      }
      totalLands += 1;
    }
  }

  console.log({
    totalLands,
  });

  await catchUnknownSigner(
    execute(
      'Land',
      {from: owner, log: true},
      'safeBatchTransferFrom(address,address,uint256[],bytes)',
      owner,
      MultiGiveaway.address,
      [landIds],
      '0x'
    )
  );

  // Send SAND

  let totalSand = 0;
  for (const claim of claimData) {
    if (claim.erc20.contractAddresses[0] !== sandContract.address) {
      throw new Error(`incorrect ERC20 order`);
    }
    totalSand += claim.erc20.amounts[0];
  }

  console.log({
    totalSand,
  });

  // TODO: send SAND

  // Send Catalysts

  let totalCatalysts = 0;
  for (const claim of claimData) {
    if (claim.erc20.contractAddresses[1] !== catalystContract.address) {
      throw new Error(`incorrect ERC20 order`);
    }
    totalCatalysts += claim.erc20.amounts[1];
  }

  console.log({
    totalCatalysts,
  });

  // TODO: send cats

  // Send Gems

  let totalGems = 0;
  for (const claim of claimData) {
    if (claim.erc20.contractAddresses[2] !== gemContract.address) {
      throw new Error(`incorrect ERC20 order`);
    }
    totalGems += claim.erc20.amounts[2];
  }

  console.log({
    totalGems,
  });

  // TODO: send gems
};
export default func;

if (require.main === module) {
  func(hre);
}
