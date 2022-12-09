import {setupPolygonStarterPack} from './fixtures';
import {
  waitFor,
  expectEventWithArgs,
  expectEventWithArgsFromReceipt,
  increaseTime,
  toWei,
} from '../../utils';
import {expect} from '../../chai-setup';
import {ethers} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {constants, utils} from 'ethers';
import {defaultAbiCoder, keccak256, toUtf8Bytes} from 'ethers/lib/utils';
import {sendMetaTx} from '../../sendMetaTx';
import {starterPack712Signature} from './signature';
import {zeroAddress} from '../../land/fixtures';

// Good test params
const catalystIds = [1, 2, 3, 4];
const catPrices = ['5', '1', '15', '10'];
const catPrices2 = ['5', '17', '15', '20'];
const gemIds = [1, 2, 3, 4, 5];
const gemPrices = ['5', '10', '50', '100', '500'];
const gemPrices2 = ['2', '10', '50', '100', '100'];

// Helper examples for calculating spend
function calculateSpend() {
  return BigNumber.from(catPrices[0])
    .add(BigNumber.from(catPrices[1]))
    .add(BigNumber.from(catPrices[2]))
    .add(BigNumber.from(catPrices[3]))
    .add(BigNumber.from(gemPrices[0]).mul(2))
    .add(BigNumber.from(gemPrices[1]).mul(2))
    .add(BigNumber.from(gemPrices[2]).mul(2))
    .add(BigNumber.from(gemPrices[3]).mul(2))
    .add(BigNumber.from(gemPrices[4]).mul(2));
}

function calculateSpend2() {
  return BigNumber.from(catPrices2[0])
    .add(BigNumber.from(catPrices2[1]))
    .add(BigNumber.from(catPrices2[2]))
    .add(BigNumber.from(catPrices2[3]))
    .add(BigNumber.from(gemPrices2[0]).mul(2))
    .add(BigNumber.from(gemPrices2[1]).mul(2))
    .add(BigNumber.from(gemPrices2[2]).mul(2))
    .add(BigNumber.from(gemPrices2[3]).mul(2))
    .add(BigNumber.from(gemPrices2[4]).mul(2));
}

// Bad test params
const badCatIds = [1, 2, 3, 7];
const badGemIds = [8, 100, 3, 9, 5];
const zeroCatId = [1, 2, 3, 0];
const zeroGemId = [0, 2, 4, 1, 5];

// Test Message structure
const TestMessage = {
  buyer: '',
  catalystIds,
  catalystQuantities: [1, 1, 1, 1],
  gemIds,
  gemQuantities: [2, 2, 2, 2, 2],
  nonce: 0,
};

// Nonce packer helper function
const getPackedNonce = (nonce: number, queueId: number) => {
  const paddedNonce = utils
    .hexZeroPad(utils.hexValue(nonce), 16)
    .replace(/0x/, '');
  const hexQueueID = utils.hexZeroPad(utils.hexValue(queueId), 16);
  const concatedNonce = hexQueueID.concat(paddedNonce);
  return concatedNonce;
};

describe('PolygonStarterPack.sol', function () {
  describe('PurchaseValidator.sol', function () {
    it('can get the backend signing wallet', async function () {
      const {
        PolygonStarterPack,
        backendMessageSigner,
      } = await setupPolygonStarterPack();
      expect(await PolygonStarterPack.getSigningWallet()).to.be.equal(
        backendMessageSigner
      );
    });
    it('default admin can set the backend signing wallet', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
      } = await setupPolygonStarterPack();
      await expect(PolygonStarterPackAsAdmin.setSigningWallet(other.address)).to
        .not.be.reverted;
    });
    it('a SigningWallet event is emitted when the signing wallet is updated', async function () {
      const {
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        other,
      } = await setupPolygonStarterPack();
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.setSigningWallet(other.address)
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'SigningWallet'
      );
      const newWallet = event.args[0];
      expect(newWallet).to.be.equal(other.address);
    });
    it('cannot set the signing wallet to zeroAddress', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.setSigningWallet(constants.AddressZero)
      ).to.be.revertedWith('WALLET_ZERO_ADDRESS');
    });
    it('if not default admin cannot set the signing wallet', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.setSigningWallet(other.address)
      ).to.be.revertedWith(
        `AccessControl: account ${other.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
      );
    });
  });
  describe('Roles', function () {
    it('default admin should be set', async function () {
      const {
        PolygonStarterPack,
        sandAdmin,
        defaultAdminRole,
      } = await setupPolygonStarterPack();
      expect(await PolygonStarterPack.hasRole(defaultAdminRole, sandAdmin)).to
        .be.true;
    });
    it('starterpack admin should be set', async function () {
      const {
        PolygonStarterPack,
        starterPackAdmin,
        starterPackRole,
      } = await setupPolygonStarterPack();
      expect(
        await PolygonStarterPack.hasRole(starterPackRole, starterPackAdmin)
      ).to.be.true;
    });
  });
  describe('Setup', function () {
    it('correct receiving wallet has been implemented', async function () {
      const {
        PolygonStarterPack,
        starterPackSaleBeneficiary,
      } = await setupPolygonStarterPack();
      expect(await PolygonStarterPack.getReceivingWallet()).to.be.equal(
        starterPackSaleBeneficiary
      );
    });
    it('check the domain separator', async function () {
      const {PolygonStarterPack} = await setupPolygonStarterPack();
      const typeHash = keccak256(
        toUtf8Bytes(
          'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
        )
      );
      const hashedName = ethers.utils.keccak256(
        toUtf8Bytes('Sandbox StarterPack')
      );
      const versionHash = ethers.utils.keccak256(toUtf8Bytes('1.0'));
      const network = await PolygonStarterPack.provider.getNetwork();
      const domainSeparator = ethers.utils.keccak256(
        defaultAbiCoder.encode(
          ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
          [
            typeHash,
            hashedName,
            versionHash,
            network.chainId,
            PolygonStarterPack.address,
          ]
        )
      );
      expect(await PolygonStarterPack.domainSeparator()).to.be.equal(
        domainSeparator
      );
    });
    it('check the chainId', async function () {
      const {PolygonStarterPack, hre} = await setupPolygonStarterPack();
      expect(await PolygonStarterPack.getChainId()).to.be.equal(
        hre.network.config.chainId || 31337 // Polygon || hardhat
      );
    });
  });
  describe('getReceivingWallet', function () {
    it('can view the receiving wallet', async function () {
      const {PolygonStarterPack} = await setupPolygonStarterPack();
      await expect(PolygonStarterPack.getReceivingWallet()).to.not.be.reverted;
    });
  });
  describe('setReceivingWallet', function () {
    it('default admin can set the receiving wallet', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
      } = await setupPolygonStarterPack();
      await expect(PolygonStarterPackAsAdmin.setReceivingWallet(other.address))
        .to.not.be.reverted;
    });
    it('a ReceivingWallet event is emitted when the receiving wallet is updated', async function () {
      const {
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        other,
      } = await setupPolygonStarterPack();
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.setReceivingWallet(other.address)
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'ReceivingWallet'
      );
      const newWallet = event.args[0];
      expect(newWallet).to.be.equal(other.address);
    });
    it('cannot set the receiving wallet to zeroAddress', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.setReceivingWallet(constants.AddressZero)
      ).to.be.revertedWith('WALLET_ZERO_ADDRESS');
    });
    it('if not default admin cannot set the receiving wallet', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.setReceivingWallet(other.address)
      ).to.be.revertedWith(
        `AccessControl: account ${other.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
      );
    });
  });
  describe('setSANDEnabled', function () {
    it('STARTERPACK_ROLE can set SAND enabled', async function () {
      const {
        PolygonStarterPackAsStarterPackAdmin,
      } = await setupPolygonStarterPack();
      await expect(PolygonStarterPackAsStarterPackAdmin.setSANDEnabled(true)).to
        .not.be.reverted;
    });
    it('DEFAULT_ADMIN_ROLE can set SAND enabled/disabled (but only because sandAdmin is currently the same as starterPackAdmin)', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(PolygonStarterPackAsAdmin.setSANDEnabled(true)).to.not.be
        .reverted;
    });
    it('SandEnabled event is emitted when SAND is enabled', async function () {
      const {
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.setSANDEnabled(true)
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'SandEnabled'
      );
      expect(event.args[0]).to.be.true;
    });
    it('SandEnabled event is emitted when SAND is disabled', async function () {
      const {
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.setSANDEnabled(false)
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'SandEnabled'
      );
      expect(event.args[0]).to.be.false;
    });
    it('if not STARTERPACK_ROLE cannot set SAND enabled', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.setSANDEnabled(true)
      ).to.be.revertedWith(
        `AccessControl: account ${other.address.toLowerCase()} is missing role 0xf0b465b2fd9a8eb309079c069118a26163974b82d09d2b1dafd9aef7692568e6`
      );
    });
    it('STARTERPACK_ROLE can disable SAND', async function () {
      const {
        PolygonStarterPackAsStarterPackAdmin,
      } = await setupPolygonStarterPack();
      await expect(PolygonStarterPackAsStarterPackAdmin.setSANDEnabled(false))
        .to.not.be.reverted;
    });
    it('if not STARTERPACK_ROLE cannot disable SAND', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.setSANDEnabled(false)
      ).to.be.revertedWith(
        `AccessControl: account ${other.address.toLowerCase()} is missing role 0xf0b465b2fd9a8eb309079c069118a26163974b82d09d2b1dafd9aef7692568e6`
      );
    });
  });
  describe('setPrices', function () {
    it('STARTERPACK_ROLE can set the prices for all cats and gems', async function () {
      const {
        PolygonStarterPackAsStarterPackAdmin,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsStarterPackAdmin.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.not.be.reverted;
    });
    it('DEFAULT_ADMIN_ROLE can set the prices (but only because sandAdmin is currently the same as starterPackAdmin)', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.not.be.reverted;
    });
    it('an individual catalyst price can be updated', async function () {
      const {
        PolygonStarterPackAsStarterPackAdmin,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsStarterPackAdmin.setPrices(
          [1],
          ['10000000000000000000'],
          [],
          []
        )
      ).to.not.be.reverted;
    });
    it('an individual gem price can be updated', async function () {
      const {
        PolygonStarterPackAsStarterPackAdmin,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsStarterPackAdmin.setPrices(
          [],
          [],
          [1],
          ['10000000000000000000']
        )
      ).to.not.be.reverted;
    });
    it('if not STARTERPACK_ROLE cannot set prices', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.be.revertedWith(
        `AccessControl: account ${other.address.toLowerCase()} is missing role 0xf0b465b2fd9a8eb309079c069118a26163974b82d09d2b1dafd9aef7692568e6`
      );
    });
    it('cannot set prices for cat that does not exist', async function () {
      const {
        PolygonStarterPackAsStarterPackAdmin,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsStarterPackAdmin.setPrices(
          badCatIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.be.revertedWith('INVALID_CAT_ID');
    });
    it('cannot set prices for gem that does not exist', async function () {
      const {
        PolygonStarterPackAsStarterPackAdmin,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsStarterPackAdmin.setPrices(
          catalystIds,
          catPrices,
          badGemIds,
          gemPrices
        )
      ).to.be.revertedWith('INVALID_GEM_ID');
    });
    it('cannot set prices for cat 0', async function () {
      const {
        PolygonStarterPackAsStarterPackAdmin,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsStarterPackAdmin.setPrices(
          zeroCatId,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.be.revertedWith('INVALID_CAT_ID');
    });
    it('cannot set prices for gem id 0', async function () {
      const {
        PolygonStarterPackAsStarterPackAdmin,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsStarterPackAdmin.setPrices(
          catalystIds,
          catPrices,
          zeroGemId,
          gemPrices
        )
      ).to.be.revertedWith('INVALID_GEM_ID');
    });
    it('SetPrices event is emitted when prices are updated', async function () {
      const {
        PolygonStarterPackAsStarterPackAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();

      const receipt = await waitFor(
        PolygonStarterPackAsStarterPackAdmin.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'SetPrices'
      );
      const catalystIdsUpdated = event.args[0];
      const newCatPrices = event.args[1];
      const gemIdsUpdated = event.args[2];
      const newGemPrices = event.args[3];
      const priceChangeTimestamp = event.args[4];

      expect(catalystIdsUpdated[0]).to.be.eq(BigNumber.from(1));
      expect(catalystIdsUpdated[1]).to.be.eq(BigNumber.from(2));
      expect(catalystIdsUpdated[2]).to.be.eq(BigNumber.from(3));
      expect(catalystIdsUpdated[3]).to.be.eq(BigNumber.from(4));

      expect(newCatPrices[0]).to.be.eq(catPrices[0]);
      expect(newCatPrices[1]).to.be.eq(catPrices[1]);
      expect(newCatPrices[2]).to.be.eq(catPrices[2]);
      expect(newCatPrices[3]).to.be.eq(catPrices[3]);

      expect(gemIdsUpdated[0]).to.be.eq(BigNumber.from(1));
      expect(gemIdsUpdated[1]).to.be.eq(BigNumber.from(2));
      expect(gemIdsUpdated[2]).to.be.eq(BigNumber.from(3));
      expect(gemIdsUpdated[3]).to.be.eq(BigNumber.from(4));
      expect(gemIdsUpdated[4]).to.be.eq(BigNumber.from(5));

      expect(newGemPrices[0]).to.be.eq(gemPrices[0]);
      expect(newGemPrices[1]).to.be.eq(gemPrices[1]);
      expect(newGemPrices[2]).to.be.eq(gemPrices[2]);
      expect(newGemPrices[3]).to.be.eq(gemPrices[3]);
      expect(newGemPrices[4]).to.be.eq(gemPrices[4]);

      const block = await ethers.provider.getBlock(receipt.blockHash);
      expect(priceChangeTimestamp).to.be.eq(block.timestamp);
    });
    it('SetPrices event is emitted when a single price is updated', async function () {
      const {
        PolygonStarterPackAsStarterPackAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();

      const receipt = await waitFor(
        PolygonStarterPackAsStarterPackAdmin.setPrices(
          [],
          [],
          [1],
          ['10000000000000000000']
        )
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'SetPrices'
      );
      const catalystIdsUpdated = event.args[0];
      const newCatPrices = event.args[1];
      const gemIdsUpdated = event.args[2];
      const newGemPrices = event.args[3];
      const priceChangeTimestamp = event.args[4];

      expect(catalystIdsUpdated.length).to.be.equal(0);
      expect(newCatPrices.length).to.be.equal(0);
      expect(gemIdsUpdated.length).to.be.equal(1);
      expect(newGemPrices.length).to.be.equal(1);
      expect(gemIdsUpdated[0]).to.be.eq(BigNumber.from(1));
      expect(newGemPrices[0]).to.be.eq(BigNumber.from('10000000000000000000'));

      const block = await ethers.provider.getBlock(receipt.blockHash);
      expect(priceChangeTimestamp).to.be.eq(block.timestamp); // price change timestamp, when setPrices was called
    });
    it('default admin cannot set prices within delay period', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.not.be.reverted;
      await expect(
        PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.be.revertedWith('DELAY_PERIOD_IN_EFFECT');
    });
    it('default admin can set the prices again after the delay period', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.not.be.reverted;
      await expect(
        PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.be.revertedWith('DELAY_PERIOD_IN_EFFECT');
      await increaseTime(3600);
      await expect(
        PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      ).to.not.be.reverted;
    });
  });
  describe('withdrawAll', function () {
    it('default admin can withdraw remaining cats and gems from contract', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [1, 2, 3, 4],
          [1, 2, 3, 4, 5]
        )
      ).to.not.be.reverted;
    });
    it('default admin cannot withdraw remaining cats and gems from contract to zeroAddress', async function () {
      const {PolygonStarterPackAsAdmin} = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.withdrawAll(
          zeroAddress,
          [1, 2, 3, 4],
          [1, 2, 3, 4, 5]
        )
      ).to.be.revertedWith('ZERO_ADDRESS');
    });
    it('default admin receives correct cats and gems balances upon withdrawal', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        powerGem,
        defenseGem,
        speedGem,
        magicGem,
        luckGem,
        commonCatalyst,
        rareCatalyst,
        epicCatalyst,
        legendaryCatalyst,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.withdrawAll(
        other.address,
        [1, 2, 3, 4],
        [1, 2, 3, 4, 5]
      );
      // 100 of each
      expect(await powerGem.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await defenseGem.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await speedGem.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await magicGem.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await luckGem.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await commonCatalyst.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await rareCatalyst.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await epicCatalyst.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
      expect(await legendaryCatalyst.balanceOf(other.address)).to.be.eq(
        BigNumber.from('100000000000000000000')
      );
    });
    it('if not default admin cannot withdraw any cats and gems from contract', async function () {
      const {other} = await setupPolygonStarterPack();
      await expect(
        other.PolygonStarterPack.withdrawAll(
          other.address,
          [1, 2, 3, 4],
          [1, 2, 3, 4, 5]
        )
      ).to.be.revertedWith(
        `AccessControl: account ${other.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
      );
    });
    it('cannot withdraw cats that do not exist', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [0, 1, 2, 3, 4, 5, 6],
          [3, 4]
        )
      ).to.be.revertedWith('INVALID_CATALYST_ID');
    });
    it('cannot withdraw gems that do not exist', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
      } = await setupPolygonStarterPack();
      await expect(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [1, 2, 3],
          [3, 4, 5, 8]
        )
      ).to.be.revertedWith('INVALID_GEM_ID');
    });
    it('withdrawal does not fail for zero balances if id exists', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        other,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {
        buyer: buyer.address,
        catalystIds,
        catalystQuantities: [100, 100, 100, 100],
        gemIds,
        gemQuantities: [100, 100, 100, 100, 100],
        nonce: 0,
      };
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await buyer.PolygonStarterPack.purchaseWithSAND(
        Message.buyer,
        Message,
        signature
      );
      await expect(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [1, 2, 3, 4],
          [1, 2, 3, 4, 5]
        )
      ).to.not.be.reverted;
    });
    it('withdrawAll event is emitted upon withdrawal', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [1, 2, 3, 4],
          [1, 2, 3, 4, 5]
        )
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'WithdrawAll'
      );
      const to = event.args[0];
      const catIds = event.args[1];
      const gemIds = event.args[2];
      expect(to).to.be.equal(other.address);
      expect(catIds[0]).to.be.equal(1);
      expect(catIds[1]).to.be.equal(2);
      expect(catIds[2]).to.be.equal(3);
      expect(catIds[3]).to.be.equal(4);
      expect(gemIds[0]).to.be.equal(1);
      expect(gemIds[1]).to.be.equal(2);
      expect(gemIds[2]).to.be.equal(3);
      expect(gemIds[3]).to.be.equal(4);
      expect(gemIds[4]).to.be.equal(5);
    });
  });
  describe('purchaseWithSAND', function () {
    it('can purchase bundle of cats and gems when SAND is enabled - zero prices', async function () {
      const {
        other,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {...TestMessage};
      Message.buyer = other.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      await expect(
        other.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.not.be.reverted;
    });
    it('can purchase bundle of cats and gems when SAND is enabled and prices are >0 with correct SAND amount', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        sandContract,
        powerGem,
        defenseGem,
        speedGem,
        magicGem,
        luckGem,
        commonCatalyst,
        rareCatalyst,
        epicCatalyst,
        legendaryCatalyst,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      const balance = await sandContract.balanceOf(buyer.address);
      const totalSpend = calculateSpend();
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.not.be.reverted;
      const totalPriceToPay = await PolygonStarterPack.callStatic.calculateTotalPriceInSAND(
        Message.catalystIds,
        Message.catalystQuantities,
        Message.gemIds,
        Message.gemQuantities
      );
      expect(totalSpend).to.eq(totalPriceToPay);
      expect(await sandContract.balanceOf(buyer.address)).to.eq(
        balance.sub(totalSpend)
      );

      expect(await powerGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[0])
      );
      expect(await defenseGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[1])
      );
      expect(await speedGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[2])
      );
      expect(await magicGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[3])
      );
      expect(await luckGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[4])
      );
      expect(await commonCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[0])
      );
      expect(await rareCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[1])
      );
      expect(await epicCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[2])
      );
      expect(await legendaryCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[3])
      );
    });
    it('cannot purchase bundle of cats and gems when SAND is not enabled', async function () {
      const {other, PolygonStarterPack} = await setupPolygonStarterPack();
      const Message = {...TestMessage};
      Message.buyer = other.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      await expect(
        other.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.be.revertedWith('SAND_IS_NOT_ENABLED');
    });
    it('a successful purchase results in a Purchase event', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        sandContract,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      const totalSpend = calculateSpend();
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      const receipt = await waitFor(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      );
      const event = await expectEventWithArgs(
        PolygonStarterPack,
        receipt,
        'Purchase'
      );
      // Event arguments: Purchase(address indexed buyer, Message message, uint256amountPaid, address token)
      const buyerAddress = event.args[0];
      const eventMessage = event.args[1];
      const amountPaidInSand = event.args[2];
      const sandTokenAddress = event.args[3];

      expect(buyerAddress).to.be.equal(buyer.address); // indexed
      expect(amountPaidInSand).to.be.equal(totalSpend);
      expect(sandTokenAddress).to.be.equal(sandContract.address);
      console.log(eventMessage, 'message');

      expect(eventMessage[0]).to.be.equal(Message.buyer);

      expect(eventMessage[1][0]).to.be.equal(Message.catalystIds[0]);
      expect(eventMessage[1][1]).to.be.equal(Message.catalystIds[1]);
      expect(eventMessage[1][2]).to.be.equal(Message.catalystIds[2]);
      expect(eventMessage[1][3]).to.be.equal(Message.catalystIds[3]);

      expect(eventMessage[2][0]).to.be.equal(Message.catalystQuantities[0]);
      expect(eventMessage[2][1]).to.be.equal(Message.catalystQuantities[1]);
      expect(eventMessage[2][2]).to.be.equal(Message.catalystQuantities[2]);
      expect(eventMessage[2][3]).to.be.equal(Message.catalystQuantities[3]);

      expect(eventMessage[3][0]).to.be.equal(Message.gemIds[0]);
      expect(eventMessage[3][1]).to.be.equal(Message.gemIds[1]);
      expect(eventMessage[3][2]).to.be.equal(Message.gemIds[2]);
      expect(eventMessage[3][3]).to.be.equal(Message.gemIds[3]);
      expect(eventMessage[3][4]).to.be.equal(Message.gemIds[4]);

      expect(eventMessage[4][0]).to.be.equal(Message.gemQuantities[0]);
      expect(eventMessage[4][1]).to.be.equal(Message.gemQuantities[1]);
      expect(eventMessage[4][2]).to.be.equal(Message.gemQuantities[2]);
      expect(eventMessage[4][3]).to.be.equal(Message.gemQuantities[3]);
      expect(eventMessage[4][4]).to.be.equal(Message.gemQuantities[4]);

      expect(eventMessage[5]).to.be.equal(Message.nonce);
    });
    it('cannot purchase bundle of cats and gems without enough SAND', async function () {
      const {
        other,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      Message.buyer = other.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      // approve SAND
      await other.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        other.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.be.revertedWith('INSUFFICIENT_FUNDS');
    });
    it('cannot purchase bundle of cats and gems if have not approved the StarterPack contract', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.be.revertedWith('NOT_AUTHORIZED_ALLOWANCE');
    });
    it('cannot purchase bundle of cats and gems if StarterPack contract does not have any', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        other,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      // remove cats & gems so contract is empty
      await PolygonStarterPackAsAdmin.withdrawAll(
        other.address,
        [1, 2, 3, 4],
        [1, 2, 3, 4, 5]
      ); // empty the contract
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.be.revertedWith('INSUFFICIENT_FUNDS'); // ERC20BaseTokenUpgradeable error message in Catalyst and Gem contracts
    });
    it('purchase fails with incorrect backend signature', async function () {
      const {
        PolygonStarterPackAsAdmin,
        buyer,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message,
        true // use BAD_KEY in signature
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_PURCHASE');
    });
    it('purchase fails with bad message params - catalyst lengths', async function () {
      const {
        PolygonStarterPackAsAdmin,
        buyer,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {
        buyer: buyer.address,
        catalystIds,
        catalystQuantities: [1], // bad param
        gemIds,
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: 0,
      };
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_CAT_INPUT');
    });
    it('purchase fails with bad message params - gem lengths', async function () {
      const {
        PolygonStarterPackAsAdmin,
        buyer,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {
        buyer: buyer.address,
        catalystIds,
        catalystQuantities: [1, 1, 1, 1],
        gemIds,
        gemQuantities: [2], // bad param
        nonce: 0,
      };
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_GEM_INPUT');
    });
    it('purchase invalidates the nonce after 1 use', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.not.be.reverted;
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_NONCE');
    });
    it('cannot purchase cats that do not exist', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {
        buyer: buyer.address,
        catalystIds: badCatIds,
        catalystQuantities: [1, 1, 1, 1],
        gemIds,
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: 0,
      };
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_CATALYST_ID');
    });
    it('cannot purchase gems that do not exist', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {
        buyer: buyer.address,
        catalystIds,
        catalystQuantities: [1, 1, 1, 1],
        gemIds: badGemIds,
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: 0,
      };
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_GEM_ID');
    });
    // it('cannot purchase if not msgSender()', async function () {
    //   const {
    //     buyer,
    //     PolygonStarterPackAsAdmin,
    //     PolygonStarterPack,
    //     other,
    //   } = await setupPolygonStarterPack();
    //   await PolygonStarterPackAsAdmin.setSANDEnabled(true);
    //   await PolygonStarterPackAsAdmin.setPrices(
    //     catalystIds,
    //     catPrices,
    //     gemIds,
    //     gemPrices
    //   );
    //   // fast forward 1 hour so the new prices are in effect
    //   await increaseTime(3600);
    //   const Message = {...TestMessage};
    //   Message.buyer = other.address; // bad param
    //   const signature = await starterPack712Signature(
    //     PolygonStarterPack,
    //     Message
    //   );
    //   // approve SAND
    //   await buyer.sandContract.approve(
    //     PolygonStarterPack.address,
    //     constants.MaxUint256
    //   );
    //   await expect(
    //     buyer.PolygonStarterPack.purchaseWithSAND(
    //       Message.buyer,
    //       Message,
    //       signature
    //     )
    //   ).to.be.revertedWith('INVALID_SENDER');
    // });
    it('cannot purchase if buyer is different from message.buyer', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        other,
        gemOwner,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      Message.buyer = other.address; // bad param
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(gemOwner, Message, signature)
      ).to.be.revertedWith('INVALID_BUYER');
    });
    it('purchase occurs with old prices if price change has not yet taken effect', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        sandContract,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward <1 hour so the new prices are not yet in effect
      await increaseTime(3000);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      const balance = await sandContract.balanceOf(buyer.address);
      const totalSpend = calculateSpend();
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.not.be.reverted;
      const totalPriceToPay = await PolygonStarterPack.callStatic.calculateTotalPriceInSAND(
        Message.catalystIds,
        Message.catalystQuantities,
        Message.gemIds,
        Message.gemQuantities
      );
      expect(totalSpend).not.to.eq(totalPriceToPay);
      expect(totalPriceToPay).to.eq(0);
      expect(await sandContract.balanceOf(buyer.address)).to.eq(balance);
    });
    it('purchase occurs with updated prices after price change delay', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        sandContract,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices2,
        gemIds,
        gemPrices2
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      const balance = await sandContract.balanceOf(buyer.address);
      const totalSpend = calculateSpend2();
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.not.be.reverted;
      const totalPriceToPay = await PolygonStarterPack.callStatic.calculateTotalPriceInSAND(
        Message.catalystIds,
        Message.catalystQuantities,
        Message.gemIds,
        Message.gemQuantities
      );
      expect(totalSpend).to.eq(totalPriceToPay);
      expect(await sandContract.balanceOf(buyer.address)).to.eq(
        balance.sub(totalSpend)
      );
    });
    it('purchase occurs with first price change before second price change has taken effect', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
        sandContract,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the first price change is in effect
      await increaseTime(3600);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices2,
        gemIds,
        gemPrices2
      );
      // fast forward <1 hour so the new prices are not yet in effect
      await increaseTime(2900);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      const balance = await sandContract.balanceOf(buyer.address);
      const totalSpend = calculateSpend();
      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.not.be.reverted;
      const totalPriceToPay = await PolygonStarterPack.callStatic.calculateTotalPriceInSAND(
        Message.catalystIds,
        Message.catalystQuantities,
        Message.gemIds,
        Message.gemQuantities
      );
      expect(totalSpend).to.eq(totalPriceToPay);
      expect(await sandContract.balanceOf(buyer.address)).to.eq(
        balance.sub(totalSpend)
      );
    });
    it('allows multiple nonce queues for a given buyer', async function () {
      const {
        buyer,
        PolygonStarterPackAsAdmin,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices2,
        gemIds,
        gemPrices2
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);

      // Nonce setup
      // Queue id 0
      const nonceForqueueId0 = await PolygonStarterPack.getNonceByBuyer(
        buyer.address,
        0
      );
      expect(nonceForqueueId0).to.be.equal(0);
      // Queue id 454
      const nonceForqueueId454 = await PolygonStarterPack.getNonceByBuyer(
        buyer.address,
        454
      );
      expect(nonceForqueueId454).to.be.equal(0);

      // for the default queueId=0, we can just pass the nonce
      const message = {
        buyer: buyer.address,
        catalystIds,
        catalystQuantities: [1, 1, 1, 1],
        gemIds,
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: nonceForqueueId0.toString(),
      };
      let signature = await starterPack712Signature(
        PolygonStarterPack,
        message
      );

      // approve SAND
      await buyer.sandContract.approve(
        PolygonStarterPack.address,
        constants.MaxUint256
      );

      // To get the nonce, we simply pass the buyer address & queueID
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          message.buyer,
          message,
          signature
        )
      ).to.not.be.reverted;

      let nonce = 0;
      const queueId = 454;

      // for any other queueId, we need to pack the values
      const messageQueue2 = {
        buyer: buyer.address,
        catalystIds,
        catalystQuantities: [1, 1, 1, 1],
        gemIds,
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: getPackedNonce(nonce, queueId).toString(),
      };
      signature = await starterPack712Signature(
        PolygonStarterPack,
        messageQueue2
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          messageQueue2.buyer,
          messageQueue2,
          signature
        )
      ).to.not.be.reverted;

      // Now we can simply increment the nonce in the new queue (with packing)
      nonce = 1;
      const updatedNonceQueue2 = getPackedNonce(nonce, queueId); // 0x000000000000000000000000000001c600000000000000000000000000000001
      const updatedMessageQueue2 = {
        buyer: buyer.address,
        catalystIds,
        catalystQuantities: [1, 1, 1, 1],
        gemIds,
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: updatedNonceQueue2.toString(),
      };
      signature = await starterPack712Signature(
        PolygonStarterPack,
        updatedMessageQueue2
      );
      await expect(
        buyer.PolygonStarterPack.purchaseWithSAND(
          updatedMessageQueue2.buyer,
          updatedMessageQueue2,
          signature
        )
      ).to.not.be.reverted;
    });
    it('order of cat IDs should not matter', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const message = {
        buyer: other.address,
        catalystIds: [3, 4, 2, 1],
        catalystQuantities: [1, 1, 1, 1],
        gemIds,
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: 0,
      };
      let signature = await starterPack712Signature(
        PolygonStarterPack,
        message
      );
      await expect(
        other.PolygonStarterPack.purchaseWithSAND(
          message.buyer,
          message,
          signature
        )
      ).to.not.be.reverted;
      message.catalystIds = [4, 3, 2, 1];
      message.nonce++;
      signature = await starterPack712Signature(PolygonStarterPack, message);
      await expect(
        other.PolygonStarterPack.purchaseWithSAND(
          message.buyer,
          message,
          signature
        )
      ).to.not.be.reverted;
    });
    it('order of gem IDs should not matter', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const message = {
        buyer: other.address,
        catalystIds,
        catalystQuantities: [1, 1, 1, 1],
        gemIds: [3, 4, 5, 2, 1],
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: 0,
      };
      let signature = await starterPack712Signature(
        PolygonStarterPack,
        message
      );
      await expect(
        other.PolygonStarterPack.purchaseWithSAND(
          message.buyer,
          message,
          signature
        )
      ).to.not.be.reverted;
      message.gemIds = [5, 4, 3, 2, 1];
      message.nonce++;
      signature = await starterPack712Signature(PolygonStarterPack, message);
      await expect(
        other.PolygonStarterPack.purchaseWithSAND(
          message.buyer,
          message,
          signature
        )
      ).to.not.be.reverted;
    });
    it('can get nonce for a buyer', async function () {
      const {PolygonStarterPack, buyer} = await setupPolygonStarterPack();
      // default queueId (0)
      let nonce = await PolygonStarterPack.getNonceByBuyer(buyer.address, 0);
      expect(nonce).to.be.equal(0);
      // queueId (7)
      nonce = await PolygonStarterPack.getNonceByBuyer(buyer.address, 7);
      expect(nonce).to.be.equal(0);
    });
    it('cannot reuse nonce', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        PolygonStarterPack,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {
        buyer: other.address,
        catalystIds,
        catalystQuantities: [1, 1, 1, 1],
        gemIds,
        gemQuantities: [2, 2, 2, 2, 2],
        nonce: 0,
      };
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );
      await other.PolygonStarterPack.purchaseWithSAND(
        Message.buyer,
        Message,
        signature
      );
      await expect(
        other.PolygonStarterPack.purchaseWithSAND(
          Message.buyer,
          Message,
          signature
        )
      ).to.be.revertedWith('INVALID_NONCE');
    });
  });
  describe('getPrices', function () {
    it('cats and gems prices are initially 0 (with 0 switchTime)', async function () {
      const {PolygonStarterPack} = await setupPolygonStarterPack();
      const prices = await PolygonStarterPack.getPrices(catalystIds, gemIds);

      const catalystPricesBeforeSwitch = prices[0];
      const catalystPricesAfterSwitch = prices[1];
      const gemPricesBeforeSwitch = prices[2];
      const gemPricesAfterSwitch = prices[3];
      const switchTime = prices[4];

      expect(catalystPricesBeforeSwitch[0]).to.be.equal(0);
      expect(catalystPricesAfterSwitch[0]).to.be.equal(0);
      expect(gemPricesBeforeSwitch[0]).to.be.equal(0);
      expect(gemPricesAfterSwitch[0]).to.be.equal(0);
      expect(switchTime).to.be.equal(0);
    });
    it('cats and gems prices can be viewed after an update has been made', async function () {
      const {
        PolygonStarterPack,
        PolygonStarterPackAsAdmin,
      } = await setupPolygonStarterPack();
      let receipt = await waitFor(
        PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices,
          gemIds,
          gemPrices
        )
      );
      let block = await ethers.provider.getBlock(receipt.blockHash);

      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      let prices = await PolygonStarterPack.getPrices(catalystIds, gemIds);
      let catalystPricesBeforeSwitch = prices[0];
      let catalystPricesAfterSwitch = prices[1];
      let gemPricesBeforeSwitch = prices[2];
      let gemPricesAfterSwitch = prices[3];
      let switchTime = prices[4];

      expect(catalystPricesBeforeSwitch[0]).to.be.equal(0);
      expect(catalystPricesAfterSwitch[0]).to.be.equal(catPrices[0]);
      expect(gemPricesBeforeSwitch[0]).to.be.equal(0);
      expect(gemPricesAfterSwitch[0]).to.be.equal(gemPrices[0]);
      expect(switchTime).to.be.equal(block.timestamp + 3600); // switchTime, which is 1 hour after a price change

      receipt = await waitFor(
        PolygonStarterPackAsAdmin.setPrices(
          catalystIds,
          catPrices2,
          gemIds,
          gemPrices2
        )
      );
      block = await ethers.provider.getBlock(receipt.blockHash);
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);

      prices = await PolygonStarterPack.getPrices(catalystIds, gemIds);
      catalystPricesBeforeSwitch = prices[0];
      catalystPricesAfterSwitch = prices[1];
      gemPricesBeforeSwitch = prices[2];
      gemPricesAfterSwitch = prices[3];
      switchTime = prices[4];

      expect(catalystPricesBeforeSwitch[0]).to.be.equal(catPrices[0]);
      expect(catalystPricesBeforeSwitch[1]).to.be.equal(catPrices[1]);
      expect(catalystPricesBeforeSwitch[2]).to.be.equal(catPrices[2]);
      expect(catalystPricesBeforeSwitch[3]).to.be.equal(catPrices[3]);

      expect(catalystPricesAfterSwitch[0]).to.be.equal(catPrices2[0]);
      expect(catalystPricesAfterSwitch[1]).to.be.equal(catPrices2[1]);
      expect(catalystPricesAfterSwitch[2]).to.be.equal(catPrices2[2]);
      expect(catalystPricesAfterSwitch[3]).to.be.equal(catPrices2[3]);

      expect(gemPricesBeforeSwitch[0]).to.be.equal(gemPrices[0]);
      expect(gemPricesBeforeSwitch[1]).to.be.equal(gemPrices[1]);
      expect(gemPricesBeforeSwitch[2]).to.be.equal(gemPrices[2]);
      expect(gemPricesBeforeSwitch[3]).to.be.equal(gemPrices[3]);
      expect(gemPricesBeforeSwitch[4]).to.be.equal(gemPrices[4]);

      expect(gemPricesAfterSwitch[0]).to.be.equal(gemPrices2[0]);
      expect(gemPricesAfterSwitch[1]).to.be.equal(gemPrices2[1]);
      expect(gemPricesAfterSwitch[2]).to.be.equal(gemPrices2[2]);
      expect(gemPricesAfterSwitch[3]).to.be.equal(gemPrices2[3]);
      expect(gemPricesAfterSwitch[4]).to.be.equal(gemPrices2[4]);

      expect(switchTime).to.be.equal(block.timestamp + 3600); // switchTime, which is 1 hour after a price change
    });
  });

  describe('isSANDEnabled', function () {
    it('can view whether SAND is enabled or not', async function () {
      const {PolygonStarterPack} = await setupPolygonStarterPack();
      expect(await PolygonStarterPack.isSANDEnabled()).to.be.false;
    });
  });
  describe('metatransactions', function () {
    it('can purchase with metatx', async function () {
      const {
        buyer,
        trustedForwarder,
        powerGem,
        defenseGem,
        speedGem,
        magicGem,
        luckGem,
        commonCatalyst,
        rareCatalyst,
        epicCatalyst,
        legendaryCatalyst,
        PolygonStarterPack,
        PolygonStarterPackAsAdmin,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );

      const {
        to,
        data,
      } = await PolygonStarterPack.populateTransaction.purchaseWithSAND(
        Message.buyer,
        Message,
        signature
      );

      const forwarder = trustedForwarder;
      const signer = buyer.address;

      const receipt = await sendMetaTx(to, forwarder, data, signer, '1000000');

      const txEvent = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        receipt,
        'TXResult'
      );

      expect(txEvent.args.success).to.be.true;

      expect(await powerGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[0])
      );
      expect(await defenseGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[1])
      );
      expect(await speedGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[2])
      );
      expect(await magicGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[3])
      );
      expect(await luckGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[4])
      );
      expect(await commonCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[0])
      );
      expect(await rareCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[1])
      );
      expect(await epicCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[2])
      );
      expect(await legendaryCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[3])
      );
    });
  });
  describe('sand approveAndCall', function () {
    it('can purchase with just one call using approveAndCall (prices set)', async function () {
      const {
        buyer,
        powerGem,
        defenseGem,
        speedGem,
        magicGem,
        luckGem,
        commonCatalyst,
        rareCatalyst,
        epicCatalyst,
        legendaryCatalyst,
        PolygonStarterPack,
        PolygonStarterPackAsAdmin,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setPrices(
        catalystIds,
        catPrices,
        gemIds,
        gemPrices
      );
      // fast forward 1 hour so the new prices are in effect
      await increaseTime(3600);
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );

      const encodedABI = await PolygonStarterPack.populateTransaction.purchaseWithSAND(
        Message.buyer,
        Message,
        signature
      );

      const price = await PolygonStarterPack.callStatic.calculateTotalPriceInSAND(
        Message.catalystIds,
        Message.catalystQuantities,
        Message.gemIds,
        Message.gemQuantities
      );
      expect(price).not.to.be.eq(0);

      const txValue = toWei(0);

      await buyer.sandContract.approveAndCall(
        PolygonStarterPack.address,
        price,
        encodedABI.data,
        {value: txValue}
      );

      expect(await powerGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[0])
      );
      expect(await defenseGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[1])
      );
      expect(await speedGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[2])
      );
      expect(await magicGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[3])
      );
      expect(await luckGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[4])
      );
      expect(await commonCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[0])
      );
      expect(await rareCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[1])
      );
      expect(await epicCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[2])
      );
      expect(await legendaryCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[3])
      );
    });
    it('can purchase with just one call using approveAndCall (prices zero)', async function () {
      const {
        buyer,
        powerGem,
        defenseGem,
        speedGem,
        magicGem,
        luckGem,
        commonCatalyst,
        rareCatalyst,
        epicCatalyst,
        legendaryCatalyst,
        PolygonStarterPack,
        PolygonStarterPackAsAdmin,
      } = await setupPolygonStarterPack();

      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );

      const encodedABI = await PolygonStarterPack.populateTransaction.purchaseWithSAND(
        Message.buyer,
        Message,
        signature
      );

      const price = await PolygonStarterPack.callStatic.calculateTotalPriceInSAND(
        Message.catalystIds,
        Message.catalystQuantities,
        Message.gemIds,
        Message.gemQuantities
      );
      expect(price).to.be.eq(0);

      const txValue = toWei(0);

      await buyer.sandContract.approveAndCall(
        PolygonStarterPack.address,
        price,
        encodedABI.data,
        {value: txValue}
      );

      expect(await powerGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[0])
      );
      expect(await defenseGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[1])
      );
      expect(await speedGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[2])
      );
      expect(await magicGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[3])
      );
      expect(await luckGem.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.gemQuantities[4])
      );
      expect(await commonCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[0])
      );
      expect(await rareCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[1])
      );
      expect(await epicCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[2])
      );
      expect(await legendaryCatalyst.balanceOf(buyer.address)).to.be.eq(
        BigNumber.from(Message.catalystQuantities[3])
      );
    });
    it('cannot purchase with just one call using approveAndCall if msgSender is not the buyer', async function () {
      const {
        buyer,
        PolygonStarterPack,
        PolygonStarterPackAsAdmin,
        sandContract,
      } = await setupPolygonStarterPack();
      await PolygonStarterPackAsAdmin.setSANDEnabled(true);
      const Message = {...TestMessage};
      Message.buyer = buyer.address;
      const signature = await starterPack712Signature(
        PolygonStarterPack,
        Message
      );

      const encodedABI = await PolygonStarterPack.populateTransaction.purchaseWithSAND(
        Message.buyer,
        Message,
        signature
      );

      const price = await PolygonStarterPack.callStatic.calculateTotalPriceInSAND(
        Message.catalystIds,
        Message.catalystQuantities,
        Message.gemIds,
        Message.gemQuantities
      );

      await expect(
        sandContract.approveAndCall(
          PolygonStarterPack.address,
          price,
          encodedABI.data
        )
      ).to.be.revertedWith('FIRST_PARAM_NOT_SENDER');
    });
  });

  describe('test array lengths for withdrawAll', function () {
    it('can withdraw 20 types of gems', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        deployManyGemContracts,
      } = await setupPolygonStarterPack();
      await deployManyGemContracts(15);
      await PolygonStarterPackAsAdmin.withdrawAll(
        other.address,
        [1, 2, 3, 4],
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      );
    });
    it('can withdraw 20 types of cats and gems', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        deployManyGemContracts,
        deployManyCatalystContracts,
      } = await setupPolygonStarterPack();
      await deployManyGemContracts(15);
      await deployManyCatalystContracts(16);
      await PolygonStarterPackAsAdmin.withdrawAll(
        other.address,
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      );
    });
    it('cannot withdraw more than the limit of catalysts and gems', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        deployManyGemContracts,
        deployManyCatalystContracts,
      } = await setupPolygonStarterPack();
      await deployManyGemContracts(25);
      await deployManyCatalystContracts(26);
      await expect(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
            31,
            32,
            33,
            34,
            35,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47,
            48,
            49,
            50,
          ],
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
            31,
            32,
            33,
            34,
            35,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47,
            48,
            49,
            50,
            51,
          ]
        )
      ).to.be.revertedWith('TOO_MANY_IDS');
    });
  });
  describe('GAS:PolygonStarterPack-PurchaseWithSAND', function () {
    it('WithdrawAll gas used for 100 each of 20 cats and 100 each of 20 gems', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        deployManyGemContracts,
        deployManyCatalystContracts,
      } = await setupPolygonStarterPack();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gasReport: any = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function record(name: any, gasUsed: any) {
        gasReport[name] = gasUsed.toNumber();
      }
      await deployManyGemContracts(15);
      await deployManyCatalystContracts(16);
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
          ],
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
          ]
        )
      );
      record(
        'Gas - WithdrawAll 100 each of 20 cats and 100 each of 20 gems - ',
        receipt.gasUsed
      );
      console.log(JSON.stringify(gasReport, null, '  '));
    });
    it('WithdrawAll gas used for 100 each of 30 cats and 100 each of 30 gems', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        deployManyGemContracts,
        deployManyCatalystContracts,
      } = await setupPolygonStarterPack();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gasReport: any = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function record(name: any, gasUsed: any) {
        gasReport[name] = gasUsed.toNumber();
      }
      await deployManyGemContracts(25);
      await deployManyCatalystContracts(26);
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
          ],
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
          ]
        )
      );
      record(
        'Gas - WithdrawAll 100 each of 30 cats and 100 each of 30 gems - ',
        receipt.gasUsed
      );
      console.log(JSON.stringify(gasReport, null, '  '));
    });
    it('WithdrawAll gas used for 100 each of 50 cats and 100 each of 50 gems', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        deployManyGemContracts,
        deployManyCatalystContracts,
      } = await setupPolygonStarterPack();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gasReport: any = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function record(name: any, gasUsed: any) {
        gasReport[name] = gasUsed.toNumber();
      }
      await deployManyGemContracts(45);
      await deployManyCatalystContracts(46);
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
            31,
            32,
            33,
            34,
            35,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47,
            48,
            49,
            50,
          ],
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
            31,
            32,
            33,
            34,
            35,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47,
            48,
            49,
            50,
          ]
        )
      );
      record(
        'Gas - WithdrawAll 100 each of 50 cats and 100 each of 50 gems - ',
        receipt.gasUsed
      );
      console.log(JSON.stringify(gasReport, null, '  '));
    });
    it('WithdrawAll gas used for 100 each of 50 cats only', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        deployManyGemContracts,
        deployManyCatalystContracts,
      } = await setupPolygonStarterPack();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gasReport: any = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function record(name: any, gasUsed: any) {
        gasReport[name] = gasUsed.toNumber();
      }
      await deployManyGemContracts(45);
      await deployManyCatalystContracts(46);
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
            31,
            32,
            33,
            34,
            35,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47,
            48,
            49,
            50,
          ],
          []
        )
      );
      record('Gas - WithdrawAll 100 each of 50 cats - ', receipt.gasUsed);
      console.log(JSON.stringify(gasReport, null, '  '));
    });
    it('WithdrawAll gas used for 100 each of 50 gems only', async function () {
      const {
        PolygonStarterPackAsAdmin,
        other,
        deployManyGemContracts,
        deployManyCatalystContracts,
      } = await setupPolygonStarterPack();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gasReport: any = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function record(name: any, gasUsed: any) {
        gasReport[name] = gasUsed.toNumber();
      }
      await deployManyGemContracts(45);
      await deployManyCatalystContracts(46);
      const receipt = await waitFor(
        PolygonStarterPackAsAdmin.withdrawAll(
          other.address,
          [],
          [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
            31,
            32,
            33,
            34,
            35,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47,
            48,
            49,
            50,
          ]
        )
      );
      record('Gas - WithdrawAll 100 each of 50 gems - ', receipt.gasUsed);
      console.log(JSON.stringify(gasReport, null, '  '));
    });
  });
});
