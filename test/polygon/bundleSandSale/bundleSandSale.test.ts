import {
  createBatchBundle,
  createBundle,
  Fixture,
  mint,
  mintMultiple,
  setupFixtures,
} from './fixtures';
import {Address} from 'hardhat-deploy/dist/types';
import {BigNumber, Contract} from 'ethers';
import {AddressZero} from '@ethersproject/constants';
import {expect} from 'chai';
import {expectEventWithArgs, toWei, waitFor} from '../../utils';
import {ethers} from 'hardhat';
import {defaultAbiCoder} from 'ethers/lib/utils';

describe('PolygonBundleSandSale.sol', function () {
  let fixtures: Fixture;
  let contract: Contract, receivingWallet: Address;
  beforeEach(async function () {
    fixtures = await setupFixtures();
    receivingWallet = fixtures.otherUsers[1];
    await fixtures.deployPolygonBundleSandSale(receivingWallet);
    contract = await ethers.getContract(
      'PolygonBundleSandSale',
      fixtures.polygonBundleSandSaleAdmin
    );
  });

  it('should fail to deploy with a zero receiving wallet', async function () {
    await expect(
      fixtures.deployPolygonBundleSandSale(AddressZero)
    ).to.be.revertedWith('need a wallet to receive funds');
  });

  it('if you send the usd price amount you get 1 ether', async function () {
    expect(await contract.getEtherAmountWithUSD(fixtures.usdPrice)).to.be.equal(
      toWei(1)
    );
  });

  describe('setReceivingWallet', function () {
    it('should fail to setReceivingWallet if not admin', async function () {
      const contractWithOtherSigner = await ethers.getContract(
        'PolygonBundleSandSale',
        fixtures.otherUsers[2]
      );
      await expect(
        contractWithOtherSigner.setReceivingWallet(fixtures.otherUsers[3])
      ).to.be.revertedWith('ADMIN_ONLY');
    });
    it('admin should success to setReceivingWallet', async function () {
      await contract.setReceivingWallet(fixtures.otherUsers[3]);
      // TODO: Need a getter in the contract to be able to check the result.
    });
  });

  it('onERC1155Received should fail if called directly', async function () {
    await expect(
      contract.onERC1155Received(
        fixtures.otherUsers[3],
        fixtures.sandBeneficiary,
        1,
        1,
        [1]
      )
    ).to.be.revertedWith('only accept asset as sender');
  });

  describe.only('create Sale', function () {
    it("NFT can't be used with numPacks > 1 ?", async function () {
      const packId = 123;
      const numPacks = 4;
      const supply = 1;
      const sandAmountPerPack = 10;
      const priceUSDPerPack = 12;
      await waitFor(
        fixtures.sandContract.approve(
          contract.address,
          sandAmountPerPack * numPacks
        )
      );
      const tokenId = await mint(fixtures, packId, supply);
      // createBundle(fixtures, contract, numPacks, sandAmountPerPack, priceUSDPerPack, tokenId, supply)
      const data = defaultAbiCoder.encode(
        [
          'uint256 numPacks',
          'uint256 sandAmountPerPack',
          'uint256 priceUSDPerPack',
        ],
        [numPacks, sandAmountPerPack, priceUSDPerPack]
      );
      await expect(
        fixtures.assetContract[
          'safeTransferFrom(address,address,uint256,uint256,bytes)'
        ](fixtures.sandBeneficiary, contract.address, tokenId, supply, data)
      ).to.be.revertedWith('invalid amounts, not divisible by numPacks');
    });
    it('single sale', async function () {
      const packId = 123;
      const numPacks = 4;
      const supply = 11 * numPacks;
      const sandAmountPerPack = 10;
      const priceUSDPerPack = 12;
      await waitFor(
        fixtures.sandContract.approve(
          contract.address,
          sandAmountPerPack * numPacks
        )
      );
      const tokenId = await mint(fixtures, packId, supply);
      const saleId = await createBundle(
        fixtures,
        contract,
        numPacks,
        sandAmountPerPack,
        priceUSDPerPack,
        tokenId,
        supply
      );
      const info = await contract.getSaleInfo(saleId);
      expect(info.priceUSD).to.be.equal(BigNumber.from(priceUSDPerPack));
      expect(info.numPacksLeft).to.be.equal(BigNumber.from(numPacks));
    });

    it('multiple/batch sale', async function () {
      const packId = 123;
      const numPacks = 4;
      const supplies = [12, 44, 43, 12, 13].map((x) => x * numPacks);
      const sandAmountPerPack = 10;
      const priceUSDPerPack = 12;
      await waitFor(
        fixtures.sandContract.approve(
          contract.address,
          sandAmountPerPack * numPacks
        )
      );
      const tokenIds = await mintMultiple(fixtures, packId, supplies);
      const saleId = await createBatchBundle(
        fixtures,
        contract,
        numPacks,
        sandAmountPerPack,
        priceUSDPerPack,
        tokenIds,
        supplies
      );
      const info = await contract.getSaleInfo(saleId);
      expect(info.priceUSD).to.be.equal(BigNumber.from(priceUSDPerPack));
      expect(info.numPacksLeft).to.be.equal(BigNumber.from(numPacks));
    });
  });

  describe.only('Withdraw', function () {
    it('withdraw', async function () {});
  });

  describe('Buy With ETH', function () {
    it('create bundle', async function () {});
  });

  describe('Buy With DAI', function () {});
});
