import {BigNumber} from 'ethers';
import fs from 'fs-extra';
import {DeployFunction, Receipt} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {execute, read} = deployments;

  const {landMigrationBatchExecutor} = await getNamedAccounts();
  const LandSwapContract = await ethers.getContract('LandSwap');

  const batchesFile: {
    sizes: number[];
    xs: number[];
    ys: number[];
  }[][] = fs.readJSONSync('./data/landMigration/batches.json');
  const batches = [];
  for (const batch of batchesFile) {
    for (const transfer of batch) {
      batches.push(transfer);
    }
  }
  const txs: Receipt[] =
    fs.readJSONSync('./data/landMigration/txs.json', {throws: false}) || [];
  for (let i = 0; i < batches.length; i++) {
    if (txs[i]) {
      console.log(`Batch ${i} already migrated`);
      continue;
    }
    const batch = batches[i];
    const datas = [];
    const {sizes, xs, ys} = batch;
    const {data} = await LandSwapContract.populateTransaction[
      'migrate(uint256[],uint256[],uint256[],bytes)'
    ](sizes, xs, ys, '0x');
    datas.push(data);
    const tx = await execute(
      'LandMigrationBatch',
      {from: landMigrationBatchExecutor},
      'singleTargetAtomicBatch',
      LandSwapContract.address,
      datas
    ).catch(() => null);
    if (!tx) {
      const owner = await read('Land_Old', 'ownerOf', xs[0] + ys[0] * 408);
      console.log(`Batch ${i} failed`, owner);
      continue;
    }
    tx.gasUsed = tx.gasUsed.toString();
    txs.push(tx);
    fs.writeJSONSync(`./data/landMigration/txs.json`, txs);
    console.log(`Migrated batch ${i}`, tx.gasUsed);
  }
  console.log('Migration complete');
  const totalGas = txs
    .reduce(
      (acc: BigNumber, tx) => BigNumber.from(tx.gasUsed).add(acc),
      BigNumber.from(0)
    )
    .toString();
  console.log('Total gas', totalGas);
  console.log('Total ETH', ethers.utils.formatEther(totalGas));
};

export default func;
func.tags = ['LandMigration'];
func.dependencies = ['LandSwapV2'];
func.skip = async () => true; // Implemented on OZ Defender
