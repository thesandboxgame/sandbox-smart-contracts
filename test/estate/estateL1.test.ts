import {setupL1EstateAndLand} from './fixtures';
import {assert, expect} from '../chai-setup';
import {Event} from '@ethersproject/contracts';
import {getFullTile, tileWithCoordToJS} from '../map/fixtures';
import {BigNumber} from 'ethers';

describe('EstateTokenV1 tests for L1', function () {
  describe('update', function () {
    it('update an estate', async function () {
      const {
        other,
        estateContractAsOther,
        mintQuad,
        mintApproveAndCreateAsOther,
        chainIndex,
      } = await setupL1EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);

      await mintQuad(other, 24, 144, 144);

      const nextId = BigNumber.from(await estateContractAsOther.getNextId());

      const receipt = await (
        await estateContractAsOther.update(
          estateId,
          [[24], [144], [144]],
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
    it('should fail if there is nothing to update', async function () {
      const {
        estateContractAsOther,
        mintApproveAndCreateAsOther,
      } = await setupL1EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);

      await expect(
        estateContractAsOther.update(estateId, [[], [], []], [[], [], []])
      ).to.revertedWith('nothing to update');
    });
    it('should fail if not owner', async function () {
      const {
        other,
        estateContractAsDeployer,
        mintQuad,
        mintApproveAndCreateAsOther,
      } = await setupL1EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      await mintQuad(other, 24, 144, 144);

      await expect(
        estateContractAsDeployer.update(
          estateId,
          [[24], [144], [144]],
          [[24], [48], [96]]
        )
      ).to.revertedWith('caller is not owner nor approved');
    });
    it('should burn the estate end up empty', async function () {
      const {
        other,
        estateContractAsOther,
        mintApproveAndCreateAsOther,
      } = await setupL1EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      await expect(
        estateContractAsOther.update(estateId, [[], [], []], [[24], [48], [96]])
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
      } = await setupL1EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);

      await mintQuad(other, 24, 144, 144);
      await expect(
        estateContractAsOther.update(
          estateId,
          [[24], [144], [144]],
          [[], [], []]
        )
      ).to.revertedWith('not adjacent');
    });
    it('should fail to remove if quads are invalid', async function () {
      const {
        estateContractAsOther,
        mintApproveAndCreateAsOther,
      } = await setupL1EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      await expect(
        estateContractAsOther.update(estateId, [[], [], []], [[24], [48], []])
      ).to.revertedWith('invalid remove data');
    });
    it('should fail to remove if quads are missing', async function () {
      const {
        estateContractAsOther,
        mintApproveAndCreateAsOther,
      } = await setupL1EstateAndLand();
      const {estateId} = await mintApproveAndCreateAsOther(24, 48, 96);
      await expect(
        estateContractAsOther.update(estateId, [[], [], []], [[24], [96], [96]])
      ).to.revertedWith('quad missing');
    });
  });
  it('check contractURI', async function () {
    const {
      estateContractAsOther,
      estateContractAsAdmin,
    } = await setupL1EstateAndLand();
    expect(await estateContractAsOther.contractURI()).to.be.equal('');
    const uri = 'https://bla/';
    await estateContractAsAdmin.setBaseURI(uri);
    expect(await estateContractAsOther.contractURI()).to.be.equal(
      uri + 'estate.json'
    );
  });
});
