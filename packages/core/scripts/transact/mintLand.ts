import {deployments, getNamedAccounts} from 'hardhat';

const {read, execute} = deployments;

const args = process.argv.slice(2);
const coordinateX = parseInt(args[0] || '167');
const coordinateY = parseInt(args[1] || '95');
const size = args[2] || 1;
const to = args[3] || '0xC9bAbb4B452Dd9f74476cE49ee197a1Af6E803ea';

void (async () => {
  const {landAdmin} = await getNamedAccounts();
  const x = coordinateX + 204;
  const y = coordinateY + 204;

  const ownerOld = await read('Land_Old', 'ownerOf', x + y * 408).catch(
    () => null
  );
  const ownerNew = await read('Land', 'ownerOf', x + y * 408).catch(() => null);

  if (ownerOld || ownerNew) {
    return console.log('land is already owned by someone');
  }
  const isMinter = await read('Land_Old', 'isMinter', landAdmin);
  if (!isMinter) {
    console.log(`setting land admin as minter`);
    await execute('Land_Old', {from: landAdmin}, 'setMinter', landAdmin, true);
  }
  console.log('Minting land...');
  await execute(
    'Land_Old',
    {from: landAdmin},
    'mintQuad',
    to,
    size,
    x,
    y,
    '0x'
  );
})();
