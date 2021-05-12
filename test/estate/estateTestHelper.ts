import {Contract} from '@ethersproject/contracts';
import {ethers} from 'hardhat';
import {waitFor} from '../../scripts/utils/utils';
import {assert} from '../chai-setup';
const emptyBytes = Buffer.from('');

export class EstateTestHelper {
  constructor(
    private contracts: {
      Estate: Contract;
      LandFromMinter: Contract;
      Land: Contract;
    }
  ) {
    this.contracts = contracts;
  }

  public static selectQuads(landQuads: string | any[], indices?: number[]) {
    const xs = [];
    const ys = [];
    const sizes = [];
    const selection = [];
    if (!indices) {
      indices = [];
      for (let i = 0; i < landQuads.length; i++) {
        indices.push(i);
      }
    }
    for (const index of indices) {
      const landQuad = landQuads[index];
      xs.push(landQuad.x);
      ys.push(landQuad.y);
      sizes.push(landQuad.size);
      selection.push(landQuad);
    }
    return {xs, ys, sizes, selection};
  }

  public static assignIds(landQuads: any) {
    for (const landQuad of landQuads) {
      landQuad.topCornerId = landQuad.x + landQuad.y * 408;
    }
    return landQuads;
  }

  public async mintQuads(to: any, landSpecs: any) {
    const contracts = this.contracts;
    for (const landSpec of landSpecs) {
      await waitFor(
        contracts.LandFromMinter.mintQuad(
          to,
          landSpec.size,
          landSpec.x,
          landSpec.y,
          emptyBytes
        )
      );
    }
  }

  public async mintQuadsAndCreateEstate(
    map: {quads: any; selection?: number[]; junctions: number[]},
    to: any
  ) {
    const contracts = this.contracts;
    const landQuads = EstateTestHelper.assignIds(map.quads);
    await this.mintQuads(to, landQuads);
    const {xs, ys, sizes, selection} = EstateTestHelper.selectQuads(
      landQuads,
      map.selection
    );
    await contracts.Estate.connect(ethers.provider.getSigner(to))
      .functions.createFromMultipleQuads(to, to, sizes, xs, ys, map.junctions)
      .then((tx) => tx.wait());
    return {selection};
  }

  public async checkLandOwnership(
    selection: any,
    expectedOwner: any
  ): Promise<void> {
    for (const landQuad of selection) {
      for (let sx = 0; sx < landQuad.size; sx++) {
        for (let sy = 0; sy < landQuad.size; sy++) {
          const id = landQuad.x + sx + (landQuad.y + sy) * 408;
          const landOwner = await this.contracts.Land.callStatic.ownerOf(id);
          assert.equal(landOwner, expectedOwner);
        }
      }
    }
  }
}
