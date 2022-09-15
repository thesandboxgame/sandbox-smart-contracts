/**
 * How to use:
 *  - yarn execute <NETWORK> ./setup/send_assets_to_multi_giveaway.ts <MULTI_GIVEAWAY_NAME> <GIVEAWAY_NAME> [ASSET_HOLDER_ADDRESS]
 *
 * MULTI_GIVEAWAY_NAME: should be the same as the contract deployment name
 * GIVEAWAY_NAME: from data/giveaways/multi_giveaway_1/detective_letty.json then the giveaway name is: detective_letty
 */
import fs from 'fs-extra';
import hre from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {DeployFunction} from 'hardhat-deploy/types';
import {AssetHash, MultiClaim} from '../lib/merkleTreeHelper';

const {deployments, getNamedAccounts} = hre;
const {execute, catchUnknownSigner, read} = deployments;

const args = process.argv.slice(2);
const multiGiveawayName = args[0];
const claimFile = args[1];
const assetHolder = args[2];

function getAssets(json: Array<MultiClaim>): AssetHash {
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

type ERC20Hash = {
  [address: string]: BigNumber;
};

function getERC20(json: Array<MultiClaim>): ERC20Hash {
  const erc20Hash: ERC20Hash = {};
  json.forEach((claim) => {
    claim.erc20.contractAddresses.forEach((address, index) => {
      if (!erc20Hash[address]) {
        erc20Hash[address] = BigNumber.from(0);
      }
      erc20Hash[address] = erc20Hash[address].add(
        BigNumber.from(claim.erc20.amounts[index])
      );
    });
  });
  return erc20Hash;
}

const func: DeployFunction = async function () {
  const path = `./data/giveaways/${multiGiveawayName.toLowerCase()}/${claimFile}.json`;
  const json: Array<MultiClaim> = fs.readJSONSync(path);
  const assetIdsCount = getAssets(json);
  const MultiGiveaway = await deployments.get(multiGiveawayName);
  const {sandboxAccount, sandboxFoundation} = await getNamedAccounts();
  const owner = assetHolder || sandboxAccount;
  // Send ERC1155
  const ids = [];
  const values = [];
  for (const assetId in assetIdsCount) {
    const assetCount = BigNumber.from(assetIdsCount[assetId]);

    ids.push(assetId);
    values.push(assetCount.toNumber());
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
  const erc20Hash = getERC20(json);
  const sandContractName = hre.network.tags.L1 ? 'Sand' : 'PolygonSand';
  const sandContract = await deployments.get(sandContractName);

  for (const address in erc20Hash) {
    if (address.toLocaleLowerCase() != sandContract.address.toLocaleLowerCase())
      continue;
    const amount = erc20Hash[address];
    console.log(sandContract.address);
    console.log('sand rewards');
    console.log(amount.toString());
    console.log('foundation balance');
    console.log(
      (
        await read(sandContractName, {}, 'balanceOf', sandboxFoundation)
      ).toString()
    );
    await catchUnknownSigner(
      execute(
        sandContractName,
        {from: sandboxFoundation, log: true},
        'transfer',
        MultiGiveaway.address,
        amount
      )
    );
  }
};
export default func;

if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
