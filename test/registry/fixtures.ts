import hre, {ethers, getUnnamedAccounts} from 'hardhat';
import {withSnapshot} from '../utils';
import {expect} from '../chai-setup';
import {AddressZero} from '@ethersproject/constants';
import {BigNumber} from 'ethers';
import {BigNumberish} from 'ethers/lib.esm/ethers';
import {tileToArray} from '../map/fixtures';

export class TileWithCoords {
  private readonly data: BigNumber[];

  static init(x: BigNumberish, y: BigNumberish): TileWithCoords {
    return new TileWithCoords([
      0,
      BigNumber.from(x).div(24).shl(224),
      BigNumber.from(y).div(24).shl(224),
    ]);
  }

  static initFromBlockchain(coord: {
    tile: {data: BigNumberish[]};
  }): TileWithCoords {
    return new TileWithCoords(coord.tile.data);
  }

  constructor(data: BigNumberish[]) {
    this.data = data.map((x) => BigNumber.from(x));
  }

  set(x: number, y: number): void {
    if (x > 24 || y > 24) {
      throw new Error('Invalid coordinates');
    }
    const idx = Math.floor(y / 8);
    this.data[idx] = this.data[idx].or(BigNumber.from(1).shl(x + 24 * (y % 8)));
  }

  clear(x: number, y: number): void {
    if (x > 24 || y > 24) {
      throw new Error('Invalid coordinates');
    }
    const idx = Math.floor(y / 8);
    const bit = BigNumber.from(1).shl(x + 24 * (y % 8));
    const mask = BigNumber.from(1).shl(256).sub(1).sub(bit);
    this.data[idx] = this.data[idx].and(mask);
  }

  setRectangle(x: number, y: number, dx: number, dy: number): void {
    for (let i = 0; i < dx; i++) {
      for (let j = 0; j < dy; j++) {
        this.set(x + i, y + j);
      }
    }
  }

  clearRectangle(x: number, y: number, dx: number, dy: number): void {
    for (let i = 0; i < dx; i++) {
      for (let j = 0; j < dy; j++) {
        this.clear(x + i, y + j);
      }
    }
  }

  getData(): {tile: {data: BigNumber[]}} {
    return {
      tile: {data: this.data},
    };
  }

  equal(data: {tile: {data: BigNumber[]}}): boolean {
    if (this.data.length != data.tile.data.length) return false;

    for (let i = 0; i < this.data.length; i++) {
      if (!this.data[i].eq(data.tile.data[i])) return false;
    }
    return true;
  }

  getX(): BigNumber {
    return BigNumber.from(this.data[1]).shr(224);
  }

  getY(): BigNumber {
    return BigNumber.from(this.data[2]).shr(224);
  }

  getJsData(): {
    tile: boolean[][];
    x: BigNumber;
    y: BigNumber;
  } {
    return {
      tile: tileToArray(this.data),
      x: BigNumber.from(this.data[1]).shr(224),
      y: BigNumber.from(this.data[2]).shr(224),
    };
  }
}

export const deployPremiumLandRegistry = withSnapshot([], async () => {
  const {deployments, getNamedAccounts} = hre;
  const {
    deployer,
    upgradeAdmin,
    sandAdmin: adminUser,
    mapDesigner,
  } = await getNamedAccounts();
  const [other, other2] = await getUnnamedAccounts();

  const mapLib = await deployments.deploy('MapLib', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  const quadLib = await deployments.deploy('QuadLib', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  await deployments.deploy('MockLandWithMint', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    libraries: {
      MapLib: mapLib.address,
      QuadLib: quadLib.address,
    },
  });
  const landContractAsDeployer = await ethers.getContract(
    'MockLandWithMint',
    deployer
  );
  await deployments.deploy('PremiumLandRegistry', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    contract: 'PremiumLandRegistry',
    libraries: {
      MapLib: mapLib.address,
    },
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'PremiumLandRegistry_init',
        args: [adminUser, landContractAsDeployer.address],
      },
      upgradeIndex: 0,
    },
  });
  const contractAsAdmin = await ethers.getContract(
    'PremiumLandRegistry',
    adminUser
  );
  const contractAsMapDesigner = await ethers.getContract(
    'PremiumLandRegistry',
    mapDesigner
  );
  const contractAsOther = await ethers.getContract(
    'PremiumLandRegistry',
    other
  );
  const landContractAsOther = await ethers.getContract(
    'MockLandWithMint',
    other
  );
  const landContractAsOther2 = await ethers.getContract(
    'MockLandWithMint',
    other2
  );

  const MAP_DESIGNER_ROLE = await contractAsAdmin.MAP_DESIGNER_ROLE();
  contractAsAdmin.grantRole(MAP_DESIGNER_ROLE, mapDesigner);
  await landContractAsDeployer.setAdmin(deployer);

  await deployments.deploy('TestERC721Receiver', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });
  const erc721Receiver = await ethers.getContract(
    'TestERC721Receiver',
    deployer
  );

  return {
    adminUser,
    other,
    other2,
    mapDesigner,
    contractAsAdmin,
    contractAsMapDesigner,
    contractAsOther,
    landContractAsDeployer,
    landContractAsOther,
    landContractAsOther2,
    MAP_DESIGNER_ROLE,
    erc721Receiver,
  };
});

export async function setupPremiumLandRegistry(): Promise<
  ReturnType<typeof deployPremiumLandRegistry>
> {
  const fixtures = await deployPremiumLandRegistry();
  const {landContractAsDeployer, contractAsAdmin} = fixtures;
  await landContractAsDeployer.setPremiumRegistry(contractAsAdmin.address);
  return fixtures;
}

export async function setupPremiumLandRegistryForBalance(): Promise<
  ReturnType<typeof setupPremiumLandRegistry>
> {
  const fixtures = await setupPremiumLandRegistry();
  const {
    contractAsMapDesigner: registry,
    landContractAsOther: land,
    other,
    other2,
  } = fixtures;
  await registry.set(0, 0, 12);
  await registry.set(24, 24, 12);
  await land.mintQuad(other, 3, 0, 0, []);
  expect(await registry.totalPremium()).to.be.equal(2 * 12 * 12);
  expect(await land.getPremiumBalance(AddressZero)).to.be.equal(
    2 * 12 * 12 - 3 * 3
  );
  expect(await land.getPremiumBalance(other)).to.be.equal(3 * 3);
  expect(await land.getPremiumBalance(other2)).to.be.equal(0);
  return fixtures;
}
