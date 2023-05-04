import {deployments, getNamedAccounts} from 'hardhat';

const {read, execute, catchUnknownSigner} = deployments;

void (async () => {
  const {sandAdmin, sandboxAccount} = await getNamedAccounts();

  if (!(await read('OldGems', {}, 'isMinter', sandAdmin))) {
    console.log('SandAdmin is not a minter of OldGems');
    return;
  }
  if (!(await read('OldCatalysts', {}, 'isMinter', sandAdmin))) {
    console.log('SandAdmin is not a minter of OldCatalysts');
    return;
  }

  await catchUnknownSigner(
    execute(
      'OldGems',
      {from: sandAdmin},
      'batchMint',
      sandboxAccount,
      [0, 1, 2, 3, 4],
      [10000, 10000, 10000, 10000, 10000]
    )
  );
  await catchUnknownSigner(
    execute(
      'OldCatalysts',
      {from: sandAdmin},
      'batchMint',
      sandboxAccount,
      [0, 1, 2, 3],
      [1000, 1000, 1000, 1000]
    )
  );
})();
