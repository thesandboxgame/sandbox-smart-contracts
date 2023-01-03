import {expect} from '../chai-setup';
import {deployPremiumLandRegistry, setupPremiumLandRegistry} from './fixtures';
import {BigNumber} from 'ethers';
import {ethers} from 'hardhat';

const gasWithRegistryMintAndTransferQuad = 3775108;
const gasWithoutRegistryMintAndTransferQuad = 3703038;

const gasWithRegistryMintAndTransferQuadContract = 4402214;
const gasWithoutRegistryMintAndTransferQuadContract = 4337102;

describe('@skip-on-coverage @skip-on-ci PremiumLandRegistry.sol gas tests', function () {
  describe('with registry', function () {
    it('Land tunnel uses mintAndTransferQuad', async function () {
      const {
        contractAsMapDesigner: registry,
        landContractAsOther: land,
        other,
        other2,
      } = await setupPremiumLandRegistry();
      await registry.set(0, 0, 24);
      await registry.set(24, 24, 24);
      await land.mintQuad(other, 24, 0, 0, []);
      const gas = BigNumber.from(
        await land.estimateGas.mintAndTransferQuad(other2, 24, 0, 0, [])
      );
      expect(gas).to.be.eq(gasWithRegistryMintAndTransferQuad);
    });
    it('Land tunnel uses mintAndTransferQuad contract receiver', async function () {
      const {
        contractAsMapDesigner: registry,
        landContractAsOther: land,
        other,
        erc721Receiver,
      } = await setupPremiumLandRegistry();
      await registry.set(0, 0, 24);
      await registry.set(24, 24, 24);
      await land.mintQuad(other, 24, 0, 0, []);
      const gas = BigNumber.from(
        await land.estimateGas.mintAndTransferQuad(
          erc721Receiver.address,
          24,
          0,
          0,
          []
        )
      );
      expect(gas).to.be.eq(gasWithRegistryMintAndTransferQuadContract);
    });
    describe('setting quads', function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      [24, 12, 6, 3, 1].forEach((size) =>
        it(`Setting ${size}x${size} quad with different users`, async function () {
          const gasUsage: {[k: number]: number} = {
            24: 15412027,
            12: 3949977,
            6: 1075388,
            3: 357225,
            1: 145705,
          };
          const {
            contractAsMapDesigner: registry,
            landContractAsOther: land,
          } = await setupPremiumLandRegistry();
          // a lot of owners
          for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
              const randomUser = await ethers.Wallet.createRandom().getAddress();
              await land.mintQuad(randomUser, 1, x, y, []);
            }
          }
          const gas = BigNumber.from(
            await registry.estimateGas.set(0, 0, size)
          );
          expect(gas).to.be.eq(gasUsage[size]);
        })
      );
    });
  });
  describe('without registry', function () {
    it('Land tunnel uses mintAndTransferQuad', async function () {
      const {
        landContractAsOther: land,
        other,
        other2,
      } = await deployPremiumLandRegistry();
      await land.mintQuad(other, 24, 0, 0, []);
      const gas = BigNumber.from(
        await land.estimateGas.mintAndTransferQuad(other2, 24, 0, 0, [])
      );
      expect(gas).to.be.eq(gasWithoutRegistryMintAndTransferQuad);
    });
    it('Land tunnel uses mintAndTransferQuad contract receiver', async function () {
      const {
        landContractAsOther: land,
        other,
        erc721Receiver,
      } = await deployPremiumLandRegistry();
      await land.mintQuad(other, 24, 0, 0, []);
      const gas = BigNumber.from(
        await land.estimateGas.mintAndTransferQuad(
          erc721Receiver.address,
          24,
          0,
          0,
          []
        )
      );
      expect(gas).to.be.eq(gasWithoutRegistryMintAndTransferQuadContract);
    });
  });
});
