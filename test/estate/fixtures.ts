import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {waitFor} from '../utils';
import {EstateTestHelper} from './estateTestHelper';

export const setupEstate = deployments.createFixture(async function () {
  await deployments.fixture(['EstateV1']);
  const others = await getUnnamedAccounts();
  const minter = others[4];
  const user0 = others[0];
  const user1 = others[2];
  const estateContract = await ethers.getContract('EstateV1', minter);
  const landContract = await ethers.getContract('Land');
  const landAdmin = await landContract.callStatic.getAdmin();
  const landContractAsMinter = await landContract.connect(
    ethers.provider.getSigner(minter)
  );
  await waitFor(
    landContract
      .connect(ethers.provider.getSigner(landAdmin))
      .setMinter(minter, true)
  );

  await waitFor(
    landContract
      .connect(ethers.provider.getSigner(landAdmin))
      .setSuperOperator(estateContract.address, true)
  );
  async function mintEstate(to: string, value: number) {
    // Estate to be minted
    // const creator = to;
    // const packId = ++id;
    // const hash = ipfsHashString;
    // const supply = value;
    // const rarity = 0;
    // const owner = to;
    // const data = '0x';
    // let receipt;
    // try {
    //   receipt = await waitFor(
    //     Estate.mint(creator, packId, hash, supply, rarity, owner, data)
    //   );
    // } catch (e) {
    //   console.log(e);
    // }
    // const event = receipt?.events?.filter(
    //   (event: Event) => event.event === 'TransferSingle'
    // )[0];
    // if (!event) {
    //   throw new Error('no TransferSingle event after mint single');
    // }
    // return event.args?.id;
  }

  return {
    estateContract,
    landContractAsMinter,
    minter,
    user0,
    user1,
    helper: new EstateTestHelper({
      Estate: estateContract,
      LandFromMinter: landContractAsMinter,
      Land: landContract,
    }),
  };
});
