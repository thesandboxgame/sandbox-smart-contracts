import {Contract} from '@ethersproject/contracts';
import {ethers} from 'hardhat';
import {waitFor} from '../../scripts/utils/utils';
import {assert} from '../chai-setup';
const emptyBytes = Buffer.from('');

interface Quads {
  xs: number[];
  ys: number[];
  sizes: number[];
  selection: Quad[];
}

interface Quad {
  x: number;
  y: number;
  size: number;
  topCornerId?: number;
}

interface LandSpec {
  x: number;
  y: number;
  size: number;
}

interface Map {
  quads: Quad[];
  junctions: number[];
  selection?: number[];
}

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

  public static selectQuads(landQuads: Quad[], indices?: number[]): Quads {
    const xs = [];
    const ys = [];
    const sizes = [];
    const selection: Quad[] = [];
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

  public static assignIds(landQuads: Quad[]): Quad[] {
    for (const landQuad of landQuads) {
      landQuad.topCornerId = landQuad.x + landQuad.y * 408;
    }
    return landQuads;
  }

  async mintQuads(to: string, landSpecs: LandSpec[]): Promise<void> {
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

  async mintQuadsAndCreateEstate(
    map: Map,
    to: string
  ): Promise<{selection: Quad[]}> {
    const contracts = this.contracts;
    const landQuads = EstateTestHelper.assignIds(map.quads);
    await this.mintQuads(to, landQuads);
    const {xs, ys, sizes, selection} = EstateTestHelper.selectQuads(
      landQuads,
      map.selection as number[] | undefined
    );
    await contracts.Estate.connect(ethers.provider.getSigner(to))
      .functions.createFromMultipleQuads(to, to, sizes, xs, ys, map.junctions)
      .then((tx) => tx.wait());
    return {selection};
  }

  async checkLandOwnership(
    selection: Quad[],
    expectedOwner: string
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
