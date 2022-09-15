import fs from 'fs-extra';
import hre from 'hardhat';
import {SectorData} from '../../data/landSales/getLandSales';

const {deployments, getNamedAccounts} = hre;
const {execute, catchUnknownSigner, read} = deployments;

const args = process.argv.slice(2);
const landSalePrefix = args[0];

void (async () => {
  const networkName = hre.network.name;
  const {landSaleAdmin} = await getNamedAccounts();

  const basePath = `data/landSales/${landSalePrefix}`;
  const bundleInfo: {[bundleId: string]: string[]} = fs
    .readJSONSync(`${basePath}/bundles.${networkName}.json`)
    .catch(() => fs.readJSONSync(`${basePath}/bundles.testnet.json`));
  const sectors: SectorData[] = fs
    .readJSONSync(`${basePath}/sectors.${networkName}.json`)
    .catch(() => fs.readJSONSync(`${basePath}/sectors.testnet.json`));

  for (const sector of sectors) {
    const landSaleName = `LandPreSale_${sector.sector}`;
    const LandSale = await deployments.get(landSaleName);
    const assetIds: {[id: string]: boolean} = {};
    for (const bundleId in bundleInfo) {
      for (const assetId of bundleInfo[bundleId]) {
        assetIds[assetId] = true;
      }
    }
    const ids = [];
    const values = [];
    for (const id of Object.keys(assetIds)) {
      const balance = (
        await read(
          'Asset',
          {},
          'balanceOf(address,uint256)',
          LandSale.address,
          id
        )
      ).toNumber();
      if (balance > 0) {
        ids.push(id);
        values.push(balance);
      }
    }
    const owner =
      networkName === 'mainnet'
        ? '0x7A9fe22691c811ea339D9B73150e6911a5343DcA'
        : '0x5BC3D5A39a50BE2348b9C529f81aE79f00945897';
    // TODO check balance, currently it withdraw as if nothing has been taken yet
    if (ids.length > 0) {
      await catchUnknownSigner(
        execute(
          landSaleName,
          {from: landSaleAdmin, log: true},
          'withdrawAssets',
          owner,
          ids,
          values
        )
      );
    }
  }
})();
