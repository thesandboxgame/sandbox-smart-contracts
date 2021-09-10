import hre, {ethers} from 'hardhat';
import {expect} from 'chai';
import {toWei, withSnapshot} from '../../utils';
import {BigNumber} from 'ethers';
import {getContractFromDeployment} from '../../../utils/companionNetwork';
import {defaultAbiCoder} from 'ethers/lib/utils';
import {avatarSaleSignature} from '../../common/signatures';
import {getAvatarContracts} from '../../common/fixtures/avatar';
import {getMessageLogFromTx} from './fixtures';
import {Log} from '@ethersproject/abstract-provider';

const deployAvatar = withSnapshot(
  [
    'Avatar',
    'PolygonAvatar',
    'PolygonAvatarSale',
    'AvatarTunnel',
    'PolygonAvatarTunnel',
  ],
  async () => {
    return await getAvatarContracts(
      hre.companionNetworks['l1'],
      hre.companionNetworks['l2']
    );
  }
);

describe('PolygonAvatar - Avatar deployment test', function () {
  describe('roles', function () {
    before(async function () {
      const {l1Net, l2Net, l1, l2, buyer} = await deployAvatar();
      this.l1Net = l1Net;
      this.l2Net = l2Net;
      this.l1 = l1;
      this.l2 = l2;
      this.buyer = buyer;
    });
    it('admin', async function () {
      const defaultAdminRole = await this.l1.avatar.DEFAULT_ADMIN_ROLE();
      expect(await this.l1.avatar.hasRole(defaultAdminRole, this.l1.sandAdmin))
        .to.be.true;
      expect(await this.l2.avatar.hasRole(defaultAdminRole, this.l2.sandAdmin))
        .to.be.true;
      expect(await this.l2.avatar.hasRole(defaultAdminRole, this.l2.sandAdmin))
        .to.be.true;
    });
    it('minter', async function () {
      const minterRole = await this.l1.avatar.MINTER_ROLE();
      expect(
        await this.l1.avatar.hasRole(minterRole, this.l1.avatarTunnel.address)
      ).to.be.true;
      expect(await this.l2.avatar.hasRole(minterRole, this.l2.sale.address)).to
        .be.true;
    });
    it('trusted forwarder', async function () {
      expect(await this.l1.avatar.getTrustedForwarder()).to.be.equal(
        this.l1.trustedForwarder.address
      );
      expect(await this.l2.avatar.getTrustedForwarder()).to.be.equal(
        this.l2.trustedForwarder.address
      );
      expect(await this.l2.sale.getTrustedForwarder()).to.be.equal(
        this.l2.trustedForwarder.address
      );
    });
    it('signer', async function () {
      const signerRole = await this.l2.sale.SIGNER_ROLE();
      expect(await this.l2.sale.hasRole(signerRole, this.l2.backendAuthWallet))
        .to.be.true;
    });
    it('seller', async function () {
      const sellerRole = await this.l2.sale.SELLER_ROLE();
      expect(await this.l2.sale.hasRole(sellerRole, this.l2.sandboxAccount)).to
        .be.true;
    });
  });

  describe('buy, withdraw to L1 and back to L2', function () {
    before(async function () {
      const {l1Net, l2Net, l1, l2, buyer} = await deployAvatar();
      this.l1Net = l1Net;
      this.l2Net = l2Net;
      this.l1 = l1;
      this.l2 = l2;
      this.buyer = buyer;
      this.tokenId = BigNumber.from(0x123);
      this.price = toWei(5);
      this.polygonAvatarAsBuyer = await getContractFromDeployment(
        this.l2Net,
        'PolygonAvatar',
        this.buyer
      );
      this.polygonAvatarTunnelAsBuyer = await getContractFromDeployment(
        this.l2Net,
        'PolygonAvatarTunnel',
        this.buyer
      );
      this.avatarAsBuyer = await getContractFromDeployment(
        this.l1Net,
        'Avatar',
        this.buyer
      );
      this.avatarTunnelAsBuyer = await getContractFromDeployment(
        this.l1Net,
        'AvatarTunnel',
        this.buyer
      );
    });
    it('mint sand', async function () {
      const sandToken = await getContractFromDeployment(
        this.l2Net,
        'PolygonSand'
      );
      await this.l2.childChainManager.callSandDeposit(
        sandToken.address,
        this.buyer,
        defaultAbiCoder.encode(['uint256'], [this.price])
      );
    });
    it('user can buy an avatar', async function () {
      const sandTokenAsBuyer = await getContractFromDeployment(
        this.l2Net,
        'PolygonSand',
        this.buyer
      );
      const polygonAvatarSaleAsBuyer = await getContractFromDeployment(
        this.l2Net,
        'PolygonAvatarSale',
        this.buyer
      );
      await sandTokenAsBuyer.approve(this.l2.sale.address, this.price);
      const {v, r, s} = await avatarSaleSignature(
        this.l2.sale,
        this.l2.backendAuthWallet,
        this.buyer,
        [this.tokenId],
        this.l2.sandboxAccount,
        this.price,
        this.l2.backendAuthEtherWallet.privateKey
      );

      await polygonAvatarSaleAsBuyer.execute(
        v,
        r,
        s,
        this.buyer,
        [this.tokenId],
        this.l2.sandboxAccount,
        this.price
      );

      await expect(this.l1.avatar.ownerOf(this.tokenId)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
      expect(await this.l2.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.buyer
      );
    });
    it('now can withdraw to L1', async function () {
      await this.polygonAvatarAsBuyer.approve(
        this.l2.avatarTunnel.address,
        this.tokenId
      );
      const tx = this.polygonAvatarTunnelAsBuyer.sendAvatarToL1(
        this.buyer,
        this.tokenId
      );
      await expect(tx)
        .to.emit(this.l2.avatarTunnel, 'AvatarSentToL1')
        .withArgs(this.l2.avatar.address, this.buyer, this.buyer, this.tokenId);
      // This event will be proved on L1
      await expect(tx)
        .to.emit(this.l2.avatarTunnel, 'MessageSent')
        .withArgs(
          ethers.utils.defaultAbiCoder.encode(
            ['address', 'address', 'uint256'],
            [this.buyer, this.buyer, this.tokenId]
          )
        );
      await expect(this.l1.avatar.ownerOf(this.tokenId)).to.revertedWith(
        'ERC721: owner query for nonexistent token'
      );
      // locked in the tunnel
      expect(await this.l2.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l2.avatarTunnel.address
      );
    });
    it('With the emission of the MessageSent event, the user will be able to call the tunnel on L1', async function () {
      const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [this.buyer, this.buyer, this.tokenId]
      );

      // This uses the MockAvatarTunnel
      await this.l1.avatarTunnel.processMessageFromChild(message);
      expect(await this.l1.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.buyer
      );
      // locked in the tunnel
      expect(await this.l2.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l2.avatarTunnel.address
      );
    });
    it('now can lock the token in the tunnel and send it to L2', async function () {
      await this.avatarAsBuyer.approve(
        this.l1.avatarTunnel.address,
        this.tokenId
      );
      const tx = this.avatarTunnelAsBuyer.sendAvatarToL2(
        this.buyer,
        this.tokenId
      );
      await expect(tx)
        .to.emit(this.l1.avatarTunnel, 'AvatarSentToL2')
        .withArgs(this.l1.avatar.address, this.buyer, this.buyer, this.tokenId);
      await expect(tx)
        .to.emit(this.l1.fxRoot, 'SendingMessageToChild')
        .withArgs(
          this.l2.avatarTunnel.address,
          ethers.utils.defaultAbiCoder.encode(
            ['address', 'address', 'uint256'],
            [this.buyer, this.buyer, this.tokenId]
          )
        );
      // locked in the tunnel
      expect(await this.l1.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l1.avatarTunnel.address
      );
      // locked in the tunnel
      expect(await this.l2.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l2.avatarTunnel.address
      );
    });
    it('With the emission of the SendingMessageToChild event, the polygon manager will call the tunnel on L2', async function () {
      const syncData = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [this.buyer, this.buyer, this.tokenId]
      );
      // This uses FakeFxChild
      await this.l2.fxChild.onStateReceive(
        12 /* stateId */,
        this.l2.avatarTunnel.address,
        this.l1.avatarTunnel.address,
        syncData
      );
      // locked in the tunnel
      expect(await this.l1.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l1.avatarTunnel.address
      );
      expect(await this.l2.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.buyer
      );
    });
    it('Now if we withdraw to L1 instead of minting the tunnel will do a transfer', async function () {
      await this.polygonAvatarAsBuyer.approve(
        this.l2.avatarTunnel.address,
        this.tokenId
      );
      await this.polygonAvatarTunnelAsBuyer.sendAvatarToL1(
        this.buyer,
        this.tokenId
      );
      // Locked in L1
      expect(await this.l1.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l1.avatarTunnel.address
      );
      // locked in L2
      expect(await this.l2.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l2.avatarTunnel.address
      );

      const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [this.buyer, this.buyer, this.tokenId]
      );
      // This uses the MockAvatarTunnel
      await this.l1.avatarTunnel.processMessageFromChild(message);

      expect(await this.l1.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.buyer
      );
      // locked in L2
      expect(await this.l2.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l2.avatarTunnel.address
      );
    });
  });

  describe('buy and withdraw to L1 using the matic-fx api and a fake checkpoint manager', function () {
    before(async function () {
      const {l1Net, l2Net, l1, l2, buyer} = await deployAvatar();
      this.l1Net = l1Net;
      this.l2Net = l2Net;
      this.l1 = l1;
      this.l2 = l2;
      this.buyer = buyer;
      this.tokenId = BigNumber.from(0x123);
      this.price = toWei(5);
      this.polygonAvatarAsBuyer = await getContractFromDeployment(
        this.l2Net,
        'PolygonAvatar',
        this.buyer
      );
      this.polygonAvatarTunnelAsBuyer = await getContractFromDeployment(
        this.l2Net,
        'PolygonAvatarTunnel',
        this.buyer
      );
      this.avatarAsBuyer = await getContractFromDeployment(
        this.l1Net,
        'Avatar',
        this.buyer
      );
      this.avatarTunnelAsBuyer = await getContractFromDeployment(
        this.l1Net,
        'AvatarTunnel',
        this.buyer
      );
    });
    it('mint sand, and buy an avatar', async function () {
      const sandToken = await getContractFromDeployment(
        this.l2Net,
        'PolygonSand'
      );
      await this.l2.childChainManager.callSandDeposit(
        sandToken.address,
        this.buyer,
        defaultAbiCoder.encode(['uint256'], [this.price])
      );
      const sandTokenAsBuyer = await getContractFromDeployment(
        this.l2Net,
        'PolygonSand',
        this.buyer
      );
      const polygonAvatarSaleAsBuyer = await getContractFromDeployment(
        this.l2Net,
        'PolygonAvatarSale',
        this.buyer
      );
      await sandTokenAsBuyer.approve(this.l2.sale.address, this.price);
      const {v, r, s} = await avatarSaleSignature(
        this.l2.sale,
        this.l2.backendAuthWallet,
        this.buyer,
        [this.tokenId],
        this.l2.sandboxAccount,
        this.price,
        this.l2.backendAuthEtherWallet.privateKey
      );

      await polygonAvatarSaleAsBuyer.execute(
        v,
        r,
        s,
        this.buyer,
        [this.tokenId],
        this.l2.sandboxAccount,
        this.price
      );
    });
    it('now can withdraw to L1', async function () {
      await this.polygonAvatarAsBuyer.approve(
        this.l2.avatarTunnel.address,
        this.tokenId
      );
      const tx = await this.polygonAvatarTunnelAsBuyer.sendAvatarToL1(
        this.buyer,
        this.tokenId
      );
      const receipt = await tx.wait();
      this.receipt = receipt;
      this.messageLog = await getMessageLogFromTx(
        this.l2.avatarTunnel,
        receipt
      );
    });
    it('With the emission of the MessageSent event, the user will be able to call the tunnel on L1', async function () {
      // receipt proof
      const receipt = ethers.utils.RLP.encode([
        '0x42',
        '0x42',
        '0x42',
        this.receipt.logs.map((x: Log) => [x.address, x.topics, x.data]),
      ]); // Receipt memory receipt
      const receiptData = ['0x11', receipt];
      const receiptRoot = ethers.utils.keccak256(
        ethers.utils.RLP.encode(receiptData)
      ); // bytes32
      const receiptProof = [[receiptData]]; // bytes memory, parent nodes
      const branchMaskUint = '0x11'; // uint256, encodedPath
      const receiptLogIndex = ethers.utils.hexlify(this.messageLog.logIndex); // uint256

      // Block proof
      const blockNumber = '0x42';
      const blockTime = '0x42';
      const txRoot = ethers.utils.keccak256('0x42'); // bytes32
      const blockProof = ethers.utils.keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'uint256', 'bytes32', 'bytes32'],
          [blockNumber, blockTime, txRoot, receiptRoot]
        )
      );
      const headerRoot = ethers.utils.keccak256(
        defaultAbiCoder.encode(['bytes32', 'bytes32'], [blockProof, blockProof])
      );
      await this.l1.checkPointManager.setCheckpoint(
        headerRoot,
        blockNumber,
        1000,
        blockTime
      );
      // setCheckpoint increment the header by 1
      const headerNumber = '0x01'; // uint256

      const inputData = ethers.utils.RLP.encode([
        headerNumber,
        blockProof,
        blockNumber,
        blockTime,
        txRoot,
        receiptRoot,
        receipt,
        receiptProof,
        branchMaskUint,
        receiptLogIndex,
      ]);

      // This uses the MockAvatarTunnel
      await this.l1.avatarTunnel.receiveAvatarFromL2(inputData);
      expect(await this.l1.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.buyer
      );
      // locked in the tunnel
      expect(await this.l2.avatar.ownerOf(this.tokenId)).to.be.equal(
        this.l2.avatarTunnel.address
      );
    });
  });
});
