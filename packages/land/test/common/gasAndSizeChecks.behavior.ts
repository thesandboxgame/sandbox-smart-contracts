import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {Contract, ethers} from 'ethers';
import {expect} from 'chai';
import hre from 'hardhat';

function getQuadId(x: number, y: number): bigint {
  return BigInt(x) + BigInt(y) * 408n;
}

// TODO: We must fix the code so this is less than 10 or even lower.
const gasPercentageTolerance = {Land: 7, PolygonLand: 7};
const oldContractSize = {PolygonLand: 22709, Land: 21834};
const oldLandGasUsage = {
  Land: {
    'mintQuad of size 1 x 1': '85570',
    'mintQuad of size 3 x 3': '120860',
    'mintQuad of size 6 x 6': '246983',
    'mintQuad of size 12 x 12': '757761',
    'mintQuad of size 24 x 24': '2806967',
    approveFor: '77921', // We accept the gas usage for this operation, the original value was: '57479'
    setApprovalForAllFor: '53659',
    transferFrom: '92416',
    safeTransferFrom: '92460',
    'batchTransferFrom 24x24 one by one': '16006235',
    'safeBatchTransferFrom 24x24 one by one': '16006285',
    'transferQuad of size 1 x 1': '57437',
    'transferQuad of size 3 x 3': '97994',
    'transferQuad of size 6 x 6': '238134',
    'transferQuad of size 12 x 12': '798496',
    'transferQuad of size 24 x 24': '3039919',
    'transferQuad of size 1 x 1 with regroup top left to 24x24': '40337',
    'transferQuad of size 3 x 3 with regroup top left to 24x24': '80894',
    'transferQuad of size 6 x 6 with regroup top left to 24x24': '221034',
    'transferQuad of size 12 x 12 with regroup top left to 24x24': '781396',
    'transferQuad of size 1 x 1 with regroup bottom right to 24x24': '40361',
    'transferQuad of size 3 x 3 with regroup bottom right to 24x24': '80918',
    'transferQuad of size 6 x 6 with regroup bottom right to 24x24': '221058',
    'transferQuad of size 12 x 12 with regroup bottom right to 24x24': '781420',
    'mintAndTransferQuad of size 1 x 1': '99394',
    'mintAndTransferQuad of size 3 x 3': '142087',
    'mintAndTransferQuad of size 6 x 6': '296360',
    'mintAndTransferQuad of size 12 x 12': '919446',
    'mintAndTransferQuad of size 24 x 24': '3423108',
    'mintAndTransferQuad of size 1 x 1 with regroup bottom right to 24x24':
      '99418',
    'mintAndTransferQuad of size 3 x 3 with regroup bottom right to 24x24':
      '142111',
    'mintAndTransferQuad of size 6 x 6 with regroup bottom right to 24x24':
      '296384',
    'mintAndTransferQuad of size 12 x 12 with regroup bottom right to 24x24':
      '919470',
  },
  PolygonLand: {
    'mintQuad of size 1 x 1': '91275',
    'mintQuad of size 3 x 3': '131916',
    'mintQuad of size 6 x 6': '277709',
    'mintQuad of size 12 x 12': '867128',
    'mintQuad of size 24 x 24': '3231333',
    approveFor: '85300', // We accept the gas usage for this operation, the original value was: '62904'
    setApprovalForAllFor: '61212', // We accept the gas usage for this operation, the original value was: '56048'
    transferFrom: '97520',
    safeTransferFrom: '97822',
    'batchTransferFrom 24x24 one by one': '17512260',
    'safeBatchTransferFrom 24x24 one by one': '17512189',
    'transferQuad of size 1 x 1': '62353',
    'transferQuad of size 3 x 3': '111876',
    'transferQuad of size 6 x 6': '285755',
    'transferQuad of size 12 x 12': '980323',
    'transferQuad of size 24 x 24': '3758570',
    'transferQuad of size 1 x 1 with regroup top left to 24x24': '45253',
    'transferQuad of size 3 x 3 with regroup top left to 24x24': '94776',
    'transferQuad of size 6 x 6 with regroup top left to 24x24': '268655',
    'transferQuad of size 12 x 12 with regroup top left to 24x24': '963223',
    'transferQuad of size 1 x 1 with regroup bottom right to 24x24': '45277',
    'transferQuad of size 3 x 3 with regroup bottom right to 24x24': '94800',
    'transferQuad of size 6 x 6 with regroup bottom right to 24x24': '268679',
    'transferQuad of size 12 x 12 with regroup bottom right to 24x24': '963247',
    'mintAndTransferQuad of size 1 x 1': '103155',
    'mintAndTransferQuad of size 3 x 3': '157016',
    'mintAndTransferQuad of size 6 x 6': '352889',
    'mintAndTransferQuad of size 12 x 12': '1141242',
    'mintAndTransferQuad of size 24 x 24': '4306215',
    'mintAndTransferQuad of size 1 x 1 with regroup bottom right to 24x24':
      '103179',
    'mintAndTransferQuad of size 3 x 3 with regroup bottom right to 24x24':
      '157040',
    'mintAndTransferQuad of size 6 x 6 with regroup bottom right to 24x24':
      '352913',
    'mintAndTransferQuad of size 12 x 12 with regroup bottom right to 24x24':
      '1141266',
  },
};

// eslint-disable-next-line mocha/no-exports
export function gasAndSizeChecks(setupLand, contractName: string) {
  async function measure(
    msg: string,
    contract: Contract,
    method: string,
    ...args: unknown[]
  ) {
    const tx = await contract[method](...args);
    const receipt = await tx.wait();
    const prevUsage = parseInt(oldLandGasUsage[contractName][msg]);
    const currUsage = Number(receipt.cumulativeGasUsed);
    const delta = (100 * (currUsage - prevUsage)) / prevUsage;
    console.log(msg, 'delta(%)', delta);
    expect(delta).to.be.lt(
      gasPercentageTolerance[contractName],
      `${msg} old contract: ${prevUsage} new contract: ${currUsage}`,
    );
  }

  describe('Gas And Size Check @skip-on-coverage @skip-on-ci', function () {
    it(`Check ${contractName} size`, async function () {
      const artifact = await hre.artifacts.readArtifact(contractName);
      const sizeInKiB1000 = Math.round(
        (ethers.getBytes(artifact.deployedBytecode).length * 1000) / 1024,
      );
      expect(sizeInKiB1000).to.be.lt(24000);
      console.log(
        `${contractName} contract size:`,
        sizeInKiB1000 / 1000,
        'old size',
        oldContractSize[contractName] / 1000,
      );
    });

    describe('Gas Measurement', function () {
      for (const s of [1, 3, 6, 12, 24]) {
        it(`mintQuad of size ${s} x ${s}`, async function () {
          const {LandAsMinter, other} = await loadFixture(setupLand);
          await measure(
            `mintQuad of size ${s} x ${s}`,
            LandAsMinter,
            'mintQuad',
            other,
            s,
            0,
            0,
            '0x',
          );
        });
      }

      it(`approvals`, async function () {
        const {LandAsMinter, LandAsOther, other, other2} =
          await loadFixture(setupLand);
        await LandAsMinter.mintQuad(other, 3, 0, 0, '0x');
        await measure(
          `approveFor`,
          LandAsOther,
          'approveFor',
          other,
          other2,
          0,
        );
        await measure(
          `setApprovalForAllFor`,
          LandAsOther,
          'setApprovalForAllFor',
          other,
          other2,
          true,
        );
      });

      it(`transferFrom`, async function () {
        const methods = ['transferFrom', 'safeTransferFrom'];
        for (const m of methods) {
          const {LandAsMinter, LandAsOther, other, other2} =
            await loadFixture(setupLand);
          await LandAsMinter.mintQuad(other, 24, 0, 0, '0x');
          await measure(m, LandAsOther, m, other, other2, getQuadId(0, 0));
        }
      });

      it(`batchTransferFrom`, async function () {
        const methods = ['batchTransferFrom', 'safeBatchTransferFrom'];
        const ids = [];
        for (let x = 0; x < 24; x++) {
          for (let y = 0; y < 24; y++) {
            ids.push(getQuadId(x, y));
          }
        }
        for (const m of methods) {
          const {LandAsMinter, LandAsOther, other, other2} =
            await loadFixture(setupLand);
          await LandAsMinter.mintQuad(other, 24, 0, 0, '0x');
          await measure(
            m + ' 24x24 one by one',
            LandAsOther,
            m,
            other,
            other2,
            ids,
            '0x',
          );
        }
      });

      describe('transferQuad', function () {
        for (const s of [1, 3, 6, 12, 24]) {
          it(`transferQuad of size ${s} x ${s} full quad, no regroup`, async function () {
            const {LandAsMinter, LandAsOther, other, other2} =
              await loadFixture(setupLand);
            await LandAsMinter.mintQuad(other, s, 0, 0, '0x');
            await measure(
              `transferQuad of size ${s} x ${s}`,
              LandAsOther,
              'transferQuad',
              other,
              other2,
              s,
              0,
              0,
              '0x',
            );
          });
        }
        for (const s of [1, 3, 6, 12]) {
          it(`transferQuad of size ${s} x ${s} with regroup top left`, async function () {
            const {LandAsMinter, LandAsOther, other, other2} =
              await loadFixture(setupLand);
            // We mint everything except the quad we transfer
            for (let x = s; x < 24; x = x + s) {
              for (let y = s; y < 24; y = y + s) {
                await LandAsMinter.mintQuad(other2, s, x, y, '0x');
              }
            }
            await LandAsMinter.mintQuad(other, s, 0, 0, '0x');
            await measure(
              `transferQuad of size ${s} x ${s} with regroup top left to 24x24`,
              LandAsOther,
              'transferQuad',
              other,
              other2,
              s,
              0,
              0,
              '0x',
            );
          });
        }
        for (const s of [1, 3, 6, 12]) {
          it(`transferQuad of size ${s} x ${s} with regroup bottom right`, async function () {
            const {LandAsMinter, LandAsOther, other, other2} =
              await loadFixture(setupLand);
            // We mint everything except the quad we transfer
            for (let x = 0; x < 24 - s; x = x + s) {
              for (let y = 0; y < 24 - s; y = y + s) {
                await LandAsMinter.mintQuad(other2, s, x, y, '0x');
              }
            }
            await LandAsMinter.mintQuad(other, s, 24 - s, 24 - s, '0x');
            await measure(
              `transferQuad of size ${s} x ${s} with regroup bottom right to 24x24`,
              LandAsOther,
              'transferQuad',
              other,
              other2,
              s,
              24 - s,
              24 - s,
              '0x',
            );
          });
        }
      });

      describe('mintAndTransferQuad', function () {
        for (const s of [1, 3, 6, 12, 24]) {
          it(`mintAndTransferQuad of size ${s} x ${s}`, async function () {
            const {LandAsMinter, other} = await loadFixture(setupLand);
            await measure(
              `mintAndTransferQuad of size ${s} x ${s}`,
              LandAsMinter,
              'mintAndTransferQuad',
              other,
              s,
              0,
              0,
              '0x',
            );
          });
        }
        for (const s of [1, 3, 6, 12]) {
          it(`mintAndTransferQuad of size ${s} x ${s} with regroup bottom right`, async function () {
            const {LandAsMinter, landMinter, other} =
              await loadFixture(setupLand);
            // We mint everything except the quad we transfer
            for (let x = 0; x < 24 - s; x = x + s) {
              for (let y = 0; y < 24 - s; y = y + s) {
                await LandAsMinter.mintQuad(landMinter, s, x, y, '0x');
              }
            }
            await measure(
              `mintAndTransferQuad of size ${s} x ${s} with regroup bottom right to 24x24`,
              LandAsMinter,
              'mintAndTransferQuad',
              other,
              s,
              24 - s,
              24 - s,
              '0x',
            );
          });
        }
      });
    });
  });
}
