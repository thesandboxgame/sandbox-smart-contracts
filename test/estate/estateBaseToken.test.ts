import {setupTestEstateBaseToken} from './fixtures';
import {assert, expect} from '../chai-setup';
import {BigNumber} from 'ethers';
import {Event} from '@ethersproject/contracts';
import {setRectangle, tileWithCoordToJS} from '../map/fixtures';

describe('Estate base token test', function () {
  it('test initial values', async function () {
    const {
      other,
      trustedForwarder,
      defaultAdmin,
      contractAsDeployer,
      chainIndex,
      name,
      symbol,
      landContract,
    } = await setupTestEstateBaseToken();
    expect(BigNumber.from(await contractAsDeployer.getLandToken())).to.be.equal(
      landContract.address
    );
    expect(BigNumber.from(await contractAsDeployer.getNextId())).to.be.equal(0);
    expect(
      BigNumber.from(await contractAsDeployer.getChainIndex())
    ).to.be.equal(chainIndex);
    expect(await contractAsDeployer.name()).to.be.equal(name);
    expect(await contractAsDeployer.symbol()).to.be.equal(symbol);
    expect(await contractAsDeployer.isTrustedForwarder(trustedForwarder)).to.be
      .true;
    expect(await contractAsDeployer.isTrustedForwarder(other)).to.be.false;
    const DEFAULT_ADMIN_ROLE = await contractAsDeployer.DEFAULT_ADMIN_ROLE();
    expect(await contractAsDeployer.hasRole(DEFAULT_ADMIN_ROLE, defaultAdmin))
      .to.be.true;
    expect(await contractAsDeployer.hasRole(DEFAULT_ADMIN_ROLE, other)).to.be
      .false;
  });
  describe('roles', function () {
    describe('admin', function () {
      it('admin should be able to setBaseURI and setLandToken', async function () {
        const {other, contractAsAdmin} = await setupTestEstateBaseToken();

        expect(await contractAsAdmin.getBaseUri()).to.be.equal('');
        const uri = 'https://bla';
        await contractAsAdmin.setBaseURI(uri);
        expect(await contractAsAdmin.getBaseUri()).to.be.equal(uri);

        const landToken = await contractAsAdmin.getLandToken();
        expect(landToken).not.to.be.equal(other);
        await contractAsAdmin.setLandToken(other);
        expect(await contractAsAdmin.getLandToken()).to.be.equal(other);
      });
      it('other should fail to setLandToken and setBaseURI', async function () {
        const {other, contractAsOther} = await setupTestEstateBaseToken();
        await expect(contractAsOther.setBaseURI(other)).to.revertedWith(
          'not admin'
        );
        await expect(contractAsOther.setLandToken(other)).to.revertedWith(
          'not admin'
        );
      });
    });
  });
  describe('minter and burner, used by the estate tunnel', function () {
    it('minter should be able to mintEstate and burner to burnEstate', async function () {
      const {
        other,
        contractAsBurner,
        contractAsMinter,
      } = await setupTestEstateBaseToken();
      const receipt = await (
        await contractAsMinter.mintEstate(other, [])
      ).wait();
      const events = receipt.events.filter(
        (v: Event) => v.event === 'EstateTokenMinted'
      );
      assert.equal(events.length, 1);
      const estateId = events[0].args['estateId'];
      expect(await contractAsMinter.ownerOf(estateId)).to.be.equal(other);

      expect(await contractAsBurner.exists(estateId)).to.be.true;
      await contractAsBurner.burnEstate(other, estateId);
      expect(await contractAsBurner.exists(estateId)).to.be.false;
    });
    it('other should fail to mintEstate and burnEstate', async function () {
      const {other, contractAsOther} = await setupTestEstateBaseToken();
      await expect(contractAsOther.mintEstate(other, [])).to.revertedWith(
        'not authorized'
      );
      await expect(contractAsOther.burnEstate(other, 123)).to.revertedWith(
        'not authorized'
      );
    });
  });
  describe('create', function () {
    it('create an estate', async function () {
      const {
        other,
        contractAsOther,
        chainIndex,
        mintQuadAndApproveAsOther,
      } = await setupTestEstateBaseToken();
      await mintQuadAndApproveAsOther(24, 240, 120);

      const nextId = BigNumber.from(await contractAsOther.getNextId());

      const size = BigNumber.from(24);
      const x = BigNumber.from(240);
      const y = BigNumber.from(120);
      const quads = [[size], [x], [y]];
      const receipt = await (await contractAsOther.create(quads)).wait();
      expect(await contractAsOther.getNextId()).to.be.equal(nextId.add(1));
      const events = receipt.events.filter(
        (v: Event) => v.event === 'EstateTokenCreated'
      );
      assert.equal(events.length, 1);
      const estateId = await contractAsOther.packId(
        nextId.add(1),
        chainIndex,
        1
      );
      expect(events[0].args['estateId']).to.be.equal(estateId);
      expect(events[0].args['lands']).to.be.eql(quads);
      expect(await contractAsOther.ownerOf(estateId)).to.be.equal(other);

      const storageId = await contractAsOther.getStorageId(estateId);
      expect(await contractAsOther.getCurrentEstateId(storageId)).to.be.equal(
        estateId
      );
      expect(await contractAsOther.getOwnerOfStorage(storageId)).to.be.equal(
        other
      );
      expect(await contractAsOther.getCurrentEstateId(estateId)).to.be.equal(
        estateId
      );
      expect(await contractAsOther.getOwnerOfStorage(estateId)).to.be.equal(
        other
      );
      expect(await contractAsOther.getLandCount(estateId)).to.be.equal(24 * 24);
      expect(await contractAsOther.getLandLength(estateId)).to.be.equal(1);
      const tiles = await contractAsOther.getLandAt(estateId, 0, 1);

      expect(tileWithCoordToJS(tiles[0])).to.be.eql({
        x: x.div(24),
        y: y.div(24),
        tile: setRectangle(x.mod(24), y.mod(24), size, size),
      });
      expect(
        await contractAsOther.contain(
          estateId,
          await contractAsOther.translateSquare(x, y, 1)
        )
      ).to.be.true;
      expect(
        await contractAsOther.contain(
          estateId,
          await contractAsOther.translateSquare(x.add(24), y, 1)
        )
      ).to.be.false;
    });
    it('should fail to create using the same land', async function () {
      const {
        contractAsOther,
        mintQuadAndApproveAsOther,
      } = await setupTestEstateBaseToken();
      await mintQuadAndApproveAsOther(24, 240, 120);
      const sizes = [24];
      const xs = [240];
      const ys = [120];
      await contractAsOther.create([sizes, xs, ys]);
      await expect(contractAsOther.create([sizes, xs, ys])).to.revertedWith(
        'not owner of all sub quads not parent quad'
      );
    });
    it('should fail if quads are not adjacent', async function () {
      const {
        contractAsOther,
        mintQuadAndApproveAsOther,
      } = await setupTestEstateBaseToken();
      await mintQuadAndApproveAsOther(24, 240, 120);
      await mintQuadAndApproveAsOther(24, 240 + 24, 120 + 24);
      const sizes = [24, 24];
      const xs = [240, 240 + 24];
      const ys = [120, 120 + 24];
      await expect(contractAsOther.create([sizes, xs, ys])).to.revertedWith(
        'not adjacent'
      );
    });
  });
  describe('add land', function () {
    it('create an estate then add land', async function () {
      const {
        contractAsOther,
        createEstate,
        mintQuadAndApproveAsOther,
      } = await setupTestEstateBaseToken();
      const estateId = await createEstate([{size: 24, x: 240, y: 120}]);

      const size = BigNumber.from(24);
      const x = BigNumber.from(240 + 24);
      const y = BigNumber.from(120);
      const quads = [[size], [x], [y]];
      await mintQuadAndApproveAsOther(size, x, y);

      const receipt = await (
        await contractAsOther.addLand(estateId, quads)
      ).wait();
      const events = receipt.events.filter(
        (v: Event) => v.event === 'EstateTokenLandsAdded'
      );
      assert.equal(events.length, 1);
      expect(events[0].args['estateId']).to.be.equal(estateId);
      const newId = await contractAsOther.incrementTokenId(estateId);
      expect(events[0].args['newId']).to.be.equal(newId);
      expect(events[0].args['lands']).to.be.eql(quads);
    });
    it('should fail to add if quads are not adjacent', async function () {
      const {
        contractAsOther,
        mintQuadAndApproveAsOther,
        createEstate,
      } = await setupTestEstateBaseToken();
      const estateId = await createEstate([{size: 24, x: 240, y: 120}]);
      await mintQuadAndApproveAsOther(24, 240 + 24, 120 + 24);
      await mintQuadAndApproveAsOther(24, 240 + 24, 120 - 24);
      // Single landa
      await expect(
        contractAsOther.addLand(estateId, [[24], [240 + 24], [120 + 24]])
      ).to.revertedWith('not adjacent');
      // Multiple landas
      await expect(
        contractAsOther.addLand(estateId, [
          [24, 24],
          [240 + 24, 240 + 24],
          [120 + 24, 120 - 24],
        ])
      ).to.revertedWith('not adjacent');
    });
    it('should fail if not the owner', async function () {
      const {
        deployer,
        landContract,
        contractAsDeployer,
        mintQuadAndApprove,
        createEstate,
      } = await setupTestEstateBaseToken();
      const estateId = await createEstate([{size: 24, x: 240, y: 120}]);
      await mintQuadAndApprove(deployer, landContract, 24, 240 + 24, 120);
      await expect(
        contractAsDeployer.addLand(estateId, [[24], [240 + 24], [120]])
      ).to.revertedWith('caller is not owner nor approved');
    });
  });
  describe('@skip-on-coverage gas measurement', function () {
    it('create an estate', async function () {
      const {
        contractAsOther,
        mintQuadAndApproveAsOther,
      } = await setupTestEstateBaseToken();
      await mintQuadAndApproveAsOther(24, 240, 120);
      const estimate = await contractAsOther.estimateGas.create([
        [24],
        [240],
        [120],
      ]);
      console.log(
        'Estate creation gas consumption:',
        BigNumber.from(estimate).toString()
      );
    });
    it('add single land', async function () {
      const {
        contractAsOther,
        mintQuadAndApproveAsOther,
        createEstate,
      } = await setupTestEstateBaseToken();
      const estateId = await createEstate([{size: 24, x: 240, y: 120}]);
      await mintQuadAndApproveAsOther(24, 240 + 24, 120);
      const estimate = await contractAsOther.estimateGas.addLand(estateId, [
        [24],
        [240 + 24],
        [120],
      ]);
      console.log(
        'Estate adding a 24x24 gas consumption:',
        BigNumber.from(estimate).toString()
      );
    });
    it('add multiple land', async function () {
      const {
        contractAsOther,
        mintQuadAndApproveAsOther,
        createEstate,
      } = await setupTestEstateBaseToken();
      const estateId = await createEstate([{size: 24, x: 240, y: 120}]);
      await mintQuadAndApproveAsOther(24, 240, 120 + 24);
      await mintQuadAndApproveAsOther(24, 240, 120 + 48);
      await mintQuadAndApproveAsOther(24, 240, 120 - 24);
      const estimate = await contractAsOther.estimateGas.addLand(estateId, [
        [24, 24, 24],
        [240, 240, 240],
        [120 + 24, 120 - 24, 120 + 48],
      ]);
      console.log(
        'Estate adding two 24x24 gas consumption:',
        BigNumber.from(estimate).toString()
      );
    });
  });
});
