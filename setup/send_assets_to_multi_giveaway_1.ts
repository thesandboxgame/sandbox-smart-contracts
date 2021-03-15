import fs from 'fs';
import {ethers} from 'ethers';
import hre, {getNamedAccounts} from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {MultiClaim} from '../lib/merkleTreeHelper';

const func: DeployFunction = async function () {
  const {deployments} = hre;
  const {execute, catchUnknownSigner} = deployments;

  const {deployer} = await getNamedAccounts();

  let owner;
  const assetIds: string[] = [];
  const landIds: number[] = [];
  const landIdStart = landIds[0];
  const landIdFinish = landIds[-1];

  let CLAIM_FILE;
  let CONFIG_FILE;
  const sandContract = await deployments.get('Sand');
  const catalystContract = await deployments.get('Catalyst_COMMON');
  const gemContract = await deployments.get('Gem_SPEED');

  switch (hre.network.name) {
    case 'mainnet':
      owner = '';
      CLAIM_FILE = 'data/giveaways/multi_giveaway_1/claims_0_mainnet.json';
      CONFIG_FILE = 'data/giveaways/multi_giveaway_1/config_mainnet.ts';
      break;
    case 'rinkeby':
      owner = deployer;
      CLAIM_FILE = 'data/giveaways/multi_giveaway_1/claims_0_rinkeby.json';
      CONFIG_FILE = 'data/giveaways/multi_giveaway_1/config_rinkeby.ts';
      break;
    default:
      owner = '';
      CLAIM_FILE = 'data/giveaways/multi_giveaway_1/claims_0_hardhat.json';
      CONFIG_FILE = 'data/giveaways/multi_giveaway_1/config_hardhat.ts';
  }

  if (!owner || owner === '') {
    return;
  }

  const MultiGiveaway = await deployments.get('Multi_Giveaway_1');

  let claimData: MultiClaim[];
  try {
    claimData = JSON.parse(fs.readFileSync(CLAIM_FILE).toString());
  } catch (e) {
    console.log('Error', e);
    return;
  }

  // Send Assets

  const totalAssets: number[] = [];
  for (const claim of claimData) {
    for (let i = 0; i < claim.erc1155.length; i++) {
      const asset = claim.erc1155[i];
      for (let j = 0; j < asset.ids.length; j++) {
        // Check claim file
        if (asset.ids[j] !== assetIds[j]) {
          throw new Error('invalid asset');
        }
        totalAssets[j] += asset.values[j];
      }
    }
  }

  console.log({
    assetIds,
    totalAssets,
  });

  await catchUnknownSigner(
    execute(
      'Asset',
      {from: owner, log: true},
      'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',
      owner,
      MultiGiveaway.address,
      [assetIds],
      [totalAssets],
      '0x'
    )
  );

  // Send Lands

  let totalLands: number[] = [];
  for (const claim of claimData) {
    for (let i = 0; i < claim.erc721.length; i++) {
      const land = claim.erc721[i];

      for (let j = 0; j < land.ids.length; j++) {
        // Check claim file
        if (land.ids[j] !== landIds[j]) {
          throw new Error('invalid land');
        }
        // Land is within designated ID limits
        if (land.ids[0] < landIdStart || land.ids[0] > landIdFinish) {
          throw new Error('invalid land');
        }
        totalLands[j] += 1;
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
      throw new Error('incorrect ERC20 order');
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
      throw new Error('incorrect ERC20 order');
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
      throw new Error('incorrect ERC20 order');
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
