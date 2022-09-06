import {ethers, getNamedAccounts} from 'hardhat';
import {Contract} from 'ethers';
import {withSnapshot} from '../../utils';
import {waitFor} from '../../utils';
import {BigNumber} from '@ethersproject/bignumber';

export const setupPolygonSandClaim = withSnapshot(
  ['PolygonSand', 'PolygonSandClaim', 'FAKE_POLYGON_SAND'],
  async () => {
    const {deployer, sandAdmin} = await getNamedAccounts();
    const polygonSand: Contract = await ethers.getContract('PolygonSand');
    const fakePolygonSand: Contract = await ethers.getContract(
      'FAKE_POLYGON_SAND'
    );
    const polygonSandClaim = await ethers.getContract('PolygonSandClaim');

    const fakeSandTotal = await fakePolygonSand.totalSupply();
    await waitFor(
      fakePolygonSand
        .connect(ethers.provider.getSigner(deployer))
        .transfer(sandAdmin, fakeSandTotal.div(BigNumber.from('2')))
    );

    await waitFor(
      fakePolygonSand
        .connect(ethers.provider.getSigner(sandAdmin))
        .approve(
          polygonSandClaim.address,
          fakeSandTotal.div(BigNumber.from('2'))
        )
    );

    await waitFor(
      polygonSand
        .connect(ethers.provider.getSigner(await polygonSand.getAdmin()))
        .updateChildChainManager(deployer)
    );

    const abiCoder = ethers.utils.defaultAbiCoder;
    const encodedAmount = abiCoder.encode(
      ['uint256'],
      [fakeSandTotal.toString()]
    );
    await waitFor(
      polygonSand
        .connect(ethers.provider.getSigner(deployer))
        .deposit(polygonSandClaim.address, encodedAmount)
    );

    return {
      deployer,
      sandAdmin,
      polygonSand,
      fakePolygonSand,
      polygonSandClaim,
    };
  }
);
