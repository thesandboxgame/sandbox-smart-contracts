import {expect} from '../../chai-setup';
import {
  Fixtures,
  setupPolygonSand,
  depositViaChildChainManager,
  sendMeta,
} from './fixtures';
import {toWei} from '../../utils';
import {BigNumber} from 'ethers';
import {ethers} from 'hardhat';

describe('PolygonSand.sol Meta TX', function () {
  let fixtures: Fixtures;
  let users: string[];
  let sandBeneficiary: string;
  beforeEach(async function () {
    fixtures = await setupPolygonSand();
    sandBeneficiary = fixtures.sandBeneficiary.address;
    users = fixtures.users.map((x) => x.address);
    const amount = toWei(123);
    await depositViaChildChainManager(fixtures, sandBeneficiary, amount);
  });
  describe('transfer', function () {
    it('without metatx', async function () {
      const amount = 123;
      const pre = BigNumber.from(await fixtures.sand.balanceOf(users[0]));
      await fixtures.sandBeneficiary.sand.transfer(users[0], amount);
      expect(await fixtures.sand.balanceOf(users[0])).to.be.equal(
        pre.add(amount)
      );
    });
    it('with metatx', async function () {
      const amount = 123;
      const pre = BigNumber.from(await fixtures.sand.balanceOf(users[0]));

      // users[3] pay for the gas, of a message signed by sandBeneficiary.
      await sendMeta(
        fixtures,
        sandBeneficiary,
        fixtures.sand.populateTransaction.transfer(users[0], amount)
      );
      expect(await fixtures.sand.balanceOf(users[0])).to.be.equal(
        pre.add(amount)
      );
    });
  });

  describe('approve and transferFrom', function () {
    it('without metatx', async function () {
      const amount = 123;
      const preBalance = BigNumber.from(
        await fixtures.sand.balanceOf(users[0])
      );
      const preAllowance = BigNumber.from(
        await fixtures.sand.allowance(sandBeneficiary, users[0])
      );
      await fixtures.sandBeneficiary.sand.approve(users[0], amount);
      expect(
        await fixtures.sand.allowance(
          fixtures.sandBeneficiary.address,
          users[0]
        )
      ).to.be.equal(preAllowance.add(amount));
      await fixtures.users[0].sand.transferFrom(
        sandBeneficiary,
        users[0],
        amount
      );
      expect(await fixtures.sand.balanceOf(users[0])).to.be.equal(
        preBalance.add(amount)
      );
    });
    it('with metatx', async function () {
      const amount = 123;
      const preBalance = BigNumber.from(
        await fixtures.sand.balanceOf(users[0])
      );
      const preAllowance = BigNumber.from(
        await fixtures.sand.allowance(sandBeneficiary, users[0])
      );
      await sendMeta(
        fixtures,
        sandBeneficiary,
        fixtures.sand.populateTransaction.approve(users[0], amount)
      );
      expect(
        await fixtures.sand.allowance(
          fixtures.sandBeneficiary.address,
          users[0]
        )
      ).to.be.equal(preAllowance.add(amount));
      await sendMeta(
        fixtures,
        users[0],
        fixtures.sand.populateTransaction.transferFrom(
          sandBeneficiary,
          users[0],
          amount
        )
      );
      expect(await fixtures.sand.balanceOf(users[0])).to.be.equal(
        preBalance.add(amount)
      );
    });
  });

  describe('burn', function () {
    it('without metatx', async function () {
      const amount = 123;
      const preSupply = BigNumber.from(await fixtures.sand.totalSupply());
      const pre = BigNumber.from(
        await fixtures.sand.balanceOf(sandBeneficiary)
      );
      await fixtures.sandBeneficiary.sand.burn(amount);
      expect(await fixtures.sand.balanceOf(sandBeneficiary)).to.be.equal(
        pre.sub(amount)
      );
      expect(await fixtures.sand.totalSupply()).to.be.equal(
        preSupply.sub(amount)
      );
    });
    it('with metatx', async function () {
      const amount = 123;
      const preSupply = BigNumber.from(await fixtures.sand.totalSupply());
      const pre = BigNumber.from(
        await fixtures.sand.balanceOf(sandBeneficiary)
      );
      await sendMeta(
        fixtures,
        sandBeneficiary,
        fixtures.sand.populateTransaction.burn(amount)
      );
      expect(await fixtures.sand.balanceOf(sandBeneficiary)).to.be.equal(
        pre.sub(amount)
      );
      expect(await fixtures.sand.totalSupply()).to.be.equal(
        preSupply.sub(amount)
      );
    });
  });

  describe('trusted forwarder', function () {
    it('should fail to set the trusted forwarder if not owner', async function () {
      await expect(
        fixtures.deployer.sand.setTrustedForwarder(users[3])
      ).to.revertedWith('caller is not the owner');
    });
    it('should success to set the trusted forwarder if owner', async function () {
      expect(await fixtures.sandBeneficiary.sand.isTrustedForwarder(users[3]))
        .to.be.false;
      await fixtures.sand
        .connect(await ethers.getSigner(await fixtures.sand.getAdmin()))
        .setTrustedForwarder(users[3]);
      expect(await fixtures.sandBeneficiary.sand.isTrustedForwarder(users[3]))
        .to.be.true;
      expect(
        await fixtures.sandBeneficiary.sand.getTrustedForwarder()
      ).to.be.equal(users[3]);
    });
  });

  describe('approveAndCall', function () {
    it('without metatx', async function () {
      const amount = 123;
      const target = fixtures.mockERC20BasicApprovalTarget.address;
      const pre = BigNumber.from(await fixtures.sand.balanceOf(target));
      const {
        data,
      } = await fixtures.mockERC20BasicApprovalTarget.populateTransaction.transferFrom(
        fixtures.sandBeneficiary.address,
        target,
        amount
      );
      await fixtures.sandBeneficiary.sand.approveAndCall(target, amount, data);
      expect(await fixtures.sand.balanceOf(target)).to.be.equal(
        pre.add(amount)
      );
    });
    it('with metatx', async function () {
      const amount = 123;
      const target = fixtures.mockERC20BasicApprovalTarget.address;
      const pre = BigNumber.from(await fixtures.sand.balanceOf(target));
      const {
        data,
      } = await fixtures.mockERC20BasicApprovalTarget.populateTransaction.transferFrom(
        fixtures.sandBeneficiary.address,
        target,
        amount
      );
      // users[3] pay for the gas, of a message signed by sandBeneficiary.
      await sendMeta(
        fixtures,
        sandBeneficiary,
        fixtures.sand.populateTransaction.approveAndCall(target, amount, data)
      );
      expect(await fixtures.sand.balanceOf(target)).to.be.equal(
        pre.add(amount)
      );
    });
  });

  describe('paidCall', function () {
    it('without metatx', async function () {
      const amount = 123;
      const target = fixtures.mockERC20BasicApprovalTarget.address;
      const pre = BigNumber.from(await fixtures.sand.balanceOf(target));
      const {
        data,
      } = await fixtures.mockERC20BasicApprovalTarget.populateTransaction.transferFrom(
        fixtures.sandBeneficiary.address,
        target,
        amount
      );
      await fixtures.sandBeneficiary.sand.paidCall(target, amount, data);
      expect(await fixtures.sand.balanceOf(target)).to.be.equal(
        pre.add(amount)
      );
    });
    it('with metatx', async function () {
      const amount = 123;
      const target = fixtures.mockERC20BasicApprovalTarget.address;
      const pre = BigNumber.from(await fixtures.sand.balanceOf(target));
      const {
        data,
      } = await fixtures.mockERC20BasicApprovalTarget.populateTransaction.transferFrom(
        fixtures.sandBeneficiary.address,
        target,
        amount
      );
      // users[3] pay for the gas, of a message signed by sandBeneficiary.
      await sendMeta(
        fixtures,
        sandBeneficiary,
        fixtures.sand.populateTransaction.paidCall(target, amount, data)
      );
      expect(await fixtures.sand.balanceOf(target)).to.be.equal(
        pre.add(amount)
      );
    });
  });
});
