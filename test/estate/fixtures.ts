import {Event} from '@ethersproject/contracts';
import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';

import {waitFor, setupUsers} from '../utils';

export const setupEstate = deployments.createFixture(async function () {
  await deployments.fixture(['Estate']);
  // await asset_regenerate_and_distribute(hre);
  const others = await getUnnamedAccounts();
  const minter = others[0];
  others.splice(0, 1);

  const {assetBouncerAdmin} = await getNamedAccounts();
  const Estate = await ethers.getContract('Estate', minter);

  const users = await setupUsers(others, {Estate});

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
    Estate,
    users,
    mintEstate,
  };
});
