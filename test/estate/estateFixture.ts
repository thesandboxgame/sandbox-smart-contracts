import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';

//import {EstateTestHelper} from './estateTestHelper';

//import {Contract} from 'ethers';

export const setupEstate = deployments.createFixture(async function () {
  await deployments.fixture([
    'MockLandWithMint',
    'PolygonAsset',
    'ChildGameToken',
    'GameMinter',
    'EstateTokenV1',
    'EstateMinter',
    'PolygonSand',
  ]);

  const {estateTokenFeeBeneficiary} = await getNamedAccounts();

  const others = await getUnnamedAccounts();
  const minter = others[4];
  const user0 = others[0];
  const user1 = others[1];

  const gameToken = await ethers.getContract('ChildGameToken');
  const gameMinter = await ethers.getContract('GameMinter');
  const estateContract = await ethers.getContract('EstateTokenV1');
  const estateMinter = await ethers.getContract('EstateMinter');
  const estateMinterContract = await ethers.getContract('EstateMinter');
  const landContract = await ethers.getContract('MockLandWithMint');
  const landContractAsUser0 = await landContract.connect(
    ethers.provider.getSigner(user0)
  );
  const landContractAsMinter = await landContract.connect(
    ethers.provider.getSigner(minter)
  );

  return {
    estateMinter,
    estateContract,
    estateMinterContract,
    landContract,
    landContractAsMinter,
    landContractAsUser0,
    minter,
    user0,
    user1,
    gameToken,
    gameMinter,
    estateTokenFeeBeneficiary,
  };
});
