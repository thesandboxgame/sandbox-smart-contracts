import fs from 'fs-extra';
import {DeployFunction} from 'hardhat-deploy/types';
import {zeroAddress} from '../../test/land/fixtures';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {ethers, deployments, getNamedAccounts} = hre;
  const {read, execute} = deployments;
  const {deployer, assetAttributesRegistryAdmin} = await getNamedAccounts();
  const snapshot: string[][] = fs.readJsonSync(
    'tmp/snapshot-cat-gem-OldCatalystRegistry-CatalystApplied.json',
    {throws: false}
  );
  if (!snapshot) return;

  const PolygonAssetAttributesRegistry = await ethers.getContract(
    'PolygonAssetAttributesRegistry'
  );
  const PolygonDeployerBatch = await ethers.getContract('PolygonDeployerBatch');

  const migrationContract = await read(
    'PolygonAssetAttributesRegistry',
    'migrationContract'
  );
  if (migrationContract === zeroAddress) {
    console.log('setting migration contract');
    await execute(
      'PolygonAssetAttributesRegistry',
      {from: assetAttributesRegistryAdmin, log: true},
      'setMigrationContract',
      PolygonDeployerBatch.address
    );
  } else if (migrationContract !== PolygonDeployerBatch.address) {
    throw new Error(
      `Invalid migration contract expected: ${PolygonDeployerBatch.address}; got: ${migrationContract}`
    );
  }
  const datas = [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [assetId, catalystId, seed, gemIds, blockNumber] of snapshot) {
    const result = await read(
      'PolygonAssetAttributesRegistry',
      'getRecord',
      assetId
    );
    if (result.exists) continue;
    const catalyst = parseInt(catalystId) + 1;
    const gems = gemIds
      .split(',')
      .filter((a) => !!a)
      .map((a) => parseInt(a) + 1);
    if (gems.length > catalyst) {
      console.log('Invalid gems for ' + assetId);
      gems.length = catalyst;
    }
    console.log(assetId, catalyst, gems, blockNumber);
    const populatedTx = await PolygonAssetAttributesRegistry.populateTransaction[
      'setCatalystWithBlockNumber(uint256,uint16,uint16[],uint64)'
    ](assetId, catalyst, gems, blockNumber);
    datas.push(populatedTx.data);
  }
  const tx = await execute(
    'PolygonDeployerBatch',
    {from: deployer},
    'singleTargetAtomicBatch',
    PolygonAssetAttributesRegistry.address,
    datas
  );
  console.log(`batchMint`, {
    tx: tx.transactionHash,
  });
};
export default func;
func.tags = ['MigrateCatGemRegistry'];
func.dependencies = ['PolygonAssetAttributesRegistry', 'PolygonDeployerBatch'];
func.skip = skipUnlessTestnet;
