import {expect} from 'chai';
import {formatBytes32String} from 'ethers/lib/utils';
import {runRevealTestSetup} from './fixtures/assetRevealFixtures';

const revealHashA = formatBytes32String('revealHashA');
const revealHashB = formatBytes32String('revealHashB');
const revealHashC = formatBytes32String('revealHashC');
const revealHashD = formatBytes32String('revealHashD');
const revealHashE = formatBytes32String('revealHashE');
const revealHashF = formatBytes32String('revealHashF');

// TODO: missing AssetReveal DEFAULT_ADMIN, trustedForwarder tests, setTrustedForwarder
// we have AccessControlUpgradeable on AssetCreate, why not here?

describe('AssetReveal', function () {
  describe('General', function () {
    it('Should deploy correctly', async function () {
      const {AssetRevealContract} = await runRevealTestSetup();
      expect(AssetRevealContract.address).to.be.properAddress;
    });
    it('Should have the asset address set correctly', async function () {
      const {AssetRevealContract, AssetContract} = await runRevealTestSetup();
      const assetAddress = await AssetRevealContract.getAssetContract();
      expect(assetAddress).to.equal(AssetContract.address);
    });
    it('Should have the auth validator address set correctly', async function () {
      const {AssetRevealContract, AuthValidatorContract} =
        await runRevealTestSetup();
      const authValidatorAddress = await AssetRevealContract.getAuthValidator();
      expect(authValidatorAddress).to.equal(AuthValidatorContract.address);
    });
    it('Should have the forwarder address set correctly', async function () {
      const {AssetRevealContract, trustedForwarder} =
        await runRevealTestSetup();
      const forwarderAddress = await AssetRevealContract.getTrustedForwarder();
      expect(forwarderAddress).to.equal(trustedForwarder.address);
    });
  });

  describe('Burning', function () {
    it('User should have correct initial balance', async function () {
      const {AssetContract, user, unrevealedtokenId, revealedtokenId} =
        await runRevealTestSetup();
      const unRevealedBalance = await AssetContract.balanceOf(
        user.address,
        unrevealedtokenId
      );
      const revealedBalance = await AssetContract.balanceOf(
        user.address,
        revealedtokenId
      );
      expect(unRevealedBalance.toString()).to.equal('10');
      expect(revealedBalance.toString()).to.equal('10');
    });
    it('Should not be able to burn amount less than one', async function () {
      const {AssetRevealContractAsUser, unrevealedtokenId} =
        await runRevealTestSetup();
      await expect(
        AssetRevealContractAsUser.revealBurn(unrevealedtokenId, 0)
      ).to.be.revertedWith('Amount should be greater than 0');
    });
    it('Should not be able to burn an asset that is already revealed', async function () {
      const {AssetRevealContractAsUser, revealedtokenId} =
        await runRevealTestSetup();
      await expect(
        AssetRevealContractAsUser.revealBurn(revealedtokenId, 1)
      ).to.be.revertedWith('Asset is already revealed');
    });
    it('Should not be able to burn more than owned by the caller', async function () {
      const {
        user,
        AssetRevealContractAsUser,
        AssetContract,
        unrevealedtokenId,
      } = await runRevealTestSetup();
      const balance = await AssetContract.balanceOf(
        user.address,
        unrevealedtokenId
      );
      await expect(
        AssetRevealContractAsUser.revealBurn(unrevealedtokenId, balance + 1)
      ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
    });
    it("Should not be able to burn a token that doesn't exist", async function () {
      const {AssetRevealContractAsUser} = await runRevealTestSetup();
      await expect(
        AssetRevealContractAsUser.revealBurn(123, 1)
      ).to.be.revertedWith('ERC1155: burn amount exceeds totalSupply');
    });
    it('Should be able to burn unrevealed owned assets', async function () {
      const {
        AssetRevealContractAsUser,
        AssetContract,
        unrevealedtokenId,
        user,
      } = await runRevealTestSetup();
      const burnTx = await AssetRevealContractAsUser.revealBurn(
        unrevealedtokenId,
        1
      );
      await burnTx.wait();

      const userBalance = await AssetContract.balanceOf(
        user.address,
        unrevealedtokenId
      );
      expect(userBalance.toString()).to.equal('9');
    });
    it('Should emit burn event with correct data', async function () {
      const {AssetRevealContractAsUser, unrevealedtokenId, user} =
        await runRevealTestSetup();
      const burnTx = await AssetRevealContractAsUser.revealBurn(
        unrevealedtokenId,
        1
      );
      const burnResult = await burnTx.wait();
      const burnEvent = burnResult.events[1];
      expect(burnEvent.event).to.equal('AssetRevealBurn');
      // revealer
      expect(burnEvent.args[0]).to.equal(user.address);
      // token id that is being revealed
      expect(burnEvent.args[1]).to.equal(unrevealedtokenId);
      // tier
      expect(burnEvent.args[2].toString()).to.equal('5');
      // amount
      expect(burnEvent.args[3].toString()).to.equal('1');
    });
    it('Should be able to burn multiple unrevealed owned assets', async function () {
      const {
        AssetRevealContractAsUser,
        AssetContract,
        unrevealedtokenId,
        unrevealedtokenId2,
        user,
      } = await runRevealTestSetup();
      const amountToBurn1 = 2;
      const amountToBurn2 = 3;
      const tk1BalanceBeforeBurn = await AssetContract.balanceOf(
        user.address,
        unrevealedtokenId
      );

      const tk2BalanceBeforeBurn = await AssetContract.balanceOf(
        user.address,
        unrevealedtokenId2
      );

      const burnTx = await AssetRevealContractAsUser.revealBatchBurn(
        [unrevealedtokenId, unrevealedtokenId2],
        [amountToBurn1, amountToBurn2]
      );
      await burnTx.wait();

      const tk1BalanceAfterBurn = await AssetContract.balanceOf(
        user.address,
        unrevealedtokenId
      );

      // TODO: fix
      // expect(tk1BalanceBeforeBurn.sub(5)).to.equal(tk1BalanceAfterBurn);

      const tk2BalanceAfterBurn = await AssetContract.balanceOf(
        user.address,
        unrevealedtokenId2
      );

      expect(tk1BalanceBeforeBurn.sub(amountToBurn1)).to.equal(
        tk1BalanceAfterBurn
      );
      expect(tk2BalanceBeforeBurn.sub(amountToBurn2)).to.equal(
        tk2BalanceAfterBurn
      );
    });
  });
  describe('Minting', function () {
    it('Should allow minting with valid signature', async function () {
      const {
        user,
        unrevealedtokenId,
        generateRevealSignature,
        revealAsset,
        AssetContract,
      } = await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];

      const signature = await generateRevealSignature(
        user.address, // revealer
        unrevealedtokenId, // prevTokenId
        amounts,
        newMetadataHashes,
        [revealHashA]
      );
      const result = await revealAsset(
        signature,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );
      expect(result.events[2].event).to.equal('AssetRevealMint');
      const newTokenId = result.events[2].args.newTokenIds[0];
      const balance = await AssetContract.balanceOf(user.address, newTokenId);
      expect(balance.toString()).to.equal('1');
    });
    it('Should allow minting when multiple copies revealed to the same metadata hash', async function () {
      const {user, unrevealedtokenId, revealAsset, generateRevealSignature} =
        await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [2];
      const signature = await generateRevealSignature(
        user.address,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );
      const result = await revealAsset(
        signature,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );
      expect(result.events[2].event).to.equal('AssetRevealMint');
      expect(result.events[2].args['newTokenIds'].length).to.equal(1);
      // TODO: check supply with new metadataHash has incremented by 2
    });
    it('Should not allow minting for multiple copies revealed to the same metadata hash if revealHash is used', async function () {
      const {user, unrevealedtokenId, revealAsset, generateRevealSignature} =
        await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [2];
      const signature = await generateRevealSignature(
        user.address,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );
      await revealAsset(
        signature,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );

      const signature2 = await generateRevealSignature(
        user.address,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );
      await expect(
        revealAsset(signature2, unrevealedtokenId, amounts, newMetadataHashes, [
          revealHashA,
        ])
      ).to.be.revertedWith('Invalid revealHash');
    });
    it('should increase the tokens supply for tokens with same metadata hash', async function () {
      const {
        user,
        unrevealedtokenId,
        generateRevealSignature,
        revealAsset,
        AssetContract,
      } = await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];
      const signature = await generateRevealSignature(
        user.address,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );
      const result = await revealAsset(
        signature,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );
      const newTokenId = result.events[2].args.newTokenIds[0];
      const balance = await AssetContract.balanceOf(user.address, newTokenId);
      expect(balance.toString()).to.equal('1');
      const signature2 = await generateRevealSignature(
        user.address,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashB]
      );
      await revealAsset(
        signature2,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashB]
      );
      const balance2 = await AssetContract.balanceOf(user.address, newTokenId);
      expect(balance2.toString()).to.equal('2');
    });
    it('Should allow batch reveal minting with valid signatures', async function () {
      const {
        user,
        revealAssetBatch,
        generateBatchRevealSignature,
        unrevealedtokenId,
        unrevealedtokenId2,
      } = await runRevealTestSetup();
      const newMetadataHashes1 = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const newMetadataHashes2 = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJZ',
      ];
      const amounts1 = [1];
      const amounts2 = [1];

      const signature = await generateBatchRevealSignature(
        user.address,
        [unrevealedtokenId, unrevealedtokenId2],
        [amounts1, amounts2],
        [newMetadataHashes1, newMetadataHashes2],
        [[revealHashA], [revealHashB]]
      );

      const result = await revealAssetBatch(
        signature,
        [unrevealedtokenId, unrevealedtokenId2],
        [amounts1, amounts2],
        [newMetadataHashes1, newMetadataHashes2],
        [[revealHashA], [revealHashB]]
      );

      // expect two events with name AssetsRevealed
      expect(result.events[2].event).to.equal('AssetRevealMint');
      expect(result.events[5].event).to.equal('AssetRevealMint');
    });
    it('Should allow revealing multiple copies at the same time', async function () {
      const {user, generateRevealSignature, revealAsset, unrevealedtokenId} =
        await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ1',
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ2',
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ3',
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ4',
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ5',
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJ6',
      ];
      const amountToMint = [1, 2, 1, 7, 1, 2];
      const signature = await generateRevealSignature(
        user.address,
        unrevealedtokenId,
        amountToMint,
        newMetadataHashes,
        [
          revealHashA,
          revealHashB,
          revealHashC,
          revealHashD,
          revealHashE,
          revealHashF,
        ]
      );

      const result = await revealAsset(
        signature,
        unrevealedtokenId,
        amountToMint,
        newMetadataHashes,
        [
          revealHashA,
          revealHashB,
          revealHashC,
          revealHashD,
          revealHashE,
          revealHashF,
        ]
      );
      expect(result.events[7].event).to.equal('AssetRevealMint');
      expect(result.events[7].args['newTokenIds'].length).to.equal(6);
    });
    it('Should allow instant reveal when authorized by the backend', async function () {
      const {
        user,
        generateBurnAndRevealSignature,
        instantReveal,
        unrevealedtokenId,
      } = await runRevealTestSetup();
      const newMetadataHash = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];

      const signature = await generateBurnAndRevealSignature(
        user.address,
        unrevealedtokenId,
        amounts,
        newMetadataHash,
        [revealHashA]
      );

      const result = await instantReveal(
        signature,
        unrevealedtokenId,
        amounts[0],
        amounts,
        newMetadataHash,
        [revealHashA]
      );
      expect(result.events[4].event).to.equal('AssetRevealMint');
    });
    it('Should not allow minting with invalid signature', async function () {
      const {revealAsset, unrevealedtokenId} = await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];
      await expect(
        revealAsset(
          '0x1556a70d76cc452ae54e83bb167a9041f0d062d000fa0dcb42593f77c544f6471643d14dbd6a6edc658f4b16699a585181a08dba4f6d16a9273e0e2cbed622da1b',
          // TODO: write down how is this a bad sig here so it's clear
          unrevealedtokenId,
          amounts,
          newMetadataHashes,
          [revealHashA]
        )
      ).to.be.revertedWith('Invalid revealMint signature');
    });
    it('Should not allow minting with invalid prevTokenId', async function () {
      const {
        user,
        generateRevealSignature,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];
      const signature = await generateRevealSignature(
        user.address,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          123, // invalid
          amounts,
          newMetadataHashes,
          [revealHashA]
        )
      ).to.be.revertedWith('Invalid revealMint signature');
    });
    it('Should not allow minting with invalid amount', async function () {
      const {
        user,
        generateRevealSignature,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];
      const signature = await generateRevealSignature(
        user.address,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          unrevealedtokenId,
          [123], // invalid
          newMetadataHashes,
          [revealHashA]
        )
      ).to.be.revertedWith('Invalid revealMint signature');
    });
    it('Should not allow minting with invalid metadataHashes', async function () {
      const {
        user,
        generateRevealSignature,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];
      const signature = await generateRevealSignature(
        user.address,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          unrevealedtokenId,
          amounts,
          ['QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJE'], // invalid
          [revealHashA]
        )
      ).to.be.revertedWith('Invalid revealMint signature');
    });
    it('Should not allow using the same signature twice', async function () {
      const {
        user,
        generateRevealSignature,
        revealAsset,
        unrevealedtokenId,
        AssetRevealContract,
      } = await runRevealTestSetup();
      const newMetadataHashes = [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJF',
      ];
      const amounts = [1];
      const signature = await generateRevealSignature(
        user.address,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );

      await revealAsset(
        signature,
        unrevealedtokenId,
        amounts,
        newMetadataHashes,
        [revealHashA]
      );

      await expect(
        AssetRevealContract.revealMint(
          signature,
          unrevealedtokenId,
          amounts,
          newMetadataHashes,
          [revealHashA]
        )
      ).to.be.revertedWith('Invalid revealMint signature'); // TODO: check this is correct and not 'Invalid revealHash'
    });
  });
});
