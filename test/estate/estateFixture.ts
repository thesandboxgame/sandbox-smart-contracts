import {ethers, getNamedAccounts, getUnnamedAccounts,} from 'hardhat';
import {withSnapshot} from "../utils";


export const setupEstate = withSnapshot([
  'MockLandWithMint',
  'PolygonAsset',
  'ChildGameToken',
  'GameMinter',
  'EstateToken',
  'EstateMinter',
  'PolygonSand',
], async () => {

  const {estateTokenFeeBeneficiary, sandBeneficiary, gameTokenFeeBeneficiary} = await getNamedAccounts();

  // Game minter use Sand and we need Polygon Sand!!!
  const others = await getUnnamedAccounts();
  const minter = others[4];
  const user0 = others[0];
  const user1 = others[1];

  const gameToken = await ethers.getContract('ChildGameToken');
  const gameMinter = await ethers.getContract('GameMinter');
  const estateContract = await ethers.getContract('EstateToken');
  const estateMinter = await ethers.getContract('EstateMinter');
  const estateMinterContract = await ethers.getContract('EstateMinter');
  const landContract = await ethers.getContract('MockLandWithMint');
  const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
  // to be able to call deposit on sand with FakeChildChainManager
  const polygonSand = await ethers.getContract('PolygonSand');
  await childChainManager.setPolygonAsset(polygonSand.address);
  // GAME MINTER USE REGULAR Sand
  const sandContractAsUser0 = await ethers.getContract('Sand', user0);
  const sandContractAsBeneficiary = await ethers.getContract('Sand', sandBeneficiary);
  const landContractAsUser0 = await landContract.connect(
    ethers.provider.getSigner(user0)
  );
  const landContractAsMinter = await landContract.connect(
    ethers.provider.getSigner(minter)
  );

  return {
    sandContractAsUser0,
    sandContractAsBeneficiary,
    polygonSand,
    childChainManager,
    estateMinter,
    estateContract,
    estateMinterContract,
    landContract,
    landContractAsMinter,
    landContractAsUser0,
    gameTokenFeeBeneficiary,
    minter,
    user0,
    user1,
    gameToken,
    gameMinter,
    estateTokenFeeBeneficiary,
  };
});
