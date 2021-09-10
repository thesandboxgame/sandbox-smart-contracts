import {expect} from 'chai';
import {onlyOwner, setupPolygonAvatarTunnelTest} from './fixtures';
import {selector} from '../../utils';
import {AddressZero} from '@ethersproject/constants';
import {ethers} from 'hardhat';
import {solidityPack} from 'ethers/lib/utils';

describe('PolygonAvatarTunnel.sol', function () {
  describe('owner', function () {
    it('owner is set', async function () {
      const fixtures = await setupPolygonAvatarTunnelTest();
      expect(await fixtures.avatarTunnelAsOwner.owner()).to.be.equal(
        fixtures.owner
      );
    });
    // eslint-disable-next-line mocha/no-setup-in-describe
    onlyOwner(
      setupPolygonAvatarTunnelTest,
      'setTrustedForwarder',
      'getTrustedForwarder'
    );
    // eslint-disable-next-line mocha/no-setup-in-describe
    onlyOwner(
      setupPolygonAvatarTunnelTest,
      'setChildAvatarToken',
      'childAvatarToken'
    );
    // eslint-disable-next-line mocha/no-setup-in-describe
    onlyOwner(setupPolygonAvatarTunnelTest, 'setRootTunnel', 'fxRootTunnel');
  });
  describe('sendAvatarToL1', function () {
    it('should success to send to L1', async function () {
      const tokenId = 123;
      const fixtures = await setupPolygonAvatarTunnelTest();
      await fixtures.childAvatarToken['mint(address,uint256)'](
        fixtures.other,
        tokenId
      );
      await fixtures.childAvatarTokenAsOther.approve(
        fixtures.contract.address,
        tokenId
      );
      const tx = fixtures.avatarTunnelAsOther.sendAvatarToL1(
        fixtures.dst,
        tokenId
      );
      await expect(tx)
        .to.emit(fixtures.avatarTunnelAsOwner, 'AvatarSentToL1')
        .withArgs(
          fixtures.childAvatarToken.address,
          fixtures.other,
          fixtures.dst,
          tokenId
        );
      // This event will be proved on L1
      await expect(tx)
        .to.emit(fixtures.avatarTunnelAsOwner, 'MessageSent')
        .withArgs(
          ethers.utils.defaultAbiCoder.encode(
            ['address', 'address', 'uint256'],
            [fixtures.other, fixtures.dst, tokenId]
          )
        );
      expect(await fixtures.childAvatarToken.ownerOf(tokenId)).to.be.equal(
        fixtures.contract.address
      );
    });
    it('should fail to send to L1 if destination is ZERO', async function () {
      const tokenId = 123;
      const fixtures = await setupPolygonAvatarTunnelTest();
      await expect(
        fixtures.avatarTunnelAsOther.sendAvatarToL1(AddressZero, tokenId)
      ).to.revertedWith('INVALID_USER');
    });
  });
  describe('receiveAvatarFromL1', function () {
    it('should success to receive from L1', async function () {
      // abi.encode(_msgSender(), to, tokenId)
      const tokenId = 123;
      const fixtures = await setupPolygonAvatarTunnelTest();
      await fixtures.avatarTunnelAsOwner.setRootTunnel(fixtures.fxRootTunnel);
      await fixtures.childAvatarToken['mint(address,uint256)'](
        fixtures.avatarTunnelAsOwner.address,
        tokenId
      );
      const data = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [fixtures.other, fixtures.dst, tokenId]
      );
      await expect(
        fixtures.avatarTunnelAsFxChild.processMessageFromRoot(
          123 /* stateId */,
          fixtures.fxRootTunnel /* rootMessageSender */,
          data
        )
      )
        .to.emit(fixtures.contract, 'AvatarReceivedFromL1')
        .withArgs(
          fixtures.childAvatarToken.address,
          fixtures.other,
          fixtures.dst,
          tokenId
        );
      expect(await fixtures.childAvatarToken.ownerOf(tokenId)).to.be.equal(
        fixtures.dst
      );
    });
    it('should fail to receive from L1 fxRootTunnel is not set', async function () {
      // abi.encode(_msgSender(), to, tokenId)
      const tokenId = 123;
      const fixtures = await setupPolygonAvatarTunnelTest();
      const data = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [fixtures.other, fixtures.dst, tokenId]
      );
      await expect(
        fixtures.avatarTunnelAsFxChild.processMessageFromRoot(
          123 /* stateId */,
          fixtures.fxRootTunnel /* rootMessageSender */,
          data
        )
      ).to.revertedWith('fxRootTunnel must be set');
    });
    it('should fail to receive from L1 if sender is not fxRootTunnel', async function () {
      // abi.encode(_msgSender(), to, tokenId)
      const tokenId = 123;
      const fixtures = await setupPolygonAvatarTunnelTest();
      await fixtures.avatarTunnelAsOwner.setRootTunnel(fixtures.fxRootTunnel);
      const data = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [fixtures.other, fixtures.dst, tokenId]
      );
      await expect(
        fixtures.avatarTunnelAsFxChild.processMessageFromRoot(
          123 /* stateId */,
          fixtures.other /* rootMessageSender */,
          data
        )
      ).to.revertedWith('INVALID_SENDER_FROM_ROOT');
    });
  });
  describe('meta transactions', function () {
    it('should success to send to L1', async function () {
      const tokenId = 123;
      const fixtures = await setupPolygonAvatarTunnelTest();
      await fixtures.childAvatarToken['mint(address,uint256)'](
        fixtures.other,
        tokenId
      );
      await fixtures.childAvatarTokenAsOther.approve(
        fixtures.contract.address,
        tokenId
      );
      const contractAsTrustedForwarder = await ethers.getContract(
        'PolygonAvatarTunnel',
        fixtures.trustedForwarder
      );
      const txData = await contractAsTrustedForwarder.populateTransaction.sendAvatarToL1(
        fixtures.dst,
        tokenId
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other]
      );
      const tx = contractAsTrustedForwarder.signer.sendTransaction(txData);
      await expect(tx)
        .to.emit(fixtures.avatarTunnelAsOwner, 'AvatarSentToL1')
        .withArgs(
          fixtures.childAvatarToken.address,
          fixtures.other,
          fixtures.dst,
          tokenId
        );
      // Thie event is proved on L1
      await expect(tx)
        .to.emit(fixtures.avatarTunnelAsOwner, 'MessageSent')
        .withArgs(
          ethers.utils.defaultAbiCoder.encode(
            ['address', 'address', 'uint256'],
            [fixtures.other, fixtures.dst, tokenId]
          )
        );
      expect(await fixtures.childAvatarToken.ownerOf(tokenId)).to.be.equal(
        fixtures.contract.address
      );
    });
  });
  it('coverage', async function () {
    const fixtures = await setupPolygonAvatarTunnelTest();
    const onERC721Received = 'onERC721Received(address,address,uint256,bytes)';
    const onERC721BatchReceived =
      'onERC721BatchReceived(address,address,uint256[],bytes)';
    expect(
      await fixtures.avatarTunnelAsOwner.onERC721Received(
        AddressZero,
        AddressZero,
        0,
        []
      )
    ).to.be.equal(selector(onERC721Received));
    expect(
      await fixtures.avatarTunnelAsOwner.onERC721BatchReceived(
        AddressZero,
        AddressZero,
        [],
        []
      )
    ).to.be.equal(selector(onERC721BatchReceived));
    expect(
      await fixtures.avatarTunnelAsOwner.supportsInterface(
        selector('supportsInterface(bytes4)')
      )
    ).to.be.true;
    expect(
      await fixtures.avatarTunnelAsOwner.supportsInterface(
        selector(onERC721Received)
      )
    ).to.be.true;
    expect(
      await fixtures.avatarTunnelAsOwner.supportsInterface(
        selector([onERC721Received, onERC721BatchReceived])
      )
    ).to.be.true;
  });
});
