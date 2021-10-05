/**
 * How to use:
 *  - yarn execute <NETWORK> ./setup/send_assets_to_multi_giveaway.ts <MULTI_GIVEAWAY_NAME> <GIVEAWAY_NAME>
 *
 * MULTI_GIVEAWAY_NAME: should be the same as the contract deployment name
 * GIVEAWAY_NAME: from data/giveaways/multi_giveaway_1/detective_letty.json then the giveaway name is: detective_letty
 */
import fs from 'fs-extra';
import hre from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {DeployFunction} from 'hardhat-deploy/types';
import {MultiClaim, AssetHash} from '../lib/merkleTreeHelper';
const {deployments, getNamedAccounts} = hre;
const {execute, catchUnknownSigner, read} = deployments;

const args = process.argv.slice(2);
const multiGiveawayName = args[0];
const claimFile = args[1];

function getAssets(multiGiveawayName: string, giveawayName: string): AssetHash {
  const path = `./data/giveaways/${multiGiveawayName.toLowerCase()}/${giveawayName}.json`;
  const json: Array<MultiClaim> = fs.readJSONSync(path);
  const assetIdsCount: AssetHash = {};
  json.forEach((claim) => {
    claim.erc1155.forEach(({ids, values}) => {
      ids.forEach((id, index) => {
        if (!assetIdsCount[id]) assetIdsCount[id] = 0;
        assetIdsCount[id] += values[index];
      });
    });
  });
  return assetIdsCount;
}

const func: DeployFunction = async function () {
  const assetIdsCount = await getAssets(multiGiveawayName, claimFile);
  const MultiGiveaway = await deployments.get(multiGiveawayName);
  const {sandboxAccount: owner} = await getNamedAccounts();
  // Send ERC1155
  const ids = [];
  const values = [];
  for (const assetId in assetIdsCount) {
    const balance: BigNumber = await read(
      'Asset',
      'balanceOf(address,uint256)',
      MultiGiveaway.address,
      assetId
    );
    const assetCount = BigNumber.from(assetIdsCount[assetId]);
    if (balance.lt(assetCount)) {
      ids.push(assetId);
      values.push(assetCount.sub(balance).toNumber());
    }
  }
  if (ids.length > 0) {
    console.log(claimFile, JSON.stringify(assetIdsCount, null, '  '));
    await catchUnknownSigner(
      execute(
        'Asset',
        {from: owner, log: true},
        'safeBatchTransferFrom',
        owner,
        MultiGiveaway.address,
        ids,
        values,
        '0x'
      )
    );
  }
};
export default func;

if (require.main === module) {
  func(hre);
}
