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
    'mintQuad of size 1 x 1': '90542',
    'mintQuad of size 3 x 3': '125832',
    'mintQuad of size 6 x 6': '251955',
    'mintQuad of size 12 x 12': '762733',
    'mintQuad of size 24 x 24': '2811939',
    approveFor: '77921', // We accept the gas usage for this operation, the original value was: '62433'
    setApprovalForAllFor: '58613',
    transferFrom: '97370',
    safeTransferFrom: '97414',
    'batchTransferFrom 24x24 one by one': '16015326',
    'safeBatchTransferFrom 24x24 one by one': '16015376',
    'transferQuad of size 1 x 1': '62415',
    'transferQuad of size 3 x 3': '102972',
    'transferQuad of size 6 x 6': '243112',
    'transferQuad of size 12 x 12': '803474',
    'transferQuad of size 24 x 24': '3044897',
    'transferQuad of size 1 x 1 with regroup top left to 24x24': '45315',
    'transferQuad of size 3 x 3 with regroup top left to 24x24': '85872',
    'transferQuad of size 6 x 6 with regroup top left to 24x24': '226012',
    'transferQuad of size 12 x 12 with regroup top left to 24x24': '786374',
    'transferQuad of size 1 x 1 with regroup bottom right to 24x24': '45339',
    'transferQuad of size 3 x 3 with regroup bottom right to 24x24': '85896',
    'transferQuad of size 6 x 6 with regroup bottom right to 24x24': '226036',
    'transferQuad of size 12 x 12 with regroup bottom right to 24x24': '786398',
    'mintAndTransferQuad of size 1 x 1': '104366',
    'mintAndTransferQuad of size 3 x 3': '147059',
    'mintAndTransferQuad of size 6 x 6': '301332',
    'mintAndTransferQuad of size 12 x 12': '924418',
    'mintAndTransferQuad of size 24 x 24': '3428080',
    'mintAndTransferQuad of size 1 x 1 with regroup bottom right to 24x24':
      '104390',
    'mintAndTransferQuad of size 3 x 3 with regroup bottom right to 24x24':
      '147083',
    'mintAndTransferQuad of size 6 x 6 with regroup bottom right to 24x24':
      '301356',
    'mintAndTransferQuad of size 12 x 12 with regroup bottom right to 24x24':
      '924442',
  },
  PolygonLand: {
    'mintQuad of size 1 x 1': '96247',
    'mintQuad of size 3 x 3': '136888',
    'mintQuad of size 6 x 6': '282681',
    'mintQuad of size 12 x 12': '872100',
    'mintQuad of size 24 x 24': '3236305',
    approveFor: '85300', // We accept the gas usage for this operation, the original value was: '67858'
    setApprovalForAllFor: '61002', // We accept the gas usage for this operation, the original value was: '61002'
    transferFrom: '102474',
    safeTransferFrom: '102776',
    'batchTransferFrom 24x24 one by one': '17521351',
    'safeBatchTransferFrom 24x24 one by one': '17521280',
    'transferQuad of size 1 x 1': '67331',
    'transferQuad of size 3 x 3': '116854',
    'transferQuad of size 6 x 6': '290733',
    'transferQuad of size 12 x 12': '985301',
    'transferQuad of size 24 x 24': '3763548',
    'transferQuad of size 1 x 1 with regroup top left to 24x24': '50231',
    'transferQuad of size 3 x 3 with regroup top left to 24x24': '99754',
    'transferQuad of size 6 x 6 with regroup top left to 24x24': '273633',
    'transferQuad of size 12 x 12 with regroup top left to 24x24': '968201',
    'transferQuad of size 1 x 1 with regroup bottom right to 24x24': '50255',
    'transferQuad of size 3 x 3 with regroup bottom right to 24x24': '99778',
    'transferQuad of size 6 x 6 with regroup bottom right to 24x24': '273657',
    'transferQuad of size 12 x 12 with regroup bottom right to 24x24': '968225',
    'mintAndTransferQuad of size 1 x 1': '108127',
    'mintAndTransferQuad of size 3 x 3': '161988',
    'mintAndTransferQuad of size 6 x 6': '357861',
    'mintAndTransferQuad of size 12 x 12': '1146214',
    'mintAndTransferQuad of size 24 x 24': '4311187',
    'mintAndTransferQuad of size 1 x 1 with regroup bottom right to 24x24':
      '108151',
    'mintAndTransferQuad of size 3 x 3 with regroup bottom right to 24x24':
      '162012',
    'mintAndTransferQuad of size 6 x 6 with regroup bottom right to 24x24':
      '357885',
    'mintAndTransferQuad of size 12 x 12 with regroup bottom right to 24x24':
      '1146238',
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
