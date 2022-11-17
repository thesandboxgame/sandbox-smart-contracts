#!/usr/bin/env -S yarn ts-node --files
import {fetchData} from './util';
import hre, {ethers, getNamedAccounts} from 'hardhat';
import {Contract} from 'ethers';

async function get(
  batchContract: Contract,
  landContract: Contract,
  p: string[],
  idx: number
): Promise<string[]> {
  const ret: string[] = await batchContract.ownerOf(landContract.address, p);
  console.log('got', idx);
  return ret;
}

async function main() {
  const data = await fetchData();
  // Get current map
  const {mapDesigner} = await getNamedAccounts();
  // TODO: improve network => contract name
  const landContract = await ethers.getContract(
    ['mumbai', 'polygon'].some((x) => hre.network.name.includes(x))
      ? 'PolygonLand'
      : 'Land',
    mapDesigner
  );
  const batchContract = await ethers.getContract('BatchCall', mapDesigner);
  const ids = [];
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const id = (d.x + 204 + (d.y + 204) * 408).toString();
    ids.push(id);
  }

  const promises = [];
  for (let i = 0; i < ids.length; ) {
    const partial = [];
    for (let j = 0; j < 500 && i < ids.length; j++, i++) {
      partial.push(ids[i]);
    }
    console.log('calling get', i, partial.length);
    promises.push(get(batchContract, landContract, partial, i));
  }
  const results = await Promise.all(promises);
  const owners = [];
  for (const r of results) {
    owners.push(...r);
  }
  const balanceOfPremium: {[k: string]: number} = {};
  for (let i = 0; i < data.length; i++) {
    const o = owners[i];
    if (!balanceOfPremium[o]) balanceOfPremium[o] = 0;
    balanceOfPremium[o]++;
  }
  const ks = Object.keys(balanceOfPremium);
  ks.sort((a, b) => balanceOfPremium[b] - balanceOfPremium[a]);
  console.log('address', 'quantity');
  ks.forEach((x) => console.log(x, balanceOfPremium[x]));
}

main().catch((err) => console.error(err));
