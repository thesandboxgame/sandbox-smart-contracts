import {
  createBundle,
  createPack,
  createPackMultiple,
  Fixture,
  getTokenBalance,
  mint,
  setupFixtures,
} from './fixtures';
import {BigNumber} from 'ethers';
import {AddressZero} from '@ethersproject/constants';
import {expect} from '../../chai-setup';
import {toWei, waitFor} from '../../utils';
import {ethers} from 'hardhat';
import {defaultAbiCoder} from 'ethers/lib/utils';

const ZERO = BigNumber.from(0);
describe('PolygonBundleSandSale.sol', function () {
  let fixtures: Fixture;
  beforeEach(async function () {
    fixtures = await setupFixtures();
  });

  it('should fail to deploy with a zero receiving wallet', async function () {
    await expect(
      fixtures.deployPolygonBundleSandSale(AddressZero)
    ).to.be.revertedWith('need a wallet to receive funds');
  });

  it(
    'assuming that the medianizer return the price in u$s * 1e18 and usdAmount is also in u$s * 1e18. ' +
      'There is no need to round up at most you loose 1e-18 u$s.',
    async function () {
      // fixtures.ethUsdPrice == 171.415e18
      // The error is 1e-18 u$s max
      expect(await fixtures.contract.getEtherAmountWithUSD(171)).to.be.equal(0);
      expect(await fixtures.contract.getEtherAmountWithUSD(172)).to.be.equal(1);
      expect(
        await fixtures.contract.getEtherAmountWithUSD(fixtures.ethUsdPrice)
      ).to.be.equal(toWei(1));
      expect(
        await fixtures.contract.getEtherAmountWithUSD(
          fixtures.ethUsdPrice.add(171)
        )
      ).to.be.equal(toWei(1));
      expect(
        await fixtures.contract.getEtherAmountWithUSD(
          fixtures.ethUsdPrice.add(172)
        )
      ).to.be.equal(toWei(1).add(1));
    }
  );

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
    it('should fail if address is zero', async function () {
      await expect(
        fixtures.contract.setReceivingWallet(AddressZero)
      ).to.be.revertedWith('receiving wallet cannot be zero address');
    });
    it('admin should success to setReceivingWallet', async function () {
      await fixtures.contract.setReceivingWallet(fixtures.otherUsers[3]);
      // TODO: Need a getter in the contract to be able to check the result.
    });
  });

  it('onERC1155Received should fail if called directly', async function () {
    await expect(
      fixtures.contract.onERC1155Received(
        fixtures.otherUsers[3],
        fixtures.sandBeneficiary,
        1,
        1,
        [1]
      )
    ).to.be.revertedWith('only accept asset as sender');
  });

  describe('create Sale', function () {
    it("NFT can't be used with numPacks > 1 ?", async function () {
      const packId = 123;
      const numPacks = 4;
      const supply = 1;
      const sandAmountPerPack = 10;
      const priceUSDPerPack = 12;
      await waitFor(
        fixtures.sandContract.approve(
          fixtures.contract.address,
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
        ](
          fixtures.sandBeneficiary,
          fixtures.contract.address,
          tokenId,
          supply,
          data
        )
      ).to.be.revertedWith('invalid amounts, not divisible by numPacks');
    });

    it('NFT can be used with numPacks == 1 ', async function () {
      const packId = 123;
      const numPacks = 1;
      const supply = 1;
      const sandAmountPerPack = 10;
      const priceUSDPerPack = 12;
      await waitFor(
        fixtures.sandContract.approve(
          fixtures.contract.address,
          sandAmountPerPack * numPacks
        )
      );
      const tokenId = await mint(fixtures, packId, supply);
      const saleId = await createBundle(
        fixtures,
        numPacks,
        sandAmountPerPack,
        priceUSDPerPack,
        tokenId,
        supply
      );
      const info = await fixtures.contract.getSaleInfo(saleId);
      expect(info.priceUSD).to.be.equal(BigNumber.from(priceUSDPerPack));
      expect(info.numPacksLeft).to.be.equal(BigNumber.from(numPacks));
    });

    it('single sale', async function () {
      const packId = 123;
      const numPacks = 4;
      const supply = 11 * numPacks;
      const sandAmountPerPack = 10;
      const priceUSDPerPack = 12;
      await waitFor(
        fixtures.sandContract.approve(
          fixtures.contract.address,
          sandAmountPerPack * numPacks
        )
      );
      const tokenId = await mint(fixtures, packId, supply);
      const saleId = await createBundle(
        fixtures,
        numPacks,
        sandAmountPerPack,
        priceUSDPerPack,
        tokenId,
        supply
      );
      const info = await fixtures.contract.getSaleInfo(saleId);
      expect(info.priceUSD).to.be.equal(BigNumber.from(priceUSDPerPack));
      expect(info.numPacksLeft).to.be.equal(BigNumber.from(numPacks));
    });

    it('multiple/batch sale', async function () {
      const packId = 123;
      const numPacks = 4;
      const supplies = [12, 44, 43, 12, 13];
      const sandAmountPerPack = 10;
      const priceUSDPerPack = 12;
      const {saleId} = await createPackMultiple(
        fixtures,
        packId,
        numPacks,
        supplies,
        sandAmountPerPack,
        priceUSDPerPack
      );
      const info = await fixtures.contract.getSaleInfo(saleId);
      expect(info.priceUSD).to.be.equal(BigNumber.from(priceUSDPerPack));
      expect(info.numPacksLeft).to.be.equal(BigNumber.from(numPacks));
    });
  });

  describe('Withdraw', function () {
    it('withdraw', async function () {
      const someUser = fixtures.otherUsers[7];
      const {saleId, tokenIds, tokensPre, balancePre} = await createPack(
        fixtures
      );
      await fixtures.contract.withdrawSale(saleId, someUser);

      const infoPos = await fixtures.contract.getSaleInfo(saleId);
      expect(infoPos.numPacksLeft).to.be.equal(ZERO);
      // Sand withdraw
      expect(
        await fixtures.sandContract.balanceOf(fixtures.contract.address)
      ).to.be.equal(ZERO);
      expect(await fixtures.sandContract.balanceOf(someUser)).to.be.equal(
        balancePre
      );
      // Token withdraw
      expect(await getTokenBalance(fixtures, someUser, tokenIds)).to.eql(
        tokensPre
      );
      const balancePos = await getTokenBalance(
        fixtures,
        fixtures.contract.address,
        tokenIds
      );
      balancePos.forEach((b) => expect(b).to.be.equal(ZERO));
    });
    it('should fail to withdraw if not admin', async function () {
      const priceUSDPerPack = 156;
      const numPacks = 4;
      const {saleId} = await createPackMultiple(
        fixtures,
        123,
        numPacks,
        [12, 44, 43, 12, 13],
        123,
        priceUSDPerPack
      );
      const someUser = fixtures.otherUsers[7];
      const contractWithOtherSigner = await ethers.getContract(
        'PolygonBundleSandSale',
        fixtures.otherUsers[2]
      );

      await expect(
        contractWithOtherSigner.withdrawSale(saleId, someUser)
      ).to.revertedWith('ADMIN_ONLY');
    });
  });

  describe('Buy packs with DAI', function () {
    it('should fail with the wrong saleId', async function () {
      await expect(
        fixtures.contract.buyBundleWithDai(0, 1, fixtures.otherUsers[4])
      ).to.revertedWith('invalid saleId');
    });
    it('should fail if not enough packs', async function () {
      const {saleId, numPacks} = await createPack(fixtures);
      await expect(
        fixtures.contract.buyBundleWithDai(
          saleId,
          numPacks * 2,
          fixtures.otherUsers[4]
        )
      ).to.revertedWith('not enough packs on sale');
    });
    it('should fail if not enough DAI', async function () {
      const someUser = fixtures.otherUsers[7];
      const {saleId, priceUSDPerPack} = await createPack(fixtures);
      const numPacksToBuy = 2;

      const daiRequired = numPacksToBuy * priceUSDPerPack;
      // It will fail because of the -1
      await fixtures.daiContract.approve(
        fixtures.contract.address,
        daiRequired - 1
      );
      const contractAsDaiBeneficiary = await ethers.getContract(
        'PolygonBundleSandSale',
        fixtures.daiBeneficiary
      );
      await expect(
        contractAsDaiBeneficiary.buyBundleWithDai(
          saleId,
          numPacksToBuy,
          someUser
        )
      ).to.revertedWith('Not enough funds allowed');
    });
    it('buy with DAI, obs: buyer != to', async function () {
      const someUser = fixtures.otherUsers[7];
      const {
        saleId,
        tokenIds,
        tokensPre,
        balancePre,
        priceUSDPerPack,
        numPacks,
        sandAmountPerPack,
        suppliesPerPack,
      } = await createPack(fixtures);
      const numPacksToBuy = 3;
      const daiRequired = numPacksToBuy * priceUSDPerPack;
      const daiBalancePre = BigNumber.from(
        await fixtures.daiContract.balanceOf(fixtures.daiBeneficiary)
      );
      await fixtures.daiContract.approve(
        fixtures.contract.address,
        daiRequired
      );
      const contractAsDaiBeneficiary = await ethers.getContract(
        'PolygonBundleSandSale',
        fixtures.daiBeneficiary
      );

      // BUY numPacksToBuy!!!
      await contractAsDaiBeneficiary.buyBundleWithDai(
        saleId,
        numPacksToBuy,
        someUser
      );

      const infoPos = await fixtures.contract.getSaleInfo(saleId);
      const numPacksLeft = numPacks - numPacksToBuy;
      expect(infoPos.numPacksLeft).to.be.equal(numPacksLeft);
      // Dai Balance
      expect(
        await fixtures.daiContract.balanceOf(fixtures.receivingWallet)
      ).to.be.equal(BigNumber.from(numPacksToBuy * priceUSDPerPack));
      expect(
        await fixtures.daiContract.balanceOf(fixtures.daiBeneficiary)
      ).to.be.equal(daiBalancePre.sub(numPacksToBuy * priceUSDPerPack));
      // Sand balance
      expect(await fixtures.sandContract.balanceOf(someUser)).to.be.equal(
        sandAmountPerPack * numPacksToBuy
      );
      expect(
        await fixtures.sandContract.balanceOf(fixtures.contract.address)
      ).to.be.equal(balancePre.sub(sandAmountPerPack * numPacksToBuy));
      // Token balance
      expect(await getTokenBalance(fixtures, someUser, tokenIds)).to.eql(
        suppliesPerPack.map((s) => BigNumber.from(numPacksToBuy * s))
      );
      expect(
        await getTokenBalance(fixtures, fixtures.contract.address, tokenIds)
      ).to.eql(
        tokensPre.map((x, i) => x.sub(numPacksToBuy * suppliesPerPack[i]))
      );
    });
    describe('Buy packs with ETH', function () {
      it('should fail with the wrong saleId', async function () {
        await expect(
          fixtures.contract.buyBundleWithEther(0, 1, fixtures.otherUsers[4])
        ).to.revertedWith('invalid saleId');
      });
      it('should fail if not enough packs', async function () {
        const {saleId, numPacks} = await createPack(fixtures);
        await expect(
          fixtures.contract.buyBundleWithEther(
            saleId,
            numPacks * 2,
            fixtures.otherUsers[4]
          )
        ).to.revertedWith('not enough packs on sale');
      });

      it('should fail if not enough ETH', async function () {
        const buyer = fixtures.otherUsers[7];
        const to = fixtures.otherUsers[8];
        const {saleId, priceUSDPerPack} = await createPack(fixtures);
        const numPacksToBuy = 2;

        const usdRequired = BigNumber.from(numPacksToBuy * priceUSDPerPack);
        // Will fail because of sub(1)
        const ethRequired = usdRequired
          .mul(toWei(1))
          .div(fixtures.ethUsdPrice)
          .sub(1);
        const contractAsBuyer = await ethers.getContract(
          'PolygonBundleSandSale',
          buyer
        );
        await expect(
          contractAsBuyer.buyBundleWithEther(saleId, numPacksToBuy, to, {
            value: ethRequired,
          })
        ).to.revertedWith('not enough ether sent');
      });
      it('buy with ETH, obs: buyer != to', async function () {
        const buyer = fixtures.otherUsers[7];
        const to = fixtures.otherUsers[8];
        const {
          saleId,
          tokenIds,
          tokensPre,
          balancePre,
          priceUSDPerPack,
          numPacks,
          sandAmountPerPack,
          suppliesPerPack,
        } = await createPack(fixtures);
        const numPacksToBuy = 3;

        const leftOver = 567;
        const usdRequired = BigNumber.from(numPacksToBuy * priceUSDPerPack);
        const ethRequired = usdRequired.mul(toWei(1)).div(fixtures.ethUsdPrice);
        const contractAsBuyer = await ethers.getContract(
          'PolygonBundleSandSale',
          buyer
        );
        const ethBalancePre = BigNumber.from(
          await ethers.provider.getBalance(fixtures.receivingWallet)
        );
        const buyerEthBalancePre = BigNumber.from(
          await ethers.provider.getBalance(buyer)
        );

        // BUY numPacksToBuy!!!
        const tx = await contractAsBuyer.buyBundleWithEther(
          saleId,
          numPacksToBuy,
          to,
          {
            value: ethRequired.add(leftOver),
          }
        );
        const receipt = await tx.wait();
        const infoPos = await fixtures.contract.getSaleInfo(saleId);
        const numPacksLeft = numPacks - numPacksToBuy;
        expect(infoPos.numPacksLeft).to.be.equal(numPacksLeft);
        // ETH Balance
        expect(
          await ethers.provider.getBalance(fixtures.receivingWallet)
        ).to.be.equal(ethBalancePre.add(ethRequired));
        expect(await ethers.provider.getBalance(buyer)).to.be.equal(
          buyerEthBalancePre
            .sub(ethRequired)
            .sub(receipt.gasUsed.mul(tx.gasPrice))
        );
        // Sand balance
        expect(await fixtures.sandContract.balanceOf(to)).to.be.equal(
          sandAmountPerPack * numPacksToBuy
        );
        expect(
          await fixtures.sandContract.balanceOf(fixtures.contract.address)
        ).to.be.equal(balancePre.sub(sandAmountPerPack * numPacksToBuy));
        // Token balance
        expect(await getTokenBalance(fixtures, to, tokenIds)).to.eql(
          suppliesPerPack.map((s) => BigNumber.from(numPacksToBuy * s))
        );
        expect(
          await getTokenBalance(fixtures, fixtures.contract.address, tokenIds)
        ).to.eql(
          tokensPre.map((x, i) => x.sub(numPacksToBuy * suppliesPerPack[i]))
        );
      });
    });
  });
});
