import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {expect} from 'chai';
import {
  setupAndInitializeERC2771Upgradable,
  setupERC2771,
  setupERC2771Upgradable,
  SetupType,
} from './fixtures';
import {BigNumber, constants, ethers} from 'ethers';

function testContract(fixture: () => Promise<SetupType>) {
  it('deployer should be able to set the trusted forwarder', async function () {
    const {deployer, trustedForwarder, other, contractAsDeployer} =
      await loadFixture(fixture);
    expect(await contractAsDeployer.getTrustedForwarder()).to.be.equal(
      trustedForwarder.address
    );
    expect(await contractAsDeployer.isTrustedForwarder(deployer.address)).to.be
      .false;
    expect(
      await contractAsDeployer.isTrustedForwarder(trustedForwarder.address)
    ).to.be.true;
    expect(await contractAsDeployer.isTrustedForwarder(other.address)).to.be
      .false;

    await expect(contractAsDeployer.setTrustedForwarder(other.address))
      .to.emit(contractAsDeployer, 'TrustedForwarderSet')
      .withArgs(trustedForwarder.address, other.address, deployer.address);

    expect(await contractAsDeployer.getTrustedForwarder()).to.be.equal(
      other.address
    );
    expect(await contractAsDeployer.isTrustedForwarder(deployer.address)).to.be
      .false;
    expect(
      await contractAsDeployer.isTrustedForwarder(trustedForwarder.address)
    ).to.be.false;
    expect(await contractAsDeployer.isTrustedForwarder(other.address)).to.be
      .true;
  });
  describe('from trusted forwarder', function () {
    it('get sender', async function () {
      const {trustedForwarder, contractAsTrustedForwarder} = await loadFixture(
        fixture
      );

      const tx =
        await contractAsTrustedForwarder.populateTransaction.getSender();

      // short data 4 bytes
      expect(BigNumber.from(await trustedForwarder.call(tx))).to.be.equal(
        BigNumber.from(trustedForwarder.address)
      );

      // data padded with an address
      tx.data = tx.data + trustedForwarder.address.slice(2).toLowerCase();
      expect(BigNumber.from(await trustedForwarder.call(tx))).to.be.equal(
        BigNumber.from(trustedForwarder.address)
      );
    });

    it('get data', async function () {
      const {trustedForwarder, contractAsTrustedForwarder} = await loadFixture(
        fixture
      );
      const tx = await contractAsTrustedForwarder.populateTransaction.getData();
      const data = tx.data;
      let result;
      result = ethers.utils.defaultAbiCoder.decode(
        ['bytes'],
        await trustedForwarder.call(tx)
      );
      // short data 4 bytes
      expect(result[0]).to.be.equal(data);

      // data padded with an address
      tx.data = tx.data + trustedForwarder.address.slice(2).toLowerCase();
      result = ethers.utils.defaultAbiCoder.decode(
        ['bytes'],
        await trustedForwarder.call(tx)
      );
      // short data 4 bytes
      expect(result[0]).to.be.equal(data);
    });
  });
  describe('from deployer', function () {
    it('get sender', async function () {
      const {deployer, trustedForwarder, contractAsDeployer} =
        await loadFixture(fixture);
      const tx = await contractAsDeployer.populateTransaction.getSender();

      // short data 4 bytes
      expect(BigNumber.from(await deployer.call(tx))).to.be.equal(
        BigNumber.from(deployer.address)
      );

      // data padded with an address
      tx.data = tx.data + trustedForwarder.address.slice(2).toLowerCase();
      expect(BigNumber.from(await deployer.call(tx))).to.be.equal(
        BigNumber.from(deployer.address)
      );
    });

    it('get data', async function () {
      const {deployer, trustedForwarder, contractAsDeployer} =
        await loadFixture(fixture);
      const tx = await contractAsDeployer.populateTransaction.getData();

      let result;
      result = ethers.utils.defaultAbiCoder.decode(
        ['bytes'],
        await deployer.call(tx)
      );
      // short data 4 bytes
      expect(result[0]).to.be.equal(tx.data);

      // data padded with an address
      tx.data = tx.data + trustedForwarder.address.slice(2).toLowerCase();
      result = ethers.utils.defaultAbiCoder.decode(
        ['bytes'],
        await deployer.call(tx)
      );
      // short data 4 bytes
      expect(result[0]).to.be.equal(tx.data);
    });
  });
}

describe('ERC2771', function () {
  describe('ERC2771Handler.sol', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    testContract(setupERC2771);
  });

  describe('setupERC2771Upgradable.sol', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    testContract(setupAndInitializeERC2771Upgradable);

    it('coverage', async function () {
      const {deployer, trustedForwarder, contractAsDeployer} =
        await loadFixture(setupERC2771Upgradable);
      await expect(contractAsDeployer.initialize2(trustedForwarder.address))
        .to.emit(contractAsDeployer, 'TrustedForwarderSet')
        .withArgs(
          constants.AddressZero,
          trustedForwarder.address,
          deployer.address
        );
      await expect(
        contractAsDeployer.initialize(trustedForwarder.address)
      ).to.revertedWith('Initializable: contract is already initialized');
      await expect(
        contractAsDeployer.initialize2(trustedForwarder.address)
      ).to.revertedWith('Initializable: contract is already initialized');
      await expect(
        contractAsDeployer.initialize3(trustedForwarder.address)
      ).to.revertedWith('Initializable: contract is not initializing');
      await expect(
        contractAsDeployer.initialize4(trustedForwarder.address)
      ).to.revertedWith('Initializable: contract is not initializing');
    });
  });
});
