import {deployments, getNamedAccounts} from 'hardhat';
import sandSuperOperators from '../../data/sand_super_operators_to_keep.json';

type SuperOperators = {[address: string]: {keep: boolean; name: string}};

async function main() {
  const {sandAdmin} = await getNamedAccounts();
  const {read, catchUnknownSigner, execute} = deployments;

  const superOperators = sandSuperOperators as SuperOperators;
  for (const superOperatorAddress of Object.keys(superOperators)) {
    const superOperator = superOperators[superOperatorAddress];
    if (!superOperator.keep) {
      const isSuperOperator = await read(
        'Sand',
        'isSuperOperator',
        superOperatorAddress
      );
      if (isSuperOperator) {
        await catchUnknownSigner(
          execute(
            'Sand',
            {from: sandAdmin},
            'setSuperOperator',
            superOperatorAddress,
            false
          )
        );
      }
    }
  }
}

main().catch((e) => console.error(e));
