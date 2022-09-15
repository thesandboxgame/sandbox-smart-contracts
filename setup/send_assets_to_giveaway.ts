/**
 * How to use:
 *  - yarn execute <NETWORK> ./setup/send_assets_to_giveaway.ts <GIVEAWAY_SUFFIX>
 *
 * The suffix of the giveaway comes from the folder, ie: ./data/giveaways/asset_giveaway_6 => 6
 */
import hre from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import fs from 'fs-extra';
import {AssetClaim, AssetHash} from '../lib/merkleTreeHelper';

const {deployments} = hre;
const {read, execute, catchUnknownSigner} = deployments;

const args = process.argv.slice(2);
const giveawaySuffix = args[0];

function getAssets(giveawayName: string, networkName: string): AssetHash {
  const path = `./data/giveaways/${giveawayName}/assets_${networkName}.json`;
  const json: Array<AssetClaim> = fs.readJSONSync(path);
  const assetIdsCount: AssetHash = {};
  json.forEach((claim) => {
    claim.assetIds.forEach((id, index) => {
      if (!assetIdsCount[id]) assetIdsCount[id] = 0;
      assetIdsCount[id] += claim.assetValues[index];
    });
  });
  return assetIdsCount;
}

void (async () => {
  const networkName = hre.network.name;
  const giveawayName = `Asset_Giveaway_${giveawaySuffix}`;
  const assetIdsCount = await getAssets(
    giveawayName.toLowerCase(),
    networkName
  );

  console.log(giveawayName);

  const giveaway = await deployments.get(giveawayName);
  const owner =
    networkName === 'mainnet'
      ? '0x7A9fe22691c811ea339D9B73150e6911a5343DcA'
      : '0x5BC3D5A39a50BE2348b9C529f81aE79f00945897';
  const ids = [];
  const values = [];
  for (const assetId in assetIdsCount) {
    const balance: BigNumber = await read(
      'Asset',
      'balanceOf(address,uint256)',
      giveaway.address,
      assetId
    );
    const assetCount = BigNumber.from(assetIdsCount[assetId]);
    if (balance.lt(assetCount)) {
      ids.push(assetId);
      values.push(assetCount.sub(balance).toNumber());
    }
  }
  if (ids.length > 0) {
    console.log(giveawayName, JSON.stringify(assetIdsCount, null, '  '));
    await catchUnknownSigner(
      execute(
        'Asset',
        {from: owner, log: true},
        'safeBatchTransferFrom',
        owner,
        giveaway.address,
        ids,
        values,
        '0x'
      )
    );
  }
})();
