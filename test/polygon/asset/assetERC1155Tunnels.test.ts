import {setupAssetERC1155Tunnels} from './fixtures_tunnels';

import {waitFor} from '../../utils';
import {expect} from '../../chai-setup';
import {AbiCoder} from 'ethers/lib/utils';
import {ethers} from 'hardhat';

describe('PolygonAsset.sol', function () {
  describe('Asset <> PolygonAssetERC1155: Transfer', function () {
    it('can transfer L2 minted asset: L2 to L1', async function () {
      const {
        AssetERC1155,
        PolygonAssetERC1155,
        MockPolygonAssetERC1155Tunnel,
        users,
        deployer,
        mintAssetOnL2,
      } = await setupAssetERC1155Tunnels();
      const tokenId = await mintAssetOnL2(users[0].address, 10);

      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(10);

      // Transfer to L1 Tunnel
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockPolygonAssetERC1155Tunnel.address, true);

      const testMetadataHashArray = [];
      testMetadataHashArray.push(
        ethers.utils.formatBytes32String('metadataHash')
      );
      const MOCK_DATA = new AbiCoder().encode(
        ['bytes32[]'],
        [testMetadataHashArray]
      );
      console.log(ethers.utils.formatBytes32String('metadataHash'));

      await waitFor(
        MockPolygonAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchWithdrawToRoot(users[0].address, [tokenId], [10])
      );

      await deployer.MockAssetERC1155Tunnel.receiveMessage(
        new AbiCoder().encode(
          ['address', 'uint256[]', 'uint256[]', 'bytes'],
          [users[0].address, [tokenId], [10], MOCK_DATA]
        )
      );

      balance = await AssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(10);
    });

    it('can transfer L2 minted asset of value 1: L2 to L1', async function () {
      const {
        AssetERC1155,
        PolygonAssetERC1155,
        MockPolygonAssetERC1155Tunnel,
        users,
        deployer,
        mintAssetOnL2,
      } = await setupAssetERC1155Tunnels();
      const tokenId = await mintAssetOnL2(users[0].address, 1);

      let balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(1);

      // Transfer to L1 Tunnel
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockPolygonAssetERC1155Tunnel.address, true);

      const testMetadataHashArray = [];
      testMetadataHashArray.push(
        ethers.utils.formatBytes32String('metadataHash')
      );
      const MOCK_DATA = new AbiCoder().encode(
        ['bytes32[]'],
        [testMetadataHashArray]
      );

      await waitFor(
        MockPolygonAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchWithdrawToRoot(users[0].address, [tokenId], [1])
      );

      await deployer.MockAssetERC1155Tunnel.receiveMessage(
        new AbiCoder().encode(
          ['address', 'uint256[]', 'uint256[]', 'bytes'],
          [users[0].address, [tokenId], [1], MOCK_DATA]
        )
      );

      balance = await AssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(1);
    });

    it('cannot transfer more than L2 minted assets: L2 to L1', async function () {
      const {
        PolygonAssetERC1155,
        MockPolygonAssetERC1155Tunnel,
        users,
        mintAssetOnL2,
      } = await setupAssetERC1155Tunnels();
      const tokenId = await mintAssetOnL2(users[0].address, 1);

      const balance = await PolygonAssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );
      expect(balance).to.be.equal(1);

      // Transfer to L1 Tunnel
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockPolygonAssetERC1155Tunnel.address, true);

      await expect(
        MockPolygonAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchWithdrawToRoot(users[0].address, [tokenId], [2])
      ).to.be.revertedWith(`can't substract more than there is`);
    });

    it('can batch transfer L2 minted asset: L2 to L1', async function () {
      const {
        AssetERC1155,
        PolygonAssetERC1155,
        MockPolygonAssetERC1155Tunnel,
        users,
        deployer,
        mintAssetOnL2,
      } = await setupAssetERC1155Tunnels();

      const tokenIds = [];
      const testMetadataHashArray = [];
      for (let i = 0; i < 4; i++) {
        const id = await mintAssetOnL2(users[0].address, 10);
        tokenIds.push(id);
        testMetadataHashArray.push(
          ethers.utils.formatBytes32String('metadataHash')
        );
      }

      const MOCK_DATA = new AbiCoder().encode(
        ['bytes32[]'],
        [testMetadataHashArray]
      );

      // Transfer to L1 Tunnel
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockPolygonAssetERC1155Tunnel.address, true);

      await waitFor(
        MockPolygonAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchWithdrawToRoot(users[0].address, tokenIds, [10, 10, 10, 10])
      );

      const abiCoder = new AbiCoder();

      await deployer.MockAssetERC1155Tunnel.receiveMessage(
        abiCoder.encode(
          ['address', 'uint256[]', 'uint256[]', 'bytes'],
          [users[0].address, tokenIds, [10, 10, 10, 10], MOCK_DATA]
        )
      );

      const balance = await AssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenIds[0]
      );
      expect(balance).to.be.equal(10);
    });

    // TODO: more balances with different supplies
    // TODO: cannot bridge more than supply
    // TODO:: metadata hash is retained L2 to L1

    it('transfer assets from L1 to L2', async function () {
      const {
        AssetERC1155,
        PolygonAssetERC1155,
        MockPolygonAssetERC1155Tunnel,
        MockAssetERC1155Tunnel,
        users,
        mintAssetOnL1,
      } = await setupAssetERC1155Tunnels();

      const supplies = [20, 5, 10, 25];

      // Note: tokenIds cannot be 0, 1, 2, 3... as will revert with 'ID_TAKEN'
      // IDs on L1 must follow the precise format as generated on L2
      const tokenIds = [
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000000800800',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd800000008000000001000000',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000001800800',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd800000008000000002000000',
      ];

      const testMetadataHashArray = [];
      for (let i = 0; i < 4; i++) {
        testMetadataHashArray.push(
          ethers.utils.formatBytes32String('metadataHash')
        );
        await mintAssetOnL1(users[0].address, tokenIds[i], supplies[i]);
      }

      // Transfer to L1 Tunnel
      await AssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockAssetERC1155Tunnel.address, true);

      await waitFor(
        MockAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchDepositToChild(users[0].address, tokenIds, supplies)
      );

      const balanceUserL1 = await AssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenIds[0]
      );
      expect(balanceUserL1).to.be.equal(0);
      const balanceL1Tunnel = await AssetERC1155['balanceOf(address,uint256)'](
        MockAssetERC1155Tunnel.address,
        tokenIds[0]
      );
      expect(balanceL1Tunnel).to.be.equal(supplies[0]);

      const balanceUserL2 = await PolygonAssetERC1155[
        'balanceOf(address,uint256)'
      ](users[0].address, tokenIds[0]);
      expect(balanceUserL2).to.be.equal(supplies[0]);
      const balanceL2Tunnel = await PolygonAssetERC1155[
        'balanceOf(address,uint256)'
      ](MockPolygonAssetERC1155Tunnel.address, tokenIds[0]);
      expect(balanceL2Tunnel).to.be.equal(0);
    });

    it('can transfer partial supplies of L1 minted assets: L1 to L2', async function () {
      const {
        AssetERC1155,
        PolygonAssetERC1155,
        MockAssetERC1155Tunnel,
        users,
        mintAssetOnL1,
      } = await setupAssetERC1155Tunnels();

      const supplies = [20, 5, 10, 25];

      // Note: tokenIds cannot be 0, 1, 2, 3... as will revert with 'ID_TAKEN'
      // IDs on L1 must follow the precise format as generated on L2
      const tokenIds = [
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000000800800',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd800000008000000001000000',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000001800800',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd800000008000000002000000',
      ];

      // const testMetadataHash = ethers.utils.formatBytes32String('metadataHash');
      // const MOCK_DATA = new AbiCoder().encode(['bytes32'], [testMetadataHash]);
      const owners = [
        users[0].address,
        users[0].address,
        users[0].address,
        users[0].address,
      ];

      for (let i = 0; i < 4; i++) {
        await mintAssetOnL1(users[0].address, tokenIds[i], supplies[i]);
        // const mainnetURI = await AssetERC1155['tokenURI(uint256)'](tokenIds[i]);
        // expect(mainnetURI).to.be.equal('');
      }
      await AssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockAssetERC1155Tunnel.address, true);

      const supplyBreakdown01 = [10, 2, 5, 13];
      const supplyBreakdown02 = [10, 3, 5, 12];

      await waitFor(
        MockAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchDepositToChild(users[0].address, tokenIds, supplyBreakdown01)
      );

      const balanceUserL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIds);

      for (let i = 0; i < balanceUserL1.length; i++) {
        expect(balanceUserL1[i]).to.be.equal(supplyBreakdown02[i]);
      }
      const tunnelAddreses = [
        MockAssetERC1155Tunnel.address,
        MockAssetERC1155Tunnel.address,
        MockAssetERC1155Tunnel.address,
        MockAssetERC1155Tunnel.address,
      ];
      const balanceTunnelL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](tunnelAddreses, tokenIds);

      for (let i = 0; i < balanceTunnelL1.length; i++) {
        expect(balanceTunnelL1[i]).to.be.equal(supplyBreakdown01[i]);
      }

      const balanceUserL2 = await PolygonAssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIds);

      for (let i = 0; i < balanceUserL2.length; i++) {
        expect(balanceUserL2[i]).to.be.equal(supplyBreakdown01[i]);
      }

      await waitFor(
        MockAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchDepositToChild(users[0].address, tokenIds, supplyBreakdown02)
      );

      const newbalanceUserL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIds);

      for (let i = 0; i < newbalanceUserL1.length; i++) {
        expect(newbalanceUserL1[i]).to.be.equal(0);
      }

      const newbalanceTunnelL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](tunnelAddreses, tokenIds);

      for (let i = 0; i < newbalanceTunnelL1.length; i++) {
        expect(newbalanceTunnelL1[i]).to.be.equal(supplies[i]);
      }

      const newbalanceUserL2 = await PolygonAssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIds);

      for (let i = 0; i < newbalanceUserL2.length; i++) {
        expect(newbalanceUserL2[i]).to.be.equal(supplies[i]);
      }

      for (let i = 0; i < tokenIds.length; i++) {
        const mainnetURI = await AssetERC1155['tokenURI(uint256)'](tokenIds[i]);
        const polygonURI = await PolygonAssetERC1155['tokenURI(uint256)'](
          tokenIds[i]
        );
        expect(mainnetURI).to.be.equal(polygonURI); // TODO: how to read messages... use receive?
      }
    });
    it('can transfer multiple L2 minted assets: L2 to L1', async function () {
      const {
        AssetERC1155,
        PolygonAssetERC1155,
        MockPolygonAssetERC1155Tunnel,
        users,
        deployer,
        mintAssetOnL2,
      } = await setupAssetERC1155Tunnels();

      const abiCoder = new AbiCoder();
      const supplies = [20, 5, 10, 25];
      const ipfsHashString = ethers.utils.formatBytes32String('metadataHash');
      const owners = [
        users[0].address,
        users[0].address,
        users[0].address,
        users[0].address,
      ];

      const testMetadataHashArray = [
        ipfsHashString,
        ipfsHashString,
        ipfsHashString,
        ipfsHashString,
      ];
      const MOCK_DATA = abiCoder.encode(['bytes32[]'], [testMetadataHashArray]);

      const tokenIds = [];
      for (let i = 0; i < 4; i++) {
        tokenIds.push(await mintAssetOnL2(users[0].address, supplies[i]));
      }
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockPolygonAssetERC1155Tunnel.address, true);

      const balanceUserL2 = await PolygonAssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIds);

      for (let i = 0; i < balanceUserL2.length; i++) {
        expect(balanceUserL2[i]).to.be.equal(supplies[i]);
      }

      await waitFor(
        MockPolygonAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchWithdrawToRoot(users[0].address, tokenIds, supplies)
      );
      const newbalanceUserL2 = await PolygonAssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIds);

      for (let i = 0; i < newbalanceUserL2.length; i++) {
        expect(newbalanceUserL2[i]).to.be.equal(0);
      }
      const tunnelAddreses = [
        MockPolygonAssetERC1155Tunnel.address,
        MockPolygonAssetERC1155Tunnel.address,
        MockPolygonAssetERC1155Tunnel.address,
        MockPolygonAssetERC1155Tunnel.address,
      ];

      const balanceTunnelL2 = await PolygonAssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](tunnelAddreses, tokenIds);

      for (let i = 0; i < balanceTunnelL2.length; i++) {
        expect(balanceTunnelL2[i]).to.be.equal(supplies[i]);
      }

      await deployer.MockAssetERC1155Tunnel.receiveMessage(
        abiCoder.encode(
          ['address', 'uint256[]', 'uint256[]', 'bytes'],
          [users[0].address, tokenIds, supplies, MOCK_DATA]
        )
      );

      const balanceUserL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIds);

      for (let i = 0; i < balanceUserL1.length; i++) {
        expect(balanceUserL1[i]).to.be.equal(supplies[i]);
      }

      for (let i = 0; i < tokenIds.length; i++) {
        const mainnetURI = await AssetERC1155['tokenURI(uint256)'](tokenIds[i]);
        const polygonURI = await PolygonAssetERC1155['tokenURI(uint256)'](
          tokenIds[i]
        );
        expect(mainnetURI).to.be.equal(polygonURI);
      }
    });
    it('can transfer partial supplies of L2 minted assets: L2 to L1', async function () {
      const {
        AssetERC1155,
        PolygonAssetERC1155,
        MockPolygonAssetERC1155Tunnel,
        users,
        deployer,
        mintAssetOnL2,
      } = await setupAssetERC1155Tunnels();

      const abiCoder = new AbiCoder();
      const supplies = [20, 5, 10, 25];
      const supplyBreakdown01 = [10, 2, 5, 13];
      const supplyBreakdown02 = [10, 3, 5, 12];
      const ipfsHashString = ethers.utils.formatBytes32String('metadataHash');
      const owners = [
        users[0].address,
        users[0].address,
        users[0].address,
        users[0].address,
      ];

      const testMetadataHashArray = [
        ipfsHashString,
        ipfsHashString,
        ipfsHashString,
        ipfsHashString,
      ];
      const MOCK_DATA = abiCoder.encode(['bytes32[]'], [testMetadataHashArray]);

      const tokenIds = [];
      for (let i = 0; i < 4; i++) {
        tokenIds.push(await mintAssetOnL2(users[0].address, supplies[i]));
      }
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockPolygonAssetERC1155Tunnel.address, true);

      await waitFor(
        MockPolygonAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchWithdrawToRoot(users[0].address, tokenIds, supplyBreakdown01)
      );

      const balanceUserL2 = await PolygonAssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIds);

      for (let i = 0; i < balanceUserL2.length; i++) {
        expect(balanceUserL2[i]).to.be.equal(supplyBreakdown02[i]);
      }
      const tunnelAddreses = [
        MockPolygonAssetERC1155Tunnel.address,
        MockPolygonAssetERC1155Tunnel.address,
        MockPolygonAssetERC1155Tunnel.address,
        MockPolygonAssetERC1155Tunnel.address,
      ];

      const balanceTunnelL2 = await PolygonAssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](tunnelAddreses, tokenIds);

      for (let i = 0; i < balanceTunnelL2.length; i++) {
        expect(balanceTunnelL2[i]).to.be.equal(supplyBreakdown01[i]);
      }

      await deployer.MockAssetERC1155Tunnel.receiveMessage(
        abiCoder.encode(
          ['address', 'uint256[]', 'uint256[]', 'bytes'],
          [users[0].address, tokenIds, supplyBreakdown01, MOCK_DATA]
        )
      );

      const balanceUserL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIds);

      for (let i = 0; i < balanceUserL1.length; i++) {
        expect(balanceUserL1[i]).to.be.equal(supplyBreakdown01[i]);
      }

      await waitFor(
        MockPolygonAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchWithdrawToRoot(users[0].address, tokenIds, supplyBreakdown02)
      );

      const newbalanceUserL2 = await PolygonAssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIds);

      for (let i = 0; i < newbalanceUserL2.length; i++) {
        expect(newbalanceUserL2[i]).to.be.equal(0);
      }

      const newbalanceTunnelL2 = await PolygonAssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](tunnelAddreses, tokenIds);

      for (let i = 0; i < newbalanceTunnelL2.length; i++) {
        expect(newbalanceTunnelL2[i]).to.be.equal(supplies[i]);
      }

      await deployer.MockAssetERC1155Tunnel.receiveMessage(
        abiCoder.encode(
          ['address', 'uint256[]', 'uint256[]', 'bytes'],
          [users[0].address, tokenIds, supplyBreakdown02, MOCK_DATA]
        )
      );

      const newbalanceUserL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIds);

      for (let i = 0; i < newbalanceUserL1.length; i++) {
        expect(newbalanceUserL1[i]).to.be.equal(supplies[i]);
      }

      for (let i = 0; i < tokenIds.length; i++) {
        const mainnetURI = await AssetERC1155['tokenURI(uint256)'](tokenIds[i]);
        const polygonURI = await PolygonAssetERC1155['tokenURI(uint256)'](
          tokenIds[i]
        );
        expect(mainnetURI).to.be.equal(polygonURI);
      }
    });
    it('can transfer assets from multiple L1 minted batches: L1 to L2', async function () {
      const {
        AssetERC1155,
        PolygonAssetERC1155,
        MockAssetERC1155Tunnel,
        users,
        mintAssetOnL1,
      } = await setupAssetERC1155Tunnels();

      const suppliesBatch1 = [20, 5];
      const suppliesBatch2 = [10, 25];
      const owners = [users[0].address, users[0].address];

      // Note: tokenIds cannot be 0, 1, 2, 3... as will revert with 'ID_TAKEN'
      // IDs on L1 must follow the precise format as generated on L2
      const tokenIdsBatch1 = [
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000000800800',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd800000008000000001000000',
      ];
      const tokenIdsBatch2 = [
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000001800800',
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd800000008000000002000000',
      ];

      for (let i = 0; i < 2; i++) {
        await mintAssetOnL1(
          users[0].address,
          tokenIdsBatch1[i],
          suppliesBatch1[i]
        );
      }

      await AssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockAssetERC1155Tunnel.address, true);

      await waitFor(
        MockAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchDepositToChild(users[0].address, tokenIdsBatch1, suppliesBatch1)
      );

      const balanceUserL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIdsBatch1);

      for (let i = 0; i < balanceUserL1.length; i++) {
        expect(balanceUserL1[i]).to.be.equal(0);
      }
      const tunnelAddreses = [
        MockAssetERC1155Tunnel.address,
        MockAssetERC1155Tunnel.address,
      ];
      const balanceTunnelL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](tunnelAddreses, tokenIdsBatch1);

      for (let i = 0; i < balanceTunnelL1.length; i++) {
        expect(balanceTunnelL1[i]).to.be.equal(suppliesBatch1[i]);
      }

      const balanceUserL2 = await PolygonAssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIdsBatch1);

      for (let i = 0; i < balanceUserL2.length; i++) {
        expect(balanceUserL2[i]).to.be.equal(suppliesBatch1[i]);
      }
      for (let i = 0; i < tokenIdsBatch1.length; i++) {
        const mainnetURI = await AssetERC1155['tokenURI(uint256)'](
          tokenIdsBatch1[i]
        );
        const polygonURI = await PolygonAssetERC1155['tokenURI(uint256)'](
          tokenIdsBatch1[i]
        );
        expect(mainnetURI).to.be.equal(polygonURI);
      }
      for (let i = 0; i < 2; i++) {
        await mintAssetOnL1(
          users[0].address,
          tokenIdsBatch2[i],
          suppliesBatch2[i]
        );
      }

      await waitFor(
        MockAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchDepositToChild(users[0].address, tokenIdsBatch2, suppliesBatch2)
      );

      const newbalanceUserL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIdsBatch2);

      for (let i = 0; i < newbalanceUserL1.length; i++) {
        expect(newbalanceUserL1[i]).to.be.equal(0);
      }

      const newbalanceTunnelL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](tunnelAddreses, tokenIdsBatch2);

      for (let i = 0; i < newbalanceTunnelL1.length; i++) {
        expect(newbalanceTunnelL1[i]).to.be.equal(suppliesBatch2[i]);
      }

      const newbalanceUserL2 = await PolygonAssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIdsBatch2);

      for (let i = 0; i < newbalanceUserL2.length; i++) {
        expect(newbalanceUserL2[i]).to.be.equal(suppliesBatch2[i]);
      }
      for (let i = 0; i < tokenIdsBatch2.length; i++) {
        const mainnetURI = await AssetERC1155['tokenURI(uint256)'](
          tokenIdsBatch2[i]
        );
        const polygonURI = await PolygonAssetERC1155['tokenURI(uint256)'](
          tokenIdsBatch2[i]
        );
        expect(mainnetURI).to.be.equal(polygonURI);
      }
    });
    it('can transfer assets from multiple L2 minted batches: L2 to L1', async function () {
      const {
        AssetERC1155,
        PolygonAssetERC1155,
        MockPolygonAssetERC1155Tunnel,
        users,
        deployer,
        mintAssetOnL2,
      } = await setupAssetERC1155Tunnels();

      const suppliesBatch1 = [20, 5];
      const suppliesBatch2 = [10, 25];
      const owners = [users[0].address, users[0].address];

      const abiCoder = new AbiCoder();

      const tokenIdsBatch1 = [];
      for (let i = 0; i < 2; i++) {
        tokenIdsBatch1.push(
          await mintAssetOnL2(users[0].address, suppliesBatch1[i])
        );
      }
      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockPolygonAssetERC1155Tunnel.address, true);
      const ipfsHashString = ethers.utils.formatBytes32String('metadataHash');

      const testMetadataHashArray = [ipfsHashString, ipfsHashString];
      const MOCK_DATA = abiCoder.encode(['bytes32[]'], [testMetadataHashArray]);
      await waitFor(
        MockPolygonAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchWithdrawToRoot(users[0].address, tokenIdsBatch1, suppliesBatch1)
      );

      await deployer.MockAssetERC1155Tunnel.receiveMessage(
        abiCoder.encode(
          ['address', 'uint256[]', 'uint256[]', 'bytes'],
          [users[0].address, tokenIdsBatch1, suppliesBatch1, MOCK_DATA]
        )
      );
      const balanceUserL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIdsBatch1);

      for (let i = 0; i < balanceUserL1.length; i++) {
        expect(balanceUserL1[i]).to.be.equal(suppliesBatch1[i]);
      }

      for (let i = 0; i < tokenIdsBatch1.length; i++) {
        const mainnetURI = await AssetERC1155['tokenURI(uint256)'](
          tokenIdsBatch1[i]
        );
        const polygonURI = await PolygonAssetERC1155['tokenURI(uint256)'](
          tokenIdsBatch1[i]
        );
        expect(mainnetURI).to.be.equal(polygonURI);
      }

      const tokenIdsBatch2 = [];
      for (let i = 0; i < 2; i++) {
        tokenIdsBatch2.push(
          await mintAssetOnL2(users[0].address, suppliesBatch2[i])
        );
      }
      await waitFor(
        MockPolygonAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchWithdrawToRoot(users[0].address, tokenIdsBatch2, suppliesBatch2)
      );
      await deployer.MockAssetERC1155Tunnel.receiveMessage(
        abiCoder.encode(
          ['address', 'uint256[]', 'uint256[]', 'bytes'],
          [users[0].address, tokenIdsBatch2, suppliesBatch2, MOCK_DATA]
        )
      );

      const newbalanceUserL1 = await AssetERC1155[
        'balanceOfBatch(address[],uint256[])'
      ](owners, tokenIdsBatch2);

      for (let i = 0; i < newbalanceUserL1.length; i++) {
        expect(newbalanceUserL1[i]).to.be.equal(suppliesBatch2[i]);
      }

      for (let i = 0; i < tokenIdsBatch2.length; i++) {
        const mainnetURI = await AssetERC1155['tokenURI(uint256)'](
          tokenIdsBatch2[i]
        );
        const polygonURI = await PolygonAssetERC1155['tokenURI(uint256)'](
          tokenIdsBatch2[i]
        );
        expect(mainnetURI).to.be.equal(polygonURI);
      }
    });
    it('can return L1 minted assets: L1 to L2 to L1', async function () {
      const {
        AssetERC1155,
        PolygonAssetERC1155,
        MockAssetERC1155Tunnel,
        MockPolygonAssetERC1155Tunnel,
        users,
        deployer,
        mintAssetOnL1,
      } = await setupAssetERC1155Tunnels();

      const abiCoder = new AbiCoder();

      const tokenId =
        '0x2de2299db048a9e3b8d1934b8dae11b8041cc4fd000000008000000000800800';

      await mintAssetOnL1(users[0].address, tokenId, 5);
      const balanceUserL1 = await AssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );

      expect(balanceUserL1).to.be.equal(5);

      await AssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockAssetERC1155Tunnel.address, true);

      const testMetadataHash = ethers.utils.formatBytes32String('metadataHash');

      await waitFor(
        MockAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchDepositToChild(users[0].address, [tokenId], [5])
      );

      const balancetunnelL1 = await AssetERC1155['balanceOf(address,uint256)'](
        MockAssetERC1155Tunnel.address,
        tokenId
      );

      expect(balancetunnelL1).to.be.equal(5);

      const balanceUserL2 = await PolygonAssetERC1155[
        'balanceOf(address,uint256)'
      ](users[0].address, tokenId);

      expect(balanceUserL2).to.be.equal(5);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockPolygonAssetERC1155Tunnel.address, true);

      const newMockData = new AbiCoder().encode(
        ['bytes32[]'],
        [[testMetadataHash]]
      );

      await waitFor(
        MockPolygonAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchWithdrawToRoot(users[0].address, [tokenId], [5])
      );

      await deployer.MockAssetERC1155Tunnel.receiveMessage(
        abiCoder.encode(
          ['address', 'uint256[]', 'uint256[]', 'bytes'],
          [users[0].address, [tokenId], [5], newMockData]
        )
      );

      const newbalanceUserL1 = await AssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );

      expect(newbalanceUserL1).to.be.equal(5);
    });
    it('can return L2 minted assets: L2 to L1 to L2', async function () {
      const {
        AssetERC1155,
        PolygonAssetERC1155,
        MockAssetERC1155Tunnel,
        MockPolygonAssetERC1155Tunnel,
        users,
        deployer,
        mintAssetOnL2,
      } = await setupAssetERC1155Tunnels();
      const abiCoder = new AbiCoder();
      const tokenId = await mintAssetOnL2(users[0].address, 5);

      const ipfsHashString = ethers.utils.formatBytes32String('metadataHash');

      const testMetadataHashArray = [ipfsHashString];
      const MOCK_DATA = abiCoder.encode(['bytes32[]'], [testMetadataHashArray]);

      await PolygonAssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockPolygonAssetERC1155Tunnel.address, true);

      await waitFor(
        MockPolygonAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchWithdrawToRoot(users[0].address, [tokenId], [5])
      );

      await deployer.MockAssetERC1155Tunnel.receiveMessage(
        abiCoder.encode(
          ['address', 'uint256[]', 'uint256[]', 'bytes'],
          [users[0].address, [tokenId], [5], MOCK_DATA]
        )
      );

      const balanceUserL1 = await AssetERC1155['balanceOf(address,uint256)'](
        users[0].address,
        tokenId
      );

      expect(balanceUserL1).to.be.equal(5);

      await AssetERC1155.connect(
        ethers.provider.getSigner(users[0].address)
      ).setApprovalForAll(MockAssetERC1155Tunnel.address, true);

      await waitFor(
        MockAssetERC1155Tunnel.connect(
          ethers.provider.getSigner(users[0].address)
        ).batchDepositToChild(users[0].address, [tokenId], [5])
      );

      const balanceUserL2 = await PolygonAssetERC1155[
        'balanceOf(address,uint256)'
      ](users[0].address, tokenId);

      expect(balanceUserL2).to.be.equal(5);
    });

    //   describe('Transfer Gems and catalyst L1 to L2', function () {
    //     async function executeL1toL2Deposit(
    //       gemsAndCatalystsdata: (number | number[] | void)[]
    //     ) {
    //       const {mainnet, polygon} = await setupMainnetAndPolygonAsset();

    //       const tokenId = await mainnet.mintAsset(mainnet.users[0].address, 20);

    //       const balance = await mainnet.Asset['balanceOf(address,uint256)'](
    //         mainnet.users[0].address,
    //         tokenId
    //       );

    //       // Approve ERC1155 predicate contarct
    //       await waitFor(
    //         mainnet.users[0].Asset.setApprovalForAll(
    //           mainnet.predicate.address,
    //           true
    //         )
    //       );

    //       // Generate data to be passed to Polygon
    //       const ipfsHashes = [ethers.utils.formatBytes32String('metadataHash')];

    //       gemsAndCatalystsdata[0] = tokenId;

    //       const tokenData = abiCoder.encode(
    //         ['bytes32[]', '(uint256, uint16, uint16[])[]'],
    //         [ipfsHashes, [gemsAndCatalystsdata]]
    //       );

    //       const data = abiCoder.encode(
    //         ['uint256[]', 'uint256[]', 'bytes'],
    //         [[tokenId], [balance], tokenData]
    //       );

    //       // Lock tokens on ERC1155 predicate contract
    //       await waitFor(
    //         mainnet.predicate.lockTokens(
    //           mainnet.users[0].address,
    //           [tokenId],
    //           [20],
    //           data
    //         )
    //       );

    //       // Emulate the ChildChainManager call to deposit
    //       await waitFor(
    //         polygon.childChainManager.callDeposit(mainnet.users[0].address, data)
    //       );

    //       // Ensure balance has been updated on Asset & PolygonAsset
    //       const mainnetBalance = await mainnet.Asset[
    //         'balanceOf(address,uint256)'
    //       ](mainnet.users[0].address, tokenId);
    //       const polygonBalance = await polygon.Asset[
    //         'balanceOf(address,uint256)'
    //       ](mainnet.users[0].address, tokenId);
    //       expect(polygonBalance).to.be.equal(balance);
    //       expect(mainnetBalance).to.be.equal(0);

    //       // Ensure URI is same
    //       const mainnetURI = await mainnet.Asset['tokenURI(uint256)'](tokenId);
    //       const polygonURI = await polygon.Asset['tokenURI(uint256)'](tokenId);
    //       expect(mainnetURI).to.be.equal(polygonURI);
    //     }

    //     it('Deposit asset from L1 to L2 with 1 catalyst legendary and 4 power gems', async function () {
    //       const {polygonAssetRegistry} = await setupMainnetAndPolygonAsset();

    //       const catalystData = [
    //         0,
    //         4,
    //         [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //       ];
    //       await executeL1toL2Deposit(catalystData);
    //       const internalRecordRegistry = await polygonAssetRegistry.getRecord(
    //         catalystData[0]
    //       );

    //       expect(internalRecordRegistry).to.eql([
    //         true,
    //         4,
    //         [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //       ]);
    //     });

    //     it('Deposit asset from L1 to L2 with 1 catalyst legendary', async function () {
    //       const {polygonAssetRegistry} = await setupMainnetAndPolygonAsset();

    //       const catalystData = [0, 4, []];
    //       await executeL1toL2Deposit(catalystData);
    //       const internalRecordRegistry = await polygonAssetRegistry.getRecord(
    //         catalystData[0]
    //       );

    //       expect(internalRecordRegistry).to.eql([
    //         true,
    //         4,
    //         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //       ]);
    //     });

    //     it('Deposit asset from L1 to L2 with 1 catalyst legendary 1 gem defense', async function () {
    //       const {polygonAssetRegistry} = await setupMainnetAndPolygonAsset();

    //       const catalystData = [0, 4, [2]];
    //       await executeL1toL2Deposit(catalystData);
    //       const internalRecordRegistry = await polygonAssetRegistry.getRecord(
    //         catalystData[0]
    //       );

    //       expect(internalRecordRegistry).to.eql([
    //         true,
    //         4,
    //         [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //       ]);
    //     });

    //     it('Deposit asset from L1 to L2 with catalyst or gems out of bound ', async function () {
    //       await setupMainnetAndPolygonAsset();
    //       const catalystData: (number | number[] | void)[] = [0, 99, []];
    //       await expect(executeL1toL2Deposit(catalystData)).to.be.revertedWith(
    //         'CATALYST_DOES_NOT_EXIST'
    //       );
    //     });
    //     it('Deposit asset from L1 to L2 without catalyst and gems', async function () {
    //       const {
    //         mainnet,
    //         polygon,
    //         polygonAssetRegistry,
    //       } = await setupMainnetAndPolygonAsset();

    //       const tokenId = await mainnet.mintAsset(mainnet.users[0].address, 20);

    //       const balance = await mainnet.Asset['balanceOf(address,uint256)'](
    //         mainnet.users[0].address,
    //         tokenId
    //       );

    //       // Approve ERC1155 predicate contarct
    //       await waitFor(
    //         mainnet.users[0].Asset.setApprovalForAll(
    //           mainnet.predicate.address,
    //           true
    //         )
    //       );

    //       // Generate data to be passed to Polygon
    //       const ipfsHashes = [
    //         ethers.utils.formatBytes32String('metadataHash')
    //       ];

    //       const tokenData = abiCoder.encode(
    //         ['bytes32[]', '(uint256, uint16, uint16[])[]'],
    //         [ipfsHashes, []]
    //       );

    //       const data = abiCoder.encode(
    //         ['uint256[]', 'uint256[]', 'bytes'],
    //         [[tokenId], [balance], tokenData]
    //       );

    //       // Lock tokens on ERC1155 predicate contract
    //       await waitFor(
    //         mainnet.predicate.lockTokens(
    //           mainnet.users[0].address,
    //           [tokenId],
    //           [20],
    //           data
    //         )
    //       );

    //       // Emulate the ChildChainManager call to deposit
    //       await waitFor(
    //         polygon.childChainManager.callDeposit(mainnet.users[0].address, data)
    //       );

    //       // Ensure balance has been updated on Asset & PolygonAsset
    //       const mainnetBalance = await mainnet.Asset[
    //         'balanceOf(address,uint256)'
    //       ](mainnet.users[0].address, tokenId);
    //       const polygonBalance = await polygon.Asset[
    //         'balanceOf(address,uint256)'
    //       ](mainnet.users[0].address, tokenId);
    //       expect(polygonBalance).to.be.equal(balance);
    //       expect(mainnetBalance).to.be.equal(0);

    //       // Ensure URI is same
    //       const mainnetURI = await mainnet.Asset['tokenURI(uint256)'](tokenId);
    //       const polygonURI = await polygon.Asset['tokenURI(uint256)'](tokenId);
    //       expect(mainnetURI).to.be.equal(polygonURI);

    //       const internalRecordRegistry = await polygonAssetRegistry.getRecord(
    //         tokenId
    //       );

    //       expect(internalRecordRegistry[0]).to.be.equal(false);
    //     });
    //   });

    //   it('Deposit 1 asset from 20 ERC1155 L1 to L2', async function () {
    //     const {
    //       mainnet,
    //       polygon,
    //       polygonAssetRegistry,
    //     } = await setupMainnetAndPolygonAsset();

    //     const tokenId = await mainnet.mintAsset(mainnet.users[0].address, 20);

    //     // Approve ERC1155 predicate contarct
    //     await waitFor(
    //       mainnet.users[0].Asset.setApprovalForAll(
    //         mainnet.predicate.address,
    //         true
    //       )
    //     );

    //     // Generate data to be passed to Polygon
    //     const ipfsHashes = [
    //       ethers.utils.formatBytes32String('metadataHash')
    //     ];

    //     const tokenData = abiCoder.encode(
    //       ['bytes32[]', '(uint256, uint16, uint16[])[]'],
    //       [ipfsHashes, []]
    //     );

    //     const data = abiCoder.encode(
    //       ['uint256[]', 'uint256[]', 'bytes'],
    //       [[tokenId], [1], tokenData]
    //     );

    //     // Lock tokens on ERC1155 predicate contract
    //     await waitFor(
    //       mainnet.predicate.lockTokens(
    //         mainnet.users[0].address,
    //         [tokenId],
    //         [20],
    //         data
    //       )
    //     );

    //     // Emulate the ChildChainManager call to deposit
    //     await waitFor(
    //       polygon.childChainManager.callDeposit(mainnet.users[0].address, data)
    //     );

    //     // Ensure balance has been updated on Asset & PolygonAsset
    //     const mainnetBalance = await mainnet.Asset['balanceOf(address,uint256)'](
    //       mainnet.users[0].address,
    //       tokenId
    //     );
    //     const polygonBalance = await polygon.Asset['balanceOf(address,uint256)'](
    //       mainnet.users[0].address,
    //       tokenId
    //     );
    //     expect(polygonBalance).to.be.equal(1);
    //     expect(mainnetBalance).to.be.equal(0);

    //     // Ensure URI is same
    //     const mainnetURI = await mainnet.Asset['tokenURI(uint256)'](tokenId);
    //     const polygonURI = await polygon.Asset['tokenURI(uint256)'](tokenId);
    //     expect(mainnetURI).to.be.equal(polygonURI);

    //     const internalRecordRegistry = await polygonAssetRegistry.getRecord(
    //       tokenId
    //     );

    //     expect(internalRecordRegistry[0]).to.be.equal(false);
    //   });

    //   describe('Transfer Gems and catalyst L2 to L1', function () {
    //     async function executeL2toL1Deposit(
    //       gemsAndCatalystsdata: (number | number[] | void)[]
    //     ) {
    //       const {
    //         mainnet,
    //         polygon,
    //         polygonAssetRegistry,
    //       } = await setupMainnetAndPolygonAsset();

    //       const tokenId = await polygon.mintAsset(polygon.users[0].address, 20);

    //       const balance = await polygon.Asset['balanceOf(address,uint256)'](
    //         polygon.users[0].address,
    //         tokenId
    //       );

    //       // we use this function because it allows us to add gems and catalyst without having the ERC20 burnt ...
    //       // it's only for convenience
    //       polygonAssetRegistry.setCatalystWhenDepositOnOtherLayer(
    //         tokenId,
    //         gemsAndCatalystsdata[0],
    //         gemsAndCatalystsdata[1]
    //       );

    //       // User withdraws tokens from Polygon
    //       const receipt = await waitFor(
    //         polygon.users[0].Asset.withdraw([tokenId], [balance])
    //       );
    //       const event = receipt?.events?.filter(
    //         (event: Event) => event.event === 'ChainExit'
    //       )[0];
    //       const tokenData = event?.args?.data;

    //       // Emulate exit call
    //       await waitFor(
    //         mainnet.predicate.exitTokens(
    //           polygon.users[0].address,
    //           [tokenId],
    //           [balance],
    //           tokenData
    //         )
    //       );

    //       // Ensure balance has been updated on Asset & PolygonAsset
    //       const mainnetBalance = await mainnet.Asset[
    //         'balanceOf(address,uint256)'
    //       ](polygon.users[0].address, tokenId);
    //       const polygonBalance = await polygon.Asset[
    //         'balanceOf(address,uint256)'
    //       ](polygon.users[0].address, tokenId);
    //       expect(polygonBalance).to.be.equal(0);
    //       expect(mainnetBalance).to.be.equal(balance);

    //       // Ensure URI is same
    //       const mainnetURI = await mainnet.Asset['tokenURI(uint256)'](tokenId);
    //       const polygonURI = await polygon.Asset['tokenURI(uint256)'](tokenId);
    //       expect(mainnetURI).to.be.equal(polygonURI);
    //       return tokenId;
    //     }

    //     it('Deposit asset from L2 to L1 with 1 catalyst legendary and 4 power gems', async function () {
    //       const {assetRegistry} = await setupMainnetAndPolygonAsset();

    //       const catalystData = [4, [1, 1, 1, 1]];
    //       const tokenId = await executeL2toL1Deposit(catalystData);
    //       const internalRecordRegistry = await assetRegistry.getRecord(tokenId);

    //       expect(internalRecordRegistry).to.eql([
    //         true,
    //         4,
    //         [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //       ]);
    //     });

    //     it('Deposit asset from L2 to L1 with 1 catalyst legendary', async function () {
    //       const {assetRegistry} = await setupMainnetAndPolygonAsset();

    //       const catalystData = [4, []];
    //       const tokenId = await executeL2toL1Deposit(catalystData);
    //       const internalRecordRegistry = await assetRegistry.getRecord(tokenId);

    //       expect(internalRecordRegistry).to.eql([
    //         true,
    //         4,
    //         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //       ]);
    //     });

    //     it('Deposit asset from L2 to L1 with 1 catalyst legendary 1 gem defense', async function () {
    //       const {assetRegistry} = await setupMainnetAndPolygonAsset();

    //       const catalystData = [4, [2]];
    //       const tokenId = await executeL2toL1Deposit(catalystData);
    //       const internalRecordRegistry = await assetRegistry.getRecord(tokenId);

    //       expect(internalRecordRegistry).to.eql([
    //         true,
    //         4,
    //         [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //       ]);
    //     });

    //     it('Deposit asset from L2 to L1 without catalyst and gems', async function () {
    //       const {
    //         mainnet,
    //         polygon,
    //         assetRegistry,
    //       } = await setupMainnetAndPolygonAsset();

    //       const tokenId = await polygon.mintAsset(polygon.users[0].address, 20);
    //       const balance = await polygon.Asset['balanceOf(address,uint256)'](
    //         polygon.users[0].address,
    //         tokenId
    //       );

    //       // User withdraws tokens from Polygon
    //       const receipt = await waitFor(
    //         polygon.users[0].Asset.withdraw([tokenId], [balance])
    //       );
    //       const event = receipt?.events?.filter(
    //         (event: Event) => event.event === 'ChainExit'
    //       )[0];
    //       const tokenData = event?.args?.data;

    //       // Emulate exit call
    //       await waitFor(
    //         mainnet.predicate.exitTokens(
    //           polygon.users[0].address,
    //           [tokenId],
    //           [balance],
    //           tokenData
    //         )
    //       );

    //       // Ensure balance has been updated on Asset & PolygonAsset
    //       const mainnetBalance = await mainnet.Asset[
    //         'balanceOf(address,uint256)'
    //       ](polygon.users[0].address, tokenId);
    //       const polygonBalance = await polygon.Asset[
    //         'balanceOf(address,uint256)'
    //       ](polygon.users[0].address, tokenId);
    //       expect(polygonBalance).to.be.equal(0);
    //       expect(mainnetBalance).to.be.equal(balance);

    //       // Ensure URI is same
    //       const mainnetURI = await mainnet.Asset['tokenURI(uint256)'](tokenId);
    //       const polygonURI = await polygon.Asset['tokenURI(uint256)'](tokenId);
    //       expect(mainnetURI).to.be.equal(polygonURI);

    //       const internalRecordRegistry = await assetRegistry.getRecord(tokenId);

    //       expect(internalRecordRegistry[0]).to.be.equal(false);
    //     });
    //   });
  });
});
