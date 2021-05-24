import fs from 'fs-extra';

const superOperatorEvents = JSON.parse(
  fs.readFileSync('tmp/SAND_super_operator_events.json').toString()
);

const currentSuperOperators: {[address: string]: boolean} = {};
for (const superoperatorEvent of superOperatorEvents) {
  if (superoperatorEvent.args[1]) {
    currentSuperOperators[superoperatorEvent.args[0]] = true;
  } else {
    delete currentSuperOperators[superoperatorEvent.args[0]];
  }
}

console.log(Object.keys(currentSuperOperators));
