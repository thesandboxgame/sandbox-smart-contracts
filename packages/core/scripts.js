const {spawnSync} = require('child_process');
const dotenv = require('dotenv');
const rawArgs = process.argv.slice(2);

dotenv.config();

function parseArgs(numFixedArgs, expectedOptions) {
  const fixedArgs = [];
  const options = {};
  const extra = [];
  const alreadyCounted = {};
  for (let i = 0; i < rawArgs.length; i++) {
    const rawArg = rawArgs[i];
    if (rawArg.startsWith('--')) {
      const optionName = rawArg.slice(2);
      const optionDetected = expectedOptions[optionName];
      if (!alreadyCounted[optionName] && optionDetected) {
        alreadyCounted[optionName] = true;
        if (optionDetected === 'boolean') {
          options[optionName] = true;
        } else {
          i++;
          options[optionName] = rawArgs[i];
        }
        continue;
      }
    }
    if (fixedArgs.length < numFixedArgs) {
      if (Object.keys(alreadyCounted).length) {
        throw new Error(
          `expected ${numFixedArgs} fixed args, got only ${fixedArgs.length}`
        );
      }
      fixedArgs.push(rawArg);
    } else {
      extra.push(rawArg);
    }
  }
  return {options, extra, fixedArgs};
}

function execute(command) {
  return spawnSync(command.split(' ')[0], command.split(' ').slice(1), {
    stdio: 'inherit',
    shell: true,
  });
}

void (async () => {
  const [command, network, file] = rawArgs;
  const {options, extra} = parseArgs(getFixedArgsCount(command), {
    blockNumber: 'string',
    'no-impersonation': 'boolean',
    'skip-test-deployments': 'boolean',
    ntd: 'boolean',
  });
  const crossEnv = command.includes('fork')
    ? getForkCrossEnv({network, options, extra})
    : getCrossEnv({options, extra});
  const extraArgs = extra.join(' ');
  switch (command) {
    case 'run':
      await execute(
        `${crossEnv} HARDHAT_NETWORK=${network} ts-node --files ${file} ${extraArgs}`
      );
      break;
    case 'deploy':
      await execute(
        `${crossEnv} hardhat --network ${network} deploy ${extraArgs}`
      );
      break;
    case 'export':
      await execute(
        `${crossEnv} hardhat --network ${network} export --export ${file}`
      );
      break;
    case 'fork:run':
      await execute(`${crossEnv} ts-node --files ${file} ${extraArgs}`);
      break;
    case 'fork:deploy':
      await execute(`${crossEnv} hardhat deploy ${extraArgs}`);
      break;
    case 'fork:test':
      await execute(
        `${crossEnv} HARDHAT_DEPLOY_FIXTURE=true HARDHAT_COMPILE=true mocha --bail --recursive test ${extraArgs}`
      );
      break;
    case 'fork:dev':
      await execute(
        `${crossEnv} hardhat node --watch --export contractsInfo.json ${extraArgs}`
      );
      break;
  }
})();

function getFixedArgsCount(command) {
  return ['run', 'export', 'fork:run'].includes(command) ? 3 : 2;
}

function getCrossEnv({options, extra}) {
  const env = [];
  if (options.blockNumber)
    env.push(`HARDHAT_FORK_NUMBER=${options.blockNumber}`);
  if (options['no-impersonation'])
    env.push(`HARDHAT_DEPLOY_NO_IMPERSONATION=true`);
  if (options['skip-test-deployments'] || options.ntd) {
    env.push(`SKIP_TEST_DEPLOYMENTS=true`);
    ['--skip-test-deployments', '--ntd'].forEach((key) => {
      if (extra.includes(key))
        extra.slice(
          extra.findIndex((e) => e === key),
          1
        );
    });
  }
  return `cross-env ${env.join(' ')}`;
}

function getForkCrossEnv({network, options, extra}) {
  const env = [
    `HARDHAT_DEPLOY_ACCOUNTS_NETWORK=${network}`,
    `HARDHAT_FORK=${network}`,
  ];
  return `${getCrossEnv({options, extra})} ${env.join(' ')}`;
}
