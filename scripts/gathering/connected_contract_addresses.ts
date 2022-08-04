import fs from 'fs-extra';
import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function () {
  const {ethers, network} = hre;

  const {transfers} = JSON.parse(
    fs.readFileSync('tmp/asset_regenerations.json').toString()
  );

  let toContracts: Record<string, string> = {};
  try {
    toContracts = JSON.parse(
      fs
        .readFileSync(`tmp/asset_owner_contracts_${network.name}.json`)
        .toString()
    );
  } catch (e) {
    //
  }

  let index = 0;
  for (const transfer of transfers) {
    const {to} = transfer;

    let recordedContract = toContracts[to];
    if (!recordedContract) {
      // console.log(`${index}: checking contract. ${to}..`);
      const codeAtTo = await ethers.provider.getCode(to);
      if (codeAtTo !== '0x') {
        // console.log(`contract at ${to}`);
        recordedContract = 'yes';
      } else {
        recordedContract = 'no';
      }
      toContracts[to] = recordedContract;
      console.log(index);
    }

    const toIsContract = recordedContract === 'yes';

    if (toIsContract) {
      console.log(`contract at ${to}`);
    }

    index++;
  }
  fs.ensureDirSync('tmp');
  fs.writeFileSync(
    `tmp/asset_owner_contracts_${network.name}.json`,
    JSON.stringify(toContracts, null, '  ')
  );
};
export default func;

if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
