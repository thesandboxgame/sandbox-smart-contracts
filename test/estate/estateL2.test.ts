import {setupL2EstateAndLand, setupL2EstateExperienceAndLand} from './fixtures';
import {assert, expect} from '../chai-setup';
import {BigNumber} from 'ethers';
import {Event} from '@ethersproject/contracts';
import {getFullTile, tileWithCoordToJS} from '../map/fixtures';
import {AddressZero} from '@ethersproject/constants';

describe('PolygonEstateTokenV1 tests for L2', function () {
  describe('update', function () {
    it('update an estate without registry', async function () {
      const {
        other,
        estateContractAsOther,
        mintQuad,
        mintApproveAndCreateAsOther,
        chainIndex,
      } = await setupL2EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);

      await mintQuad(other, 24, 144, 144);

      const nextId = BigNumber.from(await estateContractAsOther.getNextId());

      const receipt = await (
        await estateContractAsOther.update(
          estateId,
          [[24], [144], [144]],
          [],
          [[24], [48], [96]]
        )
      ).wait();
      const events = receipt.events.filter(
        (v: Event) => v.event === 'EstateTokenUpdated'
      );
      assert.equal(events.length, 1);
      expect(events[0].args['oldId']).to.be.equal(estateId);
      // PackId
      const newId = nextId.shl(128).add(chainIndex.shl(96)).add(2);
      expect(events[0].args['newId']).to.be.equal(newId);
      expect(events[0].args['user']).to.be.equal(other);
      const lands = events[0].args['lands'];
      expect(lands.length).to.be.equal(1);
      const l = tileWithCoordToJS(lands[0]);
      expect(l.x).to.be.equal(144 / 24);
      expect(l.y).to.be.equal(144 / 24);
      expect(l.tile).to.be.eql(getFullTile());
      expect(await estateContractAsOther.exists(estateId)).to.be.false;
      expect(await estateContractAsOther.exists(newId)).to.be.true;
      expect(await estateContractAsOther.ownerOf(newId)).to.be.equal(other);
    });
    it('update an estate with registry', async function () {
      const {
        other,
        estateContractAsOther,
        mintQuad,
        mintApproveAndCreateAsOther,
        chainIndex,
      } = await setupL2EstateExperienceAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);

      await mintQuad(other, 24, 144, 144);

      const nextId = BigNumber.from(await estateContractAsOther.getNextId());

      const receipt = await (
        await estateContractAsOther.update(
          estateId,
          [[24], [144], [144]],
          [],
          [[24], [48], [96]]
        )
      ).wait();
      const events = receipt.events.filter(
        (v: Event) => v.event === 'EstateTokenUpdated'
      );
      assert.equal(events.length, 1);
      expect(events[0].args['oldId']).to.be.equal(estateId);
      // PackId
      const newId = nextId.shl(128).add(chainIndex.shl(96)).add(2);
      expect(events[0].args['newId']).to.be.equal(newId);
      expect(events[0].args['user']).to.be.equal(other);
      const lands = events[0].args['lands'];
      expect(lands.length).to.be.equal(1);
      const l = tileWithCoordToJS(lands[0]);
      expect(l.x).to.be.equal(144 / 24);
      expect(l.y).to.be.equal(144 / 24);
      expect(l.tile).to.be.eql(getFullTile());
      expect(await estateContractAsOther.exists(estateId)).to.be.false;
      expect(await estateContractAsOther.exists(newId)).to.be.true;
      expect(await estateContractAsOther.ownerOf(newId)).to.be.equal(other);
    });
    it('should fail if there is nothing to update without registry', async function () {
      const {
        estateContractAsOther,
        mintApproveAndCreateAsOther,
      } = await setupL2EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);

      await expect(
        estateContractAsOther.update(estateId, [[], [], []], [], [[], [], []])
      ).to.revertedWith('nothing to update');
    });
    it('should fail if there is nothing to update with registry', async function () {
      const {
        estateContractAsOther,
        mintApproveAndCreateAsOther,
      } = await setupL2EstateExperienceAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);

      await expect(
        estateContractAsOther.update(estateId, [[], [], []], [], [[], [], []])
      ).to.revertedWith('nothing to update');
    });
    it('should fail if not owner', async function () {
      const {
        other,
        estateContractAsDeployer,
        mintQuad,
        mintApproveAndCreateAsOther,
      } = await setupL2EstateExperienceAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      await mintQuad(other, 24, 144, 144);

      await expect(
        estateContractAsDeployer.update(
          estateId,
          [[24], [144], [144]],
          [],
          [[24], [48], [96]]
        )
      ).to.revertedWith('caller is not owner nor approved');
    });
    it('should burn if the estate end up empty', async function () {
      const {
        other,
        estateContractAsOther,
        mintApproveAndCreateAsOther,
      } = await setupL2EstateExperienceAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      await expect(
        estateContractAsOther.update(
          estateId,
          [[], [], []],
          [],
          [[24], [48], [96]]
        )
      )
        .to.emit(estateContractAsOther, 'EstateTokenBurned')
        .withArgs(estateId, other);
    });
    it('should fail if the estate end up not adjacent', async function () {
      const {
        other,
        estateContractAsOther,
        mintQuad,
        mintApproveAndCreateAsOther,
      } = await setupL2EstateExperienceAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);

      await mintQuad(other, 24, 144, 144);
      await expect(
        estateContractAsOther.update(
          estateId,
          [[24], [144], [144]],
          [],
          [[], [], []]
        )
      ).to.revertedWith('not adjacent');
    });
    it('should fail to remove if quads are invalid', async function () {
      const {
        estateContractAsOther,
        mintApproveAndCreateAsOther,
      } = await setupL2EstateExperienceAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      await expect(
        estateContractAsOther.update(
          estateId,
          [[], [], []],
          [],
          [[24], [48], []]
        )
      ).to.revertedWith('invalid remove data');
    });
    it('should fail to remove if quads are missing', async function () {
      const {
        estateContractAsOther,
        mintApproveAndCreateAsOther,
      } = await setupL2EstateExperienceAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      await expect(
        estateContractAsOther.update(
          estateId,
          [[], [], []],
          [],
          [[24], [96], [96]]
        )
      ).to.revertedWith('quad missing');
    });
  });
  describe('burner, used by the estate tunnel', function () {
    it('burner should be able to burnEstate without registry', async function () {
      const {
        other,
        estateBurner,
        estateContractAsBurner,
        mintApproveAndCreateAsOther,
      } = await setupL2EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      const receipt = await (
        await estateContractAsBurner.burnEstate(other, estateId)
      ).wait();
      const events = receipt.events.filter(
        (v: Event) => v.event === 'EstateBridgeBurned'
      );
      assert.equal(events.length, 1);
      expect(events[0].args['estateId']).to.be.equal(estateId);
      expect(events[0].args['operator']).to.be.equal(estateBurner);
      expect(events[0].args['from']).to.be.equal(other);
      const lands = events[0].args['lands'];
      expect(lands.length).to.be.equal(1);
      const l = tileWithCoordToJS(lands[0]);
      expect(l.x).to.be.equal(48 / 24);
      expect(l.y).to.be.equal(96 / 24);
      expect(l.tile).to.be.eql(getFullTile());

      expect(await estateContractAsBurner.exists(estateId)).to.be.false;
    });
    it('burner should be able to burnEstate with registry', async function () {
      const {
        other,
        estateBurner,
        estateContractAsBurner,
        mintApproveAndCreateAsOther,
      } = await setupL2EstateExperienceAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      const receipt = await (
        await estateContractAsBurner.burnEstate(other, estateId)
      ).wait();
      const events = receipt.events.filter(
        (v: Event) => v.event === 'EstateBridgeBurned'
      );
      assert.equal(events.length, 1);
      expect(events[0].args['estateId']).to.be.equal(estateId);
      expect(events[0].args['operator']).to.be.equal(estateBurner);
      expect(events[0].args['from']).to.be.equal(other);
      const lands = events[0].args['lands'];
      expect(lands.length).to.be.equal(1);
      const l = tileWithCoordToJS(lands[0]);
      expect(l.x).to.be.equal(48 / 24);
      expect(l.y).to.be.equal(96 / 24);
      expect(l.tile).to.be.eql(getFullTile());

      expect(await estateContractAsBurner.exists(estateId)).to.be.false;
    });
    it('other should fail to burnEstate', async function () {
      const {
        other,
        estateContractAsOther,
        mintApproveAndCreateAsOther,
      } = await setupL2EstateExperienceAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      await expect(
        estateContractAsOther.burnEstate(other, estateId)
      ).to.revertedWith('not authorized');
    });
    it('should fail when not burning for the owner', async function () {
      const {
        estateBurner,
        estateContractAsBurner,
        mintApproveAndCreateAsOther,
      } = await setupL2EstateExperienceAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      await expect(
        estateContractAsBurner.burnEstate(estateBurner, estateId)
      ).to.revertedWith('caller is not owner nor approved');
    });
  });

  it('check contractURI', async function () {
    const {
      estateContractAsOther,
      estateContractAsAdmin,
    } = await setupL2EstateExperienceAndLand();
    expect(await estateContractAsOther.contractURI()).to.be.equal('');
    const uri = 'https://bla/';
    await estateContractAsAdmin.setBaseURI(uri);
    expect(await estateContractAsOther.contractURI()).to.be.equal(
      uri + 'polygon_estate.json'
    );
  });
  it('should fail without registry when expToUnlink has some data', async function () {
    const {
      estateContractAsOther,
      mintApproveAndCreateAsOther,
    } = await setupL2EstateAndLand();
    const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);

    await expect(
      estateContractAsOther.update(estateId, [[], [], []], [1], [[], [], []])
    ).to.revertedWith('invalid data');
  });
  describe('set registry', function () {
    it('admin should be able to set the registry', async function () {
      const {
        other,
        estateAdmin,
        estateContractAsAdmin,
        registryContractAsOther,
      } = await setupL2EstateExperienceAndLand();
      expect(await estateContractAsAdmin.getRegistry()).to.be.equal(
        registryContractAsOther.address
      );
      await expect(estateContractAsAdmin.setRegistry(other))
        .to.emit(estateContractAsAdmin, 'EstateRegistryChanged')
        .withArgs(estateAdmin, registryContractAsOther.address, other);
      expect(await estateContractAsAdmin.getRegistry()).to.be.equal(other);
    });
    it('other should fail to set the registry', async function () {
      const {
        other,
        estateContractAsOther,
      } = await setupL2EstateExperienceAndLand();
      await expect(estateContractAsOther.setRegistry(other)).to.revertedWith(
        'not admin'
      );
    });
    it('should fail to set the registry if the address is invalid', async function () {
      const {estateContractAsAdmin} = await setupL2EstateExperienceAndLand();
      await expect(
        estateContractAsAdmin.setRegistry(AddressZero)
      ).to.revertedWith('invalid address');
    });
    describe('registry operations', function () {
      it('update an estate while unlinking', async function () {
        const {
          other,
          estateContractAsOther,
          mintQuad,
          mintApproveAndCreateAsOther,
          chainIndex,
          experienceContract,
          registryContractAsOther,
        } = await setupL2EstateExperienceAndLand();
        const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
        await mintQuad(other, 24, 144, 144);

        const experienceId = 123;
        await experienceContract.setTemplate(experienceId, [
          [0, 0],
          [1, 1],
          [2, 2],
        ]);
        await registryContractAsOther.link(estateId, experienceId, 50, 100);
        expect(await registryContractAsOther['isLinked(uint256)'](experienceId))
          .to.be.true;

        const nextId = BigNumber.from(await estateContractAsOther.getNextId());
        const receipt = await (
          await estateContractAsOther.update(
            estateId,
            [[24], [144], [144]],
            [experienceId],
            [[24], [48], [96]]
          )
        ).wait();
        const events = receipt.events.filter(
          (v: Event) => v.event === 'EstateTokenUpdated'
        );
        assert.equal(events.length, 1);
        expect(events[0].args['oldId']).to.be.equal(estateId);
        // PackId
        const newId = nextId.shl(128).add(chainIndex.shl(96)).add(2);
        expect(events[0].args['newId']).to.be.equal(newId);
        expect(events[0].args['user']).to.be.equal(other);
        const lands = events[0].args['lands'];
        expect(lands.length).to.be.equal(1);
        const l = tileWithCoordToJS(lands[0]);
        expect(l.x).to.be.equal(144 / 24);
        expect(l.y).to.be.equal(144 / 24);
        expect(l.tile).to.be.eql(getFullTile());
        expect(await estateContractAsOther.exists(estateId)).to.be.false;
        expect(await estateContractAsOther.exists(newId)).to.be.true;
        expect(await estateContractAsOther.ownerOf(newId)).to.be.equal(other);
        expect(await registryContractAsOther['isLinked(uint256)'](experienceId))
          .to.be.false;
      });
      it('update should fail if linked', async function () {
        const {
          estateContractAsOther,
          mintApproveAndCreateAsOther,
          mintQuad,
          other,
          experienceContract,
          registryContractAsOther,
        } = await setupL2EstateExperienceAndLand();
        const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
        await mintQuad(other, 24, 144, 144);

        const experienceId = 123;
        await experienceContract.setTemplate(experienceId, [[0, 0]]);
        await registryContractAsOther.link(estateId, experienceId, 50, 100);
        await expect(
          estateContractAsOther.update(
            estateId,
            [[24], [144], [144]],
            [],
            [[24], [96], [96]]
          )
        ).to.revertedWith('quad missing');
      });
      it('burn an estate while unlinking', async function () {
        const {
          other,
          estateContractAsOther,
          estateContractAsBurner,
          mintApproveAndCreateAsOther,
          experienceContract,
          registryContractAsOther,
        } = await setupL2EstateExperienceAndLand();
        const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);

        const experienceId = 123;
        await experienceContract.setTemplate(experienceId, [[0, 0]]);
        await registryContractAsOther.link(estateId, experienceId, 50, 100);

        // burn and remove
        expect(
          estateContractAsOther.update(
            estateId,
            [[], [], []],
            [experienceId],
            [[24], [48], [96]]
          )
        )
          .to.emit(estateContractAsOther, 'EstateTokenBurned')
          .withArgs(estateId, other);
        expect(await estateContractAsBurner.exists(estateId)).to.be.false;
        expect(await registryContractAsOther['isLinked(uint256)'](experienceId))
          .to.be.false;
      });
      it('burn should fail if linked', async function () {
        const {
          estateContractAsOther,
          mintApproveAndCreateAsOther,
          mintQuad,
          other,
          experienceContract,
          registryContractAsOther,
        } = await setupL2EstateExperienceAndLand();
        const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
        await mintQuad(other, 24, 144, 144);

        const experienceId = 123;
        await experienceContract.setTemplate(experienceId, [[0, 0]]);
        await registryContractAsOther.link(estateId, experienceId, 50, 100);

        await expect(
          estateContractAsOther.update(
            estateId,
            [[], [], []],
            [],
            [[24], [48], [96]]
          )
        ).to.revertedWith('must unlink first');
      });
      it('burner, used by the estate tunnel should fail if linked', async function () {
        const {
          other,
          estateContractAsBurner,
          mintApproveAndCreateAsOther,
          experienceContract,
          registryContractAsOther,
        } = await setupL2EstateExperienceAndLand();
        const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
        const experienceId = 123;
        await experienceContract.setTemplate(experienceId, [[0, 0]]);
        await registryContractAsOther.link(estateId, experienceId, 50, 100);
        await expect(
          estateContractAsBurner.burnEstate(other, estateId)
        ).to.revertedWith('must unlink first');
      });
    });
  });
  it('burn an estate minted trough the bridge (so lands are minted)', async function () {
    const {
      other,
      estateContractAsOther,
      estateContractAsBurner,
      estateContractAsMinter,
      landContractAsDeployer,
    } = await setupL2EstateExperienceAndLand();
    // Set estate contract as the land tunnel so he can mint.
    await landContractAsDeployer.setMinter(estateContractAsOther.address, true);

    const full24x24TileIn144v144 = {
      tile: {
        data: [
          '0x06000600000000ffffffffffffffffffffffffffffffffffffffffffffffff',
          '0x0600000000ffffffffffffffffffffffffffffffffffffffffffffffff',
          '0x0600000000ffffffffffffffffffffffffffffffffffffffffffffffff',
        ],
      },
    };
    // We mint via the bridge so later when we burn estate contract try to mint lands
    const receipt = await (
      await estateContractAsMinter.mintEstate(other, [full24x24TileIn144v144])
    ).wait();
    const events = receipt.events.filter(
      (v: Event) => v.event === 'EstateBridgeMinted'
    );
    assert.equal(events.length, 1);
    const estateId = events[0].args['estateId'];

    expect(await landContractAsDeployer.exists(24, 144, 144)).to.be.false;
    await expect(
      estateContractAsOther.update(
        estateId,
        [[], [], []],
        [],
        [[24], [144], [144]]
      )
    )
      .to.emit(estateContractAsOther, 'EstateTokenBurned')
      .withArgs(estateId, other);

    expect(await estateContractAsBurner.exists(estateId)).to.be.false;
    expect(await landContractAsDeployer.exists(24, 144, 144)).to.be.true;
  });
});
