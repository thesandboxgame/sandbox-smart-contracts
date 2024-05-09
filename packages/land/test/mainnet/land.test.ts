import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupLand, setupLandMock} from './fixtures';
import {gasAndSizeChecks} from '../common/gasAndSizeChecks.behavior';
import {keccak256, Wallet} from 'ethers';
import {getId} from '../fixtures';

describe('Land.sol', function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  gasAndSizeChecks(setupLand, 'Land');

  it('check storage structure', async function () {
    const {landContract} = await loadFixture(setupLandMock);
    const slots = await landContract.getStorageStructure();
    expect(slots._admin).to.be.equal(0);
    expect(slots._superOperators).to.be.equal(1);
    expect(slots._metaTransactionContracts).to.be.equal(2);
    expect(slots._numNFTPerAddress).to.be.equal(3);
    expect(slots._owners).to.be.equal(4);
    expect(slots._operatorsForAll).to.be.equal(5);
    expect(slots._operators).to.be.equal(6);
    expect(slots._initialized).to.be.equal(7);
    expect(slots._minters).to.be.equal(57);
    expect(slots.operatorFilterRegistry).to.be.equal(58);
  });

  it('write mixins to get 100% coverage on them', async function () {
    const {LandAsAdmin, LandAsMinter, other} = await loadFixture(setupLand);

    const admin = Wallet.createRandom();
    const superOperator = Wallet.createRandom();
    const owner = Wallet.createRandom();
    const quantity = keccak256(await Wallet.createRandom().getAddress());
    await LandAsMinter.mintQuad(other, 1, 407, 407, '0x');
    const tokenId = getId(1, 407, 407);
    // owner + operator flag
    const ownerData = BigInt(await owner.getAddress()) | (2n ** 255n);
    const operator = Wallet.createRandom();
    const minter = Wallet.createRandom();
    const registry = Wallet.createRandom();
    await LandAsAdmin.writeMixingForCoverage(
      admin,
      superOperator,
      owner,
      quantity,
      tokenId,
      ownerData,
      operator,
      minter,
      registry,
    );
    expect(await LandAsAdmin.getAdmin()).to.be.equal(admin);
    expect(await LandAsAdmin.isSuperOperator(superOperator)).to.be.true;
    expect(await LandAsAdmin.balanceOf(owner)).to.be.equal(quantity);
    expect(await LandAsAdmin.getOwnerData(tokenId)).to.be.equal(ownerData);
    expect(await LandAsAdmin.isApprovedForAll(owner, operator)).to.be.true;
    expect(await LandAsAdmin.getApproved(tokenId)).to.be.equal(operator);
    expect(await LandAsAdmin.isMinter(minter)).to.be.true;
    expect(await LandAsAdmin.operatorFilterRegistry()).to.be.equal(registry);
  });
});
