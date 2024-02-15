import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupPolygonLandOperatorFilter} from '../../fixtures';
import {ZeroAddress} from 'ethers';
import {getId} from '../../fixtures';

describe('PolygonLand OperatorFilterer', function () {
  it('should be registered', async function () {
    const {OperatorFilterRegistry, PolygonLandContract} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    expect(
      await OperatorFilterRegistry.isRegistered(PolygonLandContract),
    ).to.be.equal(true);
  });

  it('would not register on the operator filter registry if not set on the Land', async function () {
    const {OperatorFilterRegistry, LandRegistryNotSetAsDeployer} =
      await loadFixture(setupPolygonLandOperatorFilter);
    await LandRegistryNotSetAsDeployer.registerFilterer(ZeroAddress, false);
    expect(
      await OperatorFilterRegistry.isRegistered(LandRegistryNotSetAsDeployer),
    ).to.be.equal(false);
  });

  it('would not subscribe to operatorFilterSubscription if Land is already registered', async function () {
    const {
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandRegistryNotSetAsDeployer,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    await LandRegistryNotSetAsDeployer.setOperatorRegistry(
      OperatorFilterRegistry,
    );
    await LandRegistryNotSetAsDeployer.registerFilterer(ZeroAddress, false);
    await LandRegistryNotSetAsDeployer.registerFilterer(
      operatorFilterSubscription,
      true,
    );

    expect(
      await OperatorFilterRegistry.subscriptionOf(LandRegistryNotSetAsDeployer),
    ).to.be.equal(ZeroAddress);
  });

  it('should could be registered through OperatorFiltererUpgradeable', async function () {
    const {OperatorFilterRegistry, LandRegistryNotSetAsDeployer} =
      await loadFixture(setupPolygonLandOperatorFilter);

    await LandRegistryNotSetAsDeployer.setOperatorRegistry(
      OperatorFilterRegistry,
    );
    await LandRegistryNotSetAsDeployer.registerFilterer(ZeroAddress, false);

    expect(
      await OperatorFilterRegistry.isRegistered(LandRegistryNotSetAsDeployer),
    ).to.be.equal(true);
  });

  it('should could be registered and copy subscription through OperatorFiltererUpgradeable', async function () {
    const {
      OperatorFilterRegistry,
      LandRegistryNotSetAsDeployer,
      operatorFilterSubscription,
      MockMarketPlace1,
    } = await loadFixture(setupPolygonLandOperatorFilter);

    await LandRegistryNotSetAsDeployer.setOperatorRegistry(
      OperatorFilterRegistry,
    );
    await LandRegistryNotSetAsDeployer.registerFilterer(
      operatorFilterSubscription,
      false,
    );

    expect(
      await OperatorFilterRegistry.isRegistered(LandRegistryNotSetAsDeployer),
    ).to.be.equal(true);

    expect(
      await OperatorFilterRegistry.subscriptionOf(LandRegistryNotSetAsDeployer),
    ).to.be.equal(ZeroAddress);

    expect(
      await OperatorFilterRegistry.isOperatorFiltered(
        LandRegistryNotSetAsDeployer,
        MockMarketPlace1,
      ),
    ).to.be.equal(true);
  });

  it('Black listed market places can be approved if operator filterer registry is not set on Land', async function () {
    const {
      LandRegistryNotSetAsDeployer,
      LandRegistryNotSetAsOther,
      operatorFilterSubscription,
      other,
      MockMarketPlace1,
    } = await loadFixture(setupPolygonLandOperatorFilter);

    await LandRegistryNotSetAsDeployer.mintQuad(other, 1, 0, 0, '0x');
    await LandRegistryNotSetAsDeployer.registerFilterer(
      operatorFilterSubscription,
      true,
    );

    await LandRegistryNotSetAsOther.setApprovalForAll(MockMarketPlace1, true);

    expect(
      await LandRegistryNotSetAsDeployer.isApprovedForAll(
        other,
        MockMarketPlace1,
      ),
    ).to.be.equal(true);
  });

  it('Black listed market places can transfer token if operator filterer registry is not set on Land', async function () {
    const {
      LandRegistryNotSetAsDeployer,
      LandRegistryNotSetAsOther,
      operatorFilterSubscription,
      other,
      other1,
      MockMarketPlace1,
    } = await loadFixture(setupPolygonLandOperatorFilter);

    await LandRegistryNotSetAsDeployer.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);
    await LandRegistryNotSetAsDeployer.registerFilterer(
      operatorFilterSubscription,
      true,
    );

    await LandRegistryNotSetAsOther.setApprovalForAll(MockMarketPlace1, true);

    expect(
      await LandRegistryNotSetAsDeployer.isApprovedForAll(
        other,
        MockMarketPlace1,
      ),
    ).to.be.equal(true);

    await MockMarketPlace1['transferLand(address,address,address,uint256)'](
      LandRegistryNotSetAsDeployer,
      other,
      other1,
      id,
    );

    expect(await LandRegistryNotSetAsDeployer.ownerOf(id)).to.be.equal(other1);
  });

  it('should be subscribed to operator filterer subscription contract', async function () {
    const {
      PolygonLandContract,
      OperatorFilterRegistry,
      operatorFilterSubscription,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    expect(
      await OperatorFilterRegistry.subscriptionOf(PolygonLandContract),
    ).to.be.equal(operatorFilterSubscription);
  });

  it('should be able to transfer land if from is the owner of token', async function () {
    const {LandAsOther, other, other1} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther.transferFrom(other, other1, id);

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);
  });

  it('should revert for minted invalid size', async function () {
    const {LandAsOther, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await expect(
      LandAsOther.mintQuad(other, 25, 0, 0, '0x'),
    ).to.be.revertedWith('Invalid size');
  });

  it('should be able to safe transfer land if from is the owner of token', async function () {
    const {LandAsOther, other, other1} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther['safeTransferFrom(address,address,uint256)'](
      other,
      other1,
      id,
    );

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);
  });

  it('should be able to safe transfer(with data) land if from is the owner of token', async function () {
    const {LandAsOther, other, other1} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther['safeTransferFrom(address,address,uint256,bytes)'](
      other,
      other1,
      id,
      '0x',
    );

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);
  });

  it('should be able to safe batch transfer Land if from is the owner of token', async function () {
    const {LandAsOther, other, other1} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id1 = getId(1, 0, 0);
    await LandAsOther.mintQuad(other, 1, 0, 1, '0x');
    const id2 = getId(1, 0, 1);

    await LandAsOther.safeBatchTransferFrom(other, other1, [id1, id2], '0x');

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(2);
  });

  it('should be able to batch transfer Land if from is the owner of token', async function () {
    const {LandAsOther, other, other1} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id1 = getId(1, 0, 0);

    await LandAsOther.mintQuad(other, 1, 0, 1, '0x');
    const id2 = getId(1, 0, 1);

    await LandAsOther.batchTransferFrom(other, other1, [id1, id2], '0x');

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(2);
  });

  it('should be able to transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
    const {MockMarketPlace1, LandAsOther, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther.transferFrom(other, MockMarketPlace1, id);

    expect(await LandAsOther.balanceOf(MockMarketPlace1)).to.be.equal(1);
  });

  it('should be able to safe transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
    const {MockMarketPlace1, LandAsOther, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther['safeTransferFrom(address,address,uint256)'](
      other,
      MockMarketPlace1,
      id,
    );

    expect(await LandAsOther.balanceOf(MockMarketPlace1)).to.be.equal(1);
  });

  it('should be able to safe transfer(with data) token if from is the owner of token and to is a blacklisted marketplace', async function () {
    const {MockMarketPlace1, LandAsOther, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther['safeTransferFrom(address,address,uint256,bytes)'](
      other,
      MockMarketPlace1,
      id,
      '0x',
    );

    expect(await LandAsOther.balanceOf(MockMarketPlace1)).to.be.equal(1);
  });

  it('should be able to safe batch transfer Land if from is the owner of token and to is a blacklisted marketplace', async function () {
    const {MockMarketPlace1, LandAsOther, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id1 = getId(1, 0, 0);
    await LandAsOther.mintQuad(other, 1, 0, 1, '0x');
    const id2 = getId(1, 0, 1);

    await LandAsOther.safeBatchTransferFrom(
      other,
      MockMarketPlace1,
      [id1, id2],
      '0x',
    );

    expect(await LandAsOther.balanceOf(MockMarketPlace1)).to.be.equal(2);
  });

  it('should be able to batch transfer token if from is the owner of token and to is a blacklisted marketplace', async function () {
    const {MockMarketPlace1, LandAsOther, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id1 = getId(1, 0, 0);

    await LandAsOther.mintQuad(other, 1, 0, 1, '0x');
    const id2 = getId(1, 0, 1);

    await LandAsOther.batchTransferFrom(
      other,
      MockMarketPlace1,
      [id1, id2],
      '0x',
    );

    expect(await LandAsOther.balanceOf(MockMarketPlace1)).to.be.equal(2);
  });

  it('it should not approve blacklisted market places', async function () {
    const {MockMarketPlace1, LandAsOther} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await expect(LandAsOther.approve(MockMarketPlace1, 1)).to.be.reverted;
  });

  it('it should not approveFor blacklisted market places', async function () {
    const {MockMarketPlace1, LandAsOther1, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await expect(LandAsOther1.approveFor(other, MockMarketPlace1, 1)).to.be
      .reverted;
  });

  it('it should not setApprovalForAll blacklisted market places', async function () {
    const {MockMarketPlace1, LandAsOther1} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await expect(LandAsOther1.setApprovalForAll(MockMarketPlace1, true)).to.be
      .reverted;
  });

  it('it should not setApprovalForAllFor blacklisted market places', async function () {
    const {MockMarketPlace1, LandAsOther1, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await expect(
      LandAsOther1.setApprovalForAllFor(other, MockMarketPlace1, true),
    ).to.be.reverted;
  });

  it('it should approve non blacklisted market places', async function () {
    const {MockMarketPlace3, LandAsOther, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );

    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther.approve(MockMarketPlace3, id);
    expect(await LandAsOther.getApproved(id)).to.be.equal(MockMarketPlace3);
  });

  it('it should approveFor non blacklisted market places', async function () {
    const {MockMarketPlace3, LandAsOther, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);
    await LandAsOther.approveFor(other, MockMarketPlace3, id);
    expect(await LandAsOther.getApproved(id)).to.be.equal(MockMarketPlace3);
  });

  it('it should setApprovalForAll non blacklisted market places', async function () {
    const {MockMarketPlace3, LandAsOther, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.setApprovalForAll(MockMarketPlace3, true);
    expect(
      await LandAsOther.isApprovedForAll(other, MockMarketPlace3),
    ).to.be.equal(true);
  });

  it('it should setApprovalForAllFor non blacklisted market places', async function () {
    const {MockMarketPlace3, LandAsOther, other} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.setApprovalForAllFor(other, MockMarketPlace3, true);
    expect(
      await LandAsOther.isApprovedForAll(other, MockMarketPlace3),
    ).to.be.equal(true);
  });

  it('it should not be able to approve non blacklisted market places after they are blacklisted', async function () {
    const {
      MockMarketPlace3,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      other,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id1 = getId(1, 0, 0);
    await LandAsOther.approve(MockMarketPlace3, id1);

    expect(await LandAsOther.getApproved(id1)).to.be.equal(MockMarketPlace3);

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace3,
      true,
    );

    await LandAsOther.mintQuad(other, 1, 0, 1, '0x');
    const id2 = getId(1, 0, 1);

    await expect(LandAsOther.approve(MockMarketPlace3, id2)).to.be.revertedWith(
      'Address is filtered',
    );
  });

  it('it should not be able to approveFor non blacklisted market places after they are blacklisted', async function () {
    const {
      MockMarketPlace3,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      other,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id1 = getId(1, 0, 0);
    await LandAsOther.approveFor(other, MockMarketPlace3, id1);

    expect(await LandAsOther.getApproved(id1)).to.be.equal(MockMarketPlace3);

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace3,
      true,
    );

    await LandAsOther.mintQuad(other, 1, 0, 1, '0x');
    const id2 = getId(1, 0, 1);

    await expect(
      LandAsOther.approveFor(other, MockMarketPlace3, id2),
    ).to.be.revertedWith('Address is filtered');
  });

  it('it should not be able to setApprovalForAll non blacklisted market places after they are blacklisted', async function () {
    const {
      MockMarketPlace3,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      LandAsOther1,
      other,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    await LandAsOther.setApprovalForAll(MockMarketPlace3, true);

    expect(
      await LandAsOther.isApprovedForAll(other, MockMarketPlace3),
    ).to.be.equal(true);

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace3,
      true,
    );

    await expect(
      LandAsOther1.setApprovalForAll(MockMarketPlace3, true),
    ).to.be.revertedWith('Address is filtered');
  });

  it('it should not be able to setApprovalForAllFor non blacklisted market places after they are blacklisted', async function () {
    const {
      MockMarketPlace3,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      LandAsOther1,
      other,
      other1,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    await LandAsOther.setApprovalForAllFor(other, MockMarketPlace3, true);

    expect(
      await LandAsOther.isApprovedForAll(other, MockMarketPlace3),
    ).to.be.equal(true);

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace3,
      true,
    );

    await expect(
      LandAsOther1.setApprovalForAllFor(other1, MockMarketPlace3, true),
    ).to.be.revertedWith('Address is filtered');
  });

  it('it should not be able to approve non blacklisted market places after there codeHashes are blacklisted', async function () {
    const {
      MockMarketPlace3,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      other,
    } = await loadFixture(setupPolygonLandOperatorFilter);

    const MockMarketPlace3CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace3);

    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id1 = getId(1, 0, 0);
    await LandAsOther.approve(MockMarketPlace3, id1);

    expect(await LandAsOther.getApproved(id1)).to.be.equal(MockMarketPlace3);

    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace3CodeHash,
      true,
    );

    await LandAsOther.mintQuad(other, 1, 0, 1, '0x');
    const id2 = getId(1, 0, 1);

    await expect(LandAsOther.approve(MockMarketPlace3, id2)).to.be.revertedWith(
      'Codehash is filtered',
    );
  });

  it('it should not be able to approveFor non blacklisted market places after there codeHashes are blacklisted', async function () {
    const {
      MockMarketPlace3,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      other,
    } = await loadFixture(setupPolygonLandOperatorFilter);

    const MockMarketPlace3CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace3);

    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id1 = getId(1, 0, 0);
    await LandAsOther.approveFor(other, MockMarketPlace3, id1);

    expect(await LandAsOther.getApproved(id1)).to.be.equal(MockMarketPlace3);

    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace3CodeHash,
      true,
    );

    await LandAsOther.mintQuad(other, 1, 0, 1, '0x');
    const id2 = getId(1, 0, 1);

    await expect(
      LandAsOther.approveFor(other, MockMarketPlace3, id2),
    ).to.be.revertedWith('Codehash is filtered');
  });

  it('it should not be able to setApprovalForAll non blacklisted market places after there codeHashes are blacklisted', async function () {
    const {
      MockMarketPlace3,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      LandAsOther1,
      other,
    } = await loadFixture(setupPolygonLandOperatorFilter);

    const MockMarketPlace3CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace3);

    await LandAsOther.setApprovalForAll(MockMarketPlace3, true);

    expect(
      await LandAsOther.isApprovedForAll(other, MockMarketPlace3),
    ).to.be.equal(true);

    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace3CodeHash,
      true,
    );

    await expect(
      LandAsOther1.setApprovalForAll(MockMarketPlace3, true),
    ).to.be.revertedWith('Codehash is filtered');
  });

  it('it should not be able to setApprovalForAllFor non blacklisted market places after there codeHashes are blacklisted', async function () {
    const {
      MockMarketPlace3,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      LandAsOther1,
      other,
      other1,
    } = await loadFixture(setupPolygonLandOperatorFilter);

    const MockMarketPlace3CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace3);

    await LandAsOther.setApprovalForAllFor(other, MockMarketPlace3, true);

    expect(
      await LandAsOther.isApprovedForAll(other, MockMarketPlace3),
    ).to.be.equal(true);

    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace3CodeHash,
      true,
    );

    await expect(
      LandAsOther1.setApprovalForAllFor(other1, MockMarketPlace3, true),
    ).to.be.revertedWith('Codehash is filtered');
  });

  it('it should be able to approve blacklisted market places after they are removed from the blacklist', async function () {
    const {
      MockMarketPlace1,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      other,
    } = await loadFixture(setupPolygonLandOperatorFilter);

    const MockMarketPlace1CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace1);

    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await expect(LandAsOther.approve(MockMarketPlace1, id)).to.be.revertedWith(
      'Address is filtered',
    );

    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace1CodeHash,
      false,
    );

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace1,
      false,
    );

    await LandAsOther.approve(MockMarketPlace1, id);

    expect(await LandAsOther.getApproved(id)).to.be.equal(MockMarketPlace1);
  });

  it('it should be able to approveFor blacklisted market places after they are removed from the blacklist', async function () {
    const {
      MockMarketPlace1,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      other,
    } = await loadFixture(setupPolygonLandOperatorFilter);

    const MockMarketPlace1CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace1);

    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await expect(
      LandAsOther.approveFor(other, MockMarketPlace1, id),
    ).to.be.revertedWith('Address is filtered');

    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace1CodeHash,
      false,
    );

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace1,
      false,
    );

    await LandAsOther.approveFor(other, MockMarketPlace1, id);

    expect(await LandAsOther.getApproved(id)).to.be.equal(MockMarketPlace1);
  });

  it('it should be able to setApprovalForAll blacklisted market places after they are removed from the blacklist', async function () {
    const {
      MockMarketPlace1,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      other,
    } = await loadFixture(setupPolygonLandOperatorFilter);

    const MockMarketPlace1CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace1);

    await expect(
      LandAsOther.setApprovalForAll(MockMarketPlace1, true),
    ).to.be.revertedWith('Address is filtered');

    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace1CodeHash,
      false,
    );

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace1,
      false,
    );

    await LandAsOther.setApprovalForAll(MockMarketPlace1, true);

    expect(await LandAsOther.isApprovedForAll(other, MockMarketPlace1)).to.be
      .true;
  });

  it('it should be able to setApprovalForAllFor blacklisted market places after they are removed from the blacklist', async function () {
    const {
      MockMarketPlace1,
      OperatorFilterRegistry,
      operatorFilterSubscription,
      LandAsOther,
      other,
    } = await loadFixture(setupPolygonLandOperatorFilter);

    const MockMarketPlace1CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace1);

    await expect(
      LandAsOther.setApprovalForAllFor(other, MockMarketPlace1, true),
    ).to.be.revertedWith('Address is filtered');

    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace1CodeHash,
      false,
    );

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace1,
      false,
    );

    await LandAsOther.setApprovalForAllFor(other, MockMarketPlace1, true);

    expect(
      await LandAsOther.isApprovedForAll(other, MockMarketPlace1),
    ).to.be.equal(true);
  });

  it('it should not be able to transfer through blacklisted market places', async function () {
    const {MockMarketPlace1, LandAsOther, other, other1} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther.setApprovalForAllWithOutFilter(MockMarketPlace1, true);
    await expect(
      MockMarketPlace1['transferLand(address,address,address,uint256,bytes)'](
        LandAsOther,
        other,
        other1,
        id,
        '0x',
      ),
    ).to.be.revertedWith('Address is filtered');
  });

  it('it should not be able to transfer through market places after they are blacklisted', async function () {
    const {
      MockMarketPlace3,
      LandAsOther,
      other,
      other1,
      OperatorFilterRegistry,
      operatorFilterSubscription,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id1 = getId(1, 0, 0);

    await LandAsOther.setApprovalForAllWithOutFilter(MockMarketPlace3, true);

    await MockMarketPlace3[
      'transferLand(address,address,address,uint256,bytes)'
    ](LandAsOther, other, other1, id1, '0x');

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace3,
      true,
    );

    await LandAsOther.mintQuad(other, 1, 0, 1, '0x');
    const id2 = getId(1, 0, 1);

    await expect(
      MockMarketPlace3['transferLand(address,address,address,uint256,bytes)'](
        LandAsOther,
        other,
        other1,
        id2,
        '0x',
      ),
    ).to.be.revertedWith('Address is filtered');
  });

  it('it should be able to transfer through non blacklisted market places', async function () {
    const {MockMarketPlace3, LandAsOther, other, other1} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther.setApprovalForAllWithOutFilter(MockMarketPlace3, true);
    await MockMarketPlace3[
      'transferLand(address,address,address,uint256,bytes)'
    ](LandAsOther, other, other1, id, '0x');

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);
  });

  it('it should not be able to transfer through non blacklisted market places after their codeHash is blacklisted', async function () {
    const {
      MockMarketPlace3,
      LandAsOther,
      other,
      other1,
      OperatorFilterRegistry,
      operatorFilterSubscription,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id1 = getId(1, 0, 0);

    await LandAsOther.setApprovalForAllWithOutFilter(MockMarketPlace3, true);
    await MockMarketPlace3[
      'transferLand(address,address,address,uint256,bytes)'
    ](LandAsOther, other, other1, id1, '0x');

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);

    const MockMarketPlace3CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace3);
    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace3CodeHash,
      true,
    );
    await LandAsOther.mintQuad(other, 1, 0, 1, '0x');
    const id2 = getId(1, 0, 1);

    await expect(
      MockMarketPlace3['transferLand(address,address,address,uint256,bytes)'](
        LandAsOther,
        other,
        other1,
        id2,
        '0x',
      ),
    ).to.be.revertedWith('Codehash is filtered');
  });

  it('it should be able to transfer through blacklisted market places after they are removed from blacklist', async function () {
    const {
      MockMarketPlace1,
      LandAsOther,
      other,
      other1,
      OperatorFilterRegistry,
      operatorFilterSubscription,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    const MockMarketPlace1CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace1);
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther.setApprovalForAllWithOutFilter(MockMarketPlace1, true);

    await expect(
      MockMarketPlace1['transferLand(address,address,address,uint256,bytes)'](
        LandAsOther,
        other,
        other1,
        id,
        '0x',
      ),
    ).to.be.revertedWith('Address is filtered');

    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace1CodeHash,
      false,
    );

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace1,
      false,
    );
    await MockMarketPlace1[
      'transferLand(address,address,address,uint256,bytes)'
    ](LandAsOther, other, other1, id, '0x');

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);
  });

  it('it should not be able to transfer(without data) through blacklisted market places', async function () {
    const {MockMarketPlace1, LandAsOther, LandAsOther1, other, other1} =
      await loadFixture(setupPolygonLandOperatorFilter);
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther1.setApprovalForAllWithOutFilter(MockMarketPlace1, true);
    await expect(
      MockMarketPlace1['transferLand(address,address,address,uint256)'](
        LandAsOther,
        other,
        other1,
        id,
      ),
    ).to.be.revertedWith('Address is filtered');
  });

  it('it should be able to transfer(without data) through non blacklisted market places', async function () {
    const {MockMarketPlace3, LandAsOther, other, other1} = await loadFixture(
      setupPolygonLandOperatorFilter,
    );
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther.setApprovalForAllWithOutFilter(MockMarketPlace3, true);

    await MockMarketPlace3['transferLand(address,address,address,uint256)'](
      LandAsOther,
      other,
      other1,
      id,
    );

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);
  });

  it('it should be not be able to transfer(without data) through market places after they are blacklisted', async function () {
    const {
      MockMarketPlace3,
      LandAsOther,
      LandAsOther1,
      other,
      other1,
      OperatorFilterRegistry,
      operatorFilterSubscription,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther.setApprovalForAllWithOutFilter(MockMarketPlace3, true);

    await MockMarketPlace3['transferLand(address,address,address,uint256)'](
      LandAsOther,
      other,
      other1,
      id,
    );

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace3,
      true,
    );

    await LandAsOther1.setApprovalForAllWithOutFilter(MockMarketPlace3, true);

    await expect(
      MockMarketPlace3['transferLand(address,address,address,uint256)'](
        LandAsOther,
        other1,
        other,
        id,
      ),
    ).to.be.revertedWith('Address is filtered');
  });

  it('it should be not be able to transfer(without data) through market places after their codeHash is blackListed', async function () {
    const {
      MockMarketPlace3,
      LandAsOther,
      LandAsOther1,
      other,
      other1,
      OperatorFilterRegistry,
      operatorFilterSubscription,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther.setApprovalForAllWithOutFilter(MockMarketPlace3, true);

    await MockMarketPlace3['transferLand(address,address,address,uint256)'](
      LandAsOther,
      other,
      other1,
      id,
    );

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);

    const MockMarketPlace3CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace3);

    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace3CodeHash,
      true,
    );

    await LandAsOther1.setApprovalForAllWithOutFilter(MockMarketPlace3, true);

    await expect(
      MockMarketPlace3['transferLand(address,address,address,uint256)'](
        LandAsOther,
        other1,
        other,
        id,
      ),
    ).to.be.revertedWith('Codehash is filtered');
  });

  it('it should be able to transfer(without data) through blacklisted market places after they are removed from blacklist', async function () {
    const {
      MockMarketPlace1,
      LandAsOther,
      other,
      other1,
      OperatorFilterRegistry,
      operatorFilterSubscription,
    } = await loadFixture(setupPolygonLandOperatorFilter);
    const MockMarketPlace1CodeHash =
      await OperatorFilterRegistry.codeHashOf(MockMarketPlace1);
    await LandAsOther.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);

    await LandAsOther.setApprovalForAllWithOutFilter(MockMarketPlace1, true);
    await expect(
      MockMarketPlace1['transferLand(address,address,address,uint256)'](
        LandAsOther,
        other,
        other1,
        id,
      ),
    ).to.be.revertedWith('Address is filtered');

    await OperatorFilterRegistry.updateCodeHash(
      operatorFilterSubscription,
      MockMarketPlace1CodeHash,
      false,
    );

    await OperatorFilterRegistry.updateOperator(
      operatorFilterSubscription,
      MockMarketPlace1,
      false,
    );

    await MockMarketPlace1['transferLand(address,address,address,uint256)'](
      LandAsOther,
      other,
      other1,
      id,
    );

    expect(await LandAsOther.balanceOf(other1)).to.be.equal(1);
  });
});
