// import {BigNumber} from '@ethersproject/bignumber';
import fs from 'fs-extra';
import {ethers} from 'hardhat';
import {queryEvents} from '../utils/query-events';

const startBlock = 8835135;

void (async () => {
  const Sand = await ethers.getContract('Sand');
  const superOperatorEvents = await queryEvents(
    Sand,
    Sand.filters.SuperOperator(),
    startBlock
  );

  console.log('SUPER_OPERATORS', superOperatorEvents.length);

  // write to disk
  fs.ensureDirSync('tmp');
  fs.writeFileSync(
    'tmp/SAND_super_operator_events.json',
    JSON.stringify(superOperatorEvents, null, '  ')
  );
})();
