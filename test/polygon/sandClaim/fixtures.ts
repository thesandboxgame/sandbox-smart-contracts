import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {Contract} from 'ethers';
import {withSnapshot} from '../../utils';
import {waitFor} from '../../utils';
import {BigNumber} from '@ethersproject/bignumber';

export const setupPolygonSandClaim = withSnapshot(['PolygonSand'], async () => {
  const {deployer, sandAdmin} = await getNamedAccounts();
  const polygonSand: Contract = await ethers.getContract('PolygonSand');
  await deployments.deploy(`FakePolygonSand`, {
    contract: 'FakePolygonSand',
    from: deployer,
    log: true,
  });

  const fakePolygonSand: Contract = await ethers.getContract('FakePolygonSand');

  await deployments.deploy(`PolygonSandClaim`, {
    contract: 'PolygonSandClaim',
    from: deployer,
    log: true,
    args: [polygonSand.address, fakePolygonSand.address],
  });

  const polygonSandClaim: Contract = await ethers.getContract(
    'PolygonSandClaim'
  );

  const fakeSandTotal = await fakePolygonSand.totalSupply();
  await waitFor(
    fakePolygonSand
      .connect(ethers.provider.getSigner(deployer))
      .transfer(sandAdmin, fakeSandTotal.div(BigNumber.from('2')))
  );

  await waitFor(
    fakePolygonSand
      .connect(ethers.provider.getSigner(sandAdmin))
      .approve(polygonSandClaim.address, fakeSandTotal.div(BigNumber.from('2')))
  );

  await waitFor(
    polygonSand
      .connect(ethers.provider.getSigner(deployer))
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
});
