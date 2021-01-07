import {BigNumber} from 'ethers';
import fs from 'fs-extra';
import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

const readOnly = false;
const BATCH_SIZE = 50;

let totalGasUsed = BigNumber.from(0);

const func: DeployFunction = async function () {
  const {ethers, getNamedAccounts, network} = hre;

  const transfer_executed_file = `tmp/transfer_executed_${network.name}.json`;
  const {deployer} = await getNamedAccounts();
  const DeployerBatch = await ethers.getContract('DeployerBatch', deployer);

  const Asset = await ethers.getContract('NewAsset');

  const toContracts: Record<string, string> = {};

  const {transfers} = JSON.parse(
    fs.readFileSync('tmp/asset_regenerations.json').toString()
  );
  let transferExecuted: Record<number, {hash: string; nonce: number}>;
  try {
    transferExecuted = JSON.parse(
      fs.readFileSync(transfer_executed_file).toString()
    );
  } catch (e) {
    transferExecuted = {};
  }
  function saveTransfersTransaction(
    transfers: number[],
    tx: {hash: string; nonce: number}
  ) {
    if (network.name === 'hardhat') {
      return;
    }
    for (const index of transfers) {
      transferExecuted[index] = {hash: tx.hash, nonce: tx.nonce};
    }
    fs.writeFileSync(
      transfer_executed_file,
      JSON.stringify(transferExecuted, null, '  ')
    );
  }

  type Transfer = {
    index: number;
    to: string;
    ids: string[];
    values: string[];
  };

  console.log({transfers: transfers.length});

  const suppliesRequired: Record<string, number> = {};
  for (const transfer of transfers) {
    const {to, ids, values} = transfer;
    for (let i = 0; i < ids.length; i++) {
      if (!suppliesRequired[ids[i]]) {
        suppliesRequired[ids[i]] = 0;
      }
      suppliesRequired[ids[i]] += BigNumber.from(values[i]).toNumber();
    }
  }

  for (const tokenId of Object.keys(suppliesRequired)) {
    const supplyRequired = suppliesRequired[tokenId];
    const balance = await Asset.callStatic['balanceOf(address,uint256)'](
      DeployerBatch.address,
      tokenId
    );
    if (balance.toNumber() < supplyRequired) {
      console.log(
        `not enough balance for ${tokenId}: ${balance.toNumber()} vs ${supplyRequired} (required)`
      );
    }
  }

  const batches: Transfer[][] = [];

  let currentBatch: Transfer[] = [];
  let index = 0;
  for (const transfer of transfers) {
    if (currentBatch.length >= BATCH_SIZE) {
      batches.push(currentBatch);
      currentBatch = [];
    }
    const {to, ids, values} = transfer;
    const performed = transferExecuted[index];

    let recordedContract = toContracts[to];
    if (!recordedContract) {
      // console.log(`${index}: checking contract. ${to}..`);
      const codeAtTo = await ethers.provider.getCode(to);
      if (codeAtTo !== '0x') {
        recordedContract = 'yes';
      } else {
        recordedContract = 'no';
      }
      toContracts[to] = recordedContract;
    }

    const toIsContract = recordedContract === 'yes';

    if (toIsContract) {
      console.log(`contract at ${to}`);
    } else if (!performed) {
      currentBatch.push({
        index,
        to,
        ids,
        values,
      });
    } else {
      console.log(
        `transfer in batch (${performed.hash})  nonce :${performed.nonce}`
      );
    }
    index++;
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  // TODO remove
  // const {
  //   data: approveForAllData,
  // } = await Asset.populateTransaction.setApprovalForAll(deployer, true);
  // const tx = await DeployerBatch.singleTargetAtomicBatch(Asset.address, [
  //   approveForAllData,
  // ]);
  // await tx.wait();
  // const deployerAsset = Asset.connect(await ethers.getSigner(deployer));

  for (const batch of batches) {
    const datas = [];
    console.log();
    for (const transfer of batch) {
      const {to, ids, values, index} = transfer;
      // console.log(JSON.stringify(transfer));
      // console.log({
      //   creator,
      //   packID,
      //   ipfsHash,
      //   supplies,
      //   raritiesPack,
      // });
      const {data} = await Asset.populateTransaction[
        'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'
      ](DeployerBatch.address, to, ids, values, '0x');
      datas.push(data);

      // TODO remove
      // try {
      //   const tx = await deployerAsset[
      //     'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'
      //   ](DeployerBatch.address, to, ids, values, '0x');
      //   saveTransfersTransaction([index], tx);
      //   console.log(`transfers`, {
      //     tx: tx.hash,
      //   });
      //   const receipt = await tx.wait();
      //   const gasUsed = receipt.gasUsed;
      //   totalGasUsed = totalGasUsed.add(gasUsed);
      //   console.log({
      //     gasUsed: gasUsed.toString(),
      //     totalGasUsed: totalGasUsed.toString(),
      //   });
      // } catch (e) {
      //   console.error(JSON.stringify(transfer), e);
      //   throw e;
      // }
    }
    if (!readOnly) {
      const tx = await DeployerBatch.singleTargetAtomicBatch(
        Asset.address,
        datas
      );
      saveTransfersTransaction(
        batch.map((b) => b.index),
        tx
      );
      console.log(`transfers`, {
        tx: tx.hash,
      });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed;
      totalGasUsed = totalGasUsed.add(gasUsed);
      console.log({
        gasUsed: gasUsed.toString(),
        totalGasUsed: totalGasUsed.toString(),
      });
    } else {
      console.log(`transfer`, datas.length);
    }
    console.log(batch[batch.length - 1].index);
  }

  const contractsToCheck = [];
  for (const contractAddress of Object.keys(toContracts)) {
    const isContract = toContracts[contractAddress] === 'yes';
    if (isContract) {
      contractsToCheck.push(contractAddress);
    }
  }
  console.log({contractsToCheck});
};
export default func;

if (require.main === module) {
  func(hre);
}
