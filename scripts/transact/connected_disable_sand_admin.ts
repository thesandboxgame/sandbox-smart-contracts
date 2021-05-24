import {deployments, getNamedAccounts} from 'hardhat';
import {AddressZero} from '@ethersproject/constants';

async function main() {
  const {sandAdmin} = await getNamedAccounts();
  const {read, catchUnknownSigner, execute} = deployments;

  const currentAdmin = await read('Sand', 'getAdmin');
  if (currentAdmin !== AddressZero) {
    await catchUnknownSigner(
      execute('Sand', {from: sandAdmin}, 'changeAdmin', AddressZero)
    );
  }
}

main().catch((e) => console.error(e));
