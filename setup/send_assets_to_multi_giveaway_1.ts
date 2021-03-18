import fs from 'fs';
import hre, {getNamedAccounts} from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {MultiClaim} from '../lib/merkleTreeHelper';

const func: DeployFunction = async function () {
  const {deployments} = hre;
  const {execute, catchUnknownSigner} = deployments;

  const {deployer} = await getNamedAccounts();

  let owner;
  let CLAIM_FILE;
  let CONFIG_FILE;

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
      owner = deployer;
      CLAIM_FILE = 'data/giveaways/multi_giveaway_1/claims_0_hardhat.json';
      CONFIG_FILE = 'data/giveaways/multi_giveaway_1/config_hardhat.ts';
  }

  if (!owner || owner === '') {
    return;
  }

  const MultiGiveaway = await deployments.get('Multi_Giveaway_1');

  let claimData: MultiClaim[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let config: any;
  try {
    claimData = JSON.parse(fs.readFileSync(CLAIM_FILE).toString());
    config = JSON.parse(fs.readFileSync(CONFIG_FILE).toString());
  } catch (e) {
    console.log('Error', e);
    return;
  }

  // Send ERC1155

  const totalAssets: number[] = [];
  for (const claim of claimData) {
    for (let i = 0; i < claim.erc1155.length; i++) {
      const asset = claim.erc1155[i];
      for (let j = 0; j < asset.ids.length; j++) {
        // Check claims against config file
        if (asset.ids[j] !== config.erc1155.contracts[i].ids[j]) {
          throw new Error('invalid asset ID');
        }
        if (asset.values[j] !== config.erc1155.contracts[i].supply[j]) {
          throw new Error('invalid supply');
        }
        totalAssets[j] += asset.values[j];
      }

      await catchUnknownSigner(
        execute(
          config.erc1155.contracts[i].contractName,
          {from: owner, log: true},
          'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',
          owner,
          MultiGiveaway.address,
          config.erc1155.contracts[i].ids,
          totalAssets,
          '0x'
        )
      );
    }
  }

  // Send ERC721

  const totalLands: number[] = [];
  for (const claim of claimData) {
    for (let i = 0; i < claim.erc721.length; i++) {
      const land = claim.erc721[i];
      for (let j = 0; j < land.ids.length; j++) {
        // Check claims against config file
        if (land.ids[j] !== config.erc721.contracts[i].ids[j]) {
          throw new Error('invalid asset ID');
        }
        totalLands[j] += 1;
      }

      await catchUnknownSigner(
        execute(
          config.erc721.contracts[i].name,
          {from: owner, log: true},
          'safeBatchTransferFrom(address,address,uint256[],bytes)', // may need to split this into multiple tx?
          owner,
          MultiGiveaway.address,
          config.erc721.contracts[i].ids,
          '0x'
        )
      );
    }
  }

  // Send ERC20

  for (const claim of claimData) {
    for (let i = 0; i < claim.erc20.amounts.length; i++) {
      let totalTokens = 0;
      // Check claims against config file
      if (claim.erc20.amounts[i] !== config.erc20.contracts[i].amount) {
        throw new Error('incorrect ERC20 amount');
      }
      if (
        claim.erc20.contractAddresses[i] !==
        config.erc20.contracts[i].contractAdddress
      ) {
        throw new Error('incorrect ERC20 contract address');
      }
      totalTokens += claim.erc20.amounts[0];

      await catchUnknownSigner(
        execute(
          config.erc20.contracts[i].name,
          {from: owner, log: true},
          'safeTransferFrom(address,address,uint256)',
          owner,
          MultiGiveaway.address,
          totalTokens,
          '0x'
        )
      );
    }
  }
};
export default func;

if (require.main === module) {
  func(hre);
}
