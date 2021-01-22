import fs from 'fs-extra';
import hre from 'hardhat';
import {SectorData} from '../../data/landSales/getLandSales';

const {deployments} = hre;
const {execute, catchUnknownSigner} = deployments;

const args = process.argv.slice(2);
const landSalePrefix = args[0];

(async () => {
  const networkName = hre.network.name;

  const bundleInfo: {[bundleId: string]: string[]} = JSON.parse(
    fs
      .readFileSync(
        `data/landSales/${landSalePrefix}/bundles.${networkName}.json`
      )
      .toString()
  );
  const sectors: SectorData[] = JSON.parse(
    fs
      .readFileSync(
        `data/landSales/${landSalePrefix}/sectors.${networkName}.json`
      )
      .toString()
  );

  for (const sector of sectors) {
    const assetIdsCount: {[assetId: string]: number} = {};
    const countBundleId = (bundleId?: string) => {
      if (bundleId && bundleId !== '') {
        const bundle = bundleInfo[bundleId];
        for (const assetId of bundle) {
          assetIdsCount[assetId] = (assetIdsCount[assetId] || 0) + 1;
        }
      }
    };

    for (const land of sector.lands) {
      countBundleId(land.bundleId);
    }
    for (const estate of sector.estates) {
      countBundleId(estate.bundleId);
    }

    const landSaleName = `${landSalePrefix}_${sector.sector}`;

    const owner =
      networkName === 'mainnet'
        ? '0x7A9fe22691c811ea339D9B73150e6911a5343DcA'
        : '0x5BC3D5A39a50BE2348b9C529f81aE79f00945897';
    const ids = [];
    const values = [];
    for (const assetId of Object.keys(assetIdsCount)) {
      ids.push(assetId);
      values.push(assetIdsCount[assetId]);
    }
    // TODO check balance, currently it withdraw as if nothing has been taken yet
    if (ids.length > 0) {
      await catchUnknownSigner(
        execute(
          landSaleName,
          {from: owner, log: true},
          'withdrawAssets',
          owner,
          ids,
          values
        )
      );
    }
  }
})();
