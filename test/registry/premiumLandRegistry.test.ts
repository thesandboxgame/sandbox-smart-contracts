import {expect} from '../chai-setup';
import {
  setupPremiumLandRegistry,
  setupPremiumLandRegistryForBalance,
  TileWithCoords,
} from './fixtures';
import {tileWithCoordToJS} from '../map/fixtures';
import {AddressZero} from '@ethersproject/constants';

describe('PremiumLandRegistry.sol', function () {
  describe('Roles', function () {
    describe('admin', function () {
      it('admin can grant roles', async function () {
        const {
          contractAsAdmin: contract,
          MAP_DESIGNER_ROLE,
          other,
        } = await setupPremiumLandRegistry();
        expect(await contract.hasRole(MAP_DESIGNER_ROLE, other)).to.be.false;
        await contract.grantRole(MAP_DESIGNER_ROLE, other);
        expect(await contract.hasRole(MAP_DESIGNER_ROLE, other)).to.be.true;
      });
      it('other cannot grant roles', async function () {
        const {
          contractAsOther: contract,
          MAP_DESIGNER_ROLE,
          other,
        } = await setupPremiumLandRegistry();
        await expect(
          contract.grantRole(MAP_DESIGNER_ROLE, other)
        ).to.be.revertedWith('is missing role');
      });
    });
    describe('map designer', function () {
      it('map designer can set premium lands', async function () {
        const {
          contractAsMapDesigner: contract,
        } = await setupPremiumLandRegistry();
        expect(await contract.isPremium(10, 10)).to.be.false;
        await contract.set(0, 0, 12);
        expect(await contract.isPremium(10, 10)).to.be.true;
      });
      it('other cannot set premium lands', async function () {
        const {contractAsOther: contract} = await setupPremiumLandRegistry();
        await expect(contract.set(0, 0, 12)).to.be.revertedWith(
          'is missing role'
        );
      });
    });
  });

  describe('with no minted lands', function () {
    it('set a 3x3 quad and check', async function () {
      const {
        contractAsMapDesigner: registry,
        landContractAsDeployer: land,
        other,
      } = await setupPremiumLandRegistry();
      const tile = TileWithCoords.init(0, 0);
      tile.setRectangle(0, 0, 3, 3);
      await registry.set(0, 0, 3);

      expect(await registry.isPremium(2, 2)).to.be.true;
      expect(await registry.isPremium(3, 2)).to.be.false;
      expect(await registry['isAllPremium(uint256,uint256,uint256)'](0, 0, 3))
        .to.be.true;
      expect(await registry['isAllPremium(((uint256[3])))'](tile.getData())).to
        .be.true;
      expect(await registry['isAllPremium(((uint256[3]))[])']([tile.getData()]))
        .to.be.true;
      expect(await registry['isSomePremium(uint256,uint256,uint256)'](0, 0, 3))
        .to.be.true;
      const tile2 = TileWithCoords.init(0, 0);
      tile2.setRectangle(0, 0, 2, 2);
      expect(await registry['isSomePremium(((uint256[3])))'](tile2.getData()))
        .to.be.true;
      expect(
        await registry['isSomePremium(((uint256[3]))[])']([tile2.getData()])
      ).to.be.true;

      // list
      expect(await registry.length()).to.be.equal(1);
      expect(tileWithCoordToJS(await registry['at(uint256)'](0))).to.be.eql(
        tile.getJsData()
      );
      expect(
        tileWithCoordToJS((await registry['at(uint256,uint256)'](0, 1))[0])
      ).to.be.eql(tile.getJsData());
      expect(tileWithCoordToJS((await registry.getMap())[0])).to.be.eql(
        tile.getJsData()
      );
      expect(await registry.getLandCount()).to.be.equal(3 * 3);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(3 * 3);
      expect(await registry.totalPremium()).to.be.equal(3 * 3);
      expect(await land.getPremiumBalance(other)).to.be.equal(0);
      expect(await registry.isAdjacent(2, 3, 1)).to.be.true;
      expect(await registry.isAdjacent(3, 3, 1)).to.be.false;
    });
    it('set, clear and count', async function () {
      const {
        contractAsMapDesigner: registry,
        landContractAsDeployer: land,
      } = await setupPremiumLandRegistry();

      await registry.set(0, 0, 12);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(12 * 12);
      await registry.clear(3, 3, 3);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
        12 * 12 - 3 * 3
      );
      await registry.clear(3, 6, 3);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
        12 * 12 - 2 * 3 * 3
      );
      await registry.clear(6, 3, 3);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
        12 * 12 - 3 * 3 * 3
      );
      await registry.clear(6, 6, 3);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
        12 * 12 - 4 * 3 * 3
      );
      expect(
        await registry['countPremium(uint256[],uint256[])']([0, 18], [1, 18])
      ).to.be.equal(1);
      expect(
        await registry['countPremium(uint256,uint256,uint256)'](0, 0, 6)
      ).to.be.equal(9 + 9 + 9);
      expect(
        await registry['countPremium(uint256[],uint256[],uint256[])'](
          [0, 18],
          [0, 18],
          [6, 3]
        )
      ).to.be.equal(9 + 9 + 9);
      expect(await registry.isPremium(0, 0)).to.be.true;
      expect(await registry.isPremium(4, 4)).to.be.false;
    });
  });
  describe('with minted lands', function () {
    it('set a 3x3 quad', async function () {
      const {
        contractAsMapDesigner: registry,
        landContractAsDeployer: land,
        other,
      } = await setupPremiumLandRegistry();
      await land.mintQuad(other, 3, 0, 0, []);

      const tile = TileWithCoords.init(0, 0);
      tile.setRectangle(0, 0, 3, 3);
      await registry.set(0, 0, 3);

      expect(await registry.isPremium(2, 2)).to.be.true;
      expect(await registry.isPremium(3, 2)).to.be.false;
      expect(await registry['isAllPremium(uint256,uint256,uint256)'](0, 0, 3))
        .to.be.true;
      expect(await registry['isAllPremium(((uint256[3])))'](tile.getData())).to
        .be.true;
      expect(await registry['isAllPremium(((uint256[3]))[])']([tile.getData()]))
        .to.be.true;
      expect(await registry['isSomePremium(uint256,uint256,uint256)'](0, 0, 3))
        .to.be.true;
      const tile2 = TileWithCoords.init(0, 0);
      tile2.setRectangle(0, 0, 2, 2);
      expect(await registry['isSomePremium(((uint256[3])))'](tile2.getData()))
        .to.be.true;
      expect(
        await registry['isSomePremium(((uint256[3]))[])']([tile2.getData()])
      ).to.be.true;

      // list
      expect(await registry.length()).to.be.equal(1);
      expect(tileWithCoordToJS(await registry['at(uint256)'](0))).to.be.eql(
        tile.getJsData()
      );
      expect(
        tileWithCoordToJS((await registry['at(uint256,uint256)'](0, 1))[0])
      ).to.be.eql(tile.getJsData());
      expect(tileWithCoordToJS((await registry.getMap())[0])).to.be.eql(
        tile.getJsData()
      );
      expect(await registry.getLandCount()).to.be.equal(3 * 3);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(0);
      expect(await land.getPremiumBalance(other)).to.be.equal(3 * 3);
      expect(await registry.isAdjacent(2, 3, 1)).to.be.true;
      expect(await registry.isAdjacent(3, 3, 1)).to.be.false;
    });
    it('set, clear and count', async function () {
      const {
        contractAsMapDesigner: registry,
        landContractAsDeployer: land,
        other,
      } = await setupPremiumLandRegistry();
      await land.mintQuad(other, 6, 0, 0, []);

      await registry.set(0, 0, 12);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
        12 * 12 - 6 * 6
      );
      expect(await land.getPremiumBalance(other)).to.be.equal(6 * 6);
      await registry.clear(3, 3, 3);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
        12 * 12 - 6 * 6
      );
      expect(await land.getPremiumBalance(other)).to.be.equal(6 * 6 - 3 * 3);
      await registry.clear(3, 6, 3);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
        12 * 12 - 6 * 6 - 3 * 3
      );
      expect(await land.getPremiumBalance(other)).to.be.equal(6 * 6 - 3 * 3);
      await registry.clear(6, 3, 3);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
        12 * 12 - 6 * 6 - 3 * 3 * 2
      );
      expect(await land.getPremiumBalance(other)).to.be.equal(6 * 6 - 3 * 3);
      await registry.clear(6, 6, 3);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
        12 * 12 - 6 * 6 - 3 * 3 * 3
      );
      expect(await land.getPremiumBalance(other)).to.be.equal(6 * 6 - 3 * 3);
      expect(
        await registry['countPremium(uint256[],uint256[])']([0, 18], [1, 18])
      ).to.be.equal(1);
      expect(
        await registry['countPremium(uint256,uint256,uint256)'](0, 0, 6)
      ).to.be.equal(9 + 9 + 9);
      expect(
        await registry['countPremium(uint256[],uint256[],uint256[])'](
          [0, 18],
          [0, 18],
          [6, 3]
        )
      ).to.be.equal(9 + 9 + 9);
      expect(await registry.isPremium(0, 0)).to.be.true;
      expect(await registry.isPremium(4, 4)).to.be.false;
    });
    describe('balances', function () {
      it('mintQuad', async function () {
        const {
          contractAsMapDesigner: registry,
          landContractAsDeployer: land,
          other,
          other2,
        } = await setupPremiumLandRegistry();
        await registry.set(0, 0, 12);
        expect(await registry.totalPremium()).to.be.equal(12 * 12);
        expect(await land.getPremiumBalance(AddressZero)).to.be.equal(12 * 12);
        expect(await land.getPremiumBalance(other)).to.be.equal(0);

        await land.mintQuad(other, 3, 0, 0, []);
        expect(await registry.totalPremium()).to.be.equal(12 * 12);
        expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
          12 * 12 - 3 * 3
        );
        expect(await land.getPremiumBalance(other)).to.be.equal(3 * 3);

        await land.mintQuad(other2, 6, 6, 0, []);
        expect(await registry.totalPremium()).to.be.equal(12 * 12);
        expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
          12 * 12 - 3 * 3 - 6 * 6
        );
        expect(await land.getPremiumBalance(other)).to.be.equal(3 * 3);
        expect(await land.getPremiumBalance(other2)).to.be.equal(6 * 6);
      });
      it('mintQuad2', async function () {
        const {
          contractAsMapDesigner: registry,
          landContractAsDeployer: land,
          other,
        } = await setupPremiumLandRegistry();
        await registry.set(0, 0, 12);
        await registry.set(12, 0, 12);
        await registry.set(0, 12, 12);
        await registry.set(24, 24, 12);
        expect(await registry.totalPremium()).to.be.equal(4 * 12 * 12);
        expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
          4 * 12 * 12
        );
        expect(await land.getPremiumBalance(other)).to.be.equal(0);

        await land.mintQuad(other, 24, 0, 0, []);
        expect(await registry.totalPremium()).to.be.equal(4 * 12 * 12);
        expect(await land.getPremiumBalance(AddressZero)).to.be.equal(12 * 12);
        expect(await land.getPremiumBalance(other)).to.be.equal(3 * 12 * 12);
      });

      it('transferQuad', async function () {
        const {
          contractAsMapDesigner: registry,
          landContractAsOther: land,
          other,
          other2,
        } = await setupPremiumLandRegistryForBalance();
        await land.transferQuad(other, other2, 3, 0, 0, []);
        expect(await registry.totalPremium()).to.be.equal(2 * 12 * 12);
        expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
          2 * 12 * 12 - 3 * 3
        );
        expect(await land.getPremiumBalance(other)).to.be.equal(0);
        expect(await land.getPremiumBalance(other2)).to.be.equal(3 * 3);
      });
      it('transferFrom', async function () {
        const {
          contractAsMapDesigner: registry,
          landContractAsOther: land,
          other,
          other2,
        } = await setupPremiumLandRegistryForBalance();
        await land.transferFrom(other, other2, 0);
        await land.transferFrom(other, other2, 1);
        await land.transferFrom(other, other2, 2);
        expect(await registry.totalPremium()).to.be.equal(2 * 12 * 12);
        expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
          2 * 12 * 12 - 3 * 3
        );
        expect(await land.getPremiumBalance(other)).to.be.equal(3 * 3 - 3);
        expect(await land.getPremiumBalance(other2)).to.be.equal(3);
      });
      it('batchTransferFrom', async function () {
        const {
          contractAsMapDesigner: registry,
          landContractAsOther: land,
          other,
          other2,
        } = await setupPremiumLandRegistryForBalance();
        await land.batchTransferFrom(other, other2, [0, 1, 2], []);
        expect(await registry.totalPremium()).to.be.equal(2 * 12 * 12);
        expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
          2 * 12 * 12 - 3 * 3
        );
        expect(await land.getPremiumBalance(other)).to.be.equal(3 * 3 - 3);
        expect(await land.getPremiumBalance(other2)).to.be.equal(3);
      });
      it('burn', async function () {
        const {
          contractAsMapDesigner: registry,
          landContractAsOther: land,
          other,
          other2,
        } = await setupPremiumLandRegistryForBalance();
        await land.burn(0);
        await land.burn(1);
        await land.burn(2);
        expect(await registry.totalPremium()).to.be.equal(2 * 12 * 12);
        expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
          2 * 12 * 12 - 3 * 3 + 3
        );
        expect(await land.getPremiumBalance(other)).to.be.equal(3 * 3 - 3);
        expect(await land.getPremiumBalance(other2)).to.be.equal(0);
      });
    });
    it('mintAndTransferQuad', async function () {
      const {
        contractAsMapDesigner: registry,
        landContractAsOther: land,
        other,
        other2,
      } = await setupPremiumLandRegistry();
      await registry.set(0, 0, 6);
      await registry.set(6, 6, 6);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(2 * 6 * 6);
      expect(await land.getPremiumBalance(other)).to.be.equal(0);
      expect(await land.getPremiumBalance(other2)).to.be.equal(0);

      await land.mintQuad(other, 3, 0, 0, []);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
        2 * 6 * 6 - 3 * 3
      );
      expect(await land.getPremiumBalance(other)).to.be.equal(3 * 3);
      expect(await land.getPremiumBalance(other2)).to.be.equal(0);

      await land.mintAndTransferQuad(other2, 6, 0, 0, []);
      expect(await land.getPremiumBalance(AddressZero)).to.be.equal(6 * 6);
      expect(await land.getPremiumBalance(other)).to.be.equal(0);
      expect(await land.getPremiumBalance(other2)).to.be.equal(6 * 6);
    });
  });
});
