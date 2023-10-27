/*
  This script set the environment variables needed to run hardhat in a fork
  before executing it.
  See the testing section of the `README.md` file.
  Based on scripts.js in the core package!!!
 */
const path = require('path');
const {spawnSync} = require('child_process');
const dotenv = require('dotenv');

dotenv.config();
const myName = path.basename(__filename);
const expectedOptions = {
  blockNumber: 'string',
  'no-impersonation': 'boolean',
  'include-mocks': 'boolean',
  debug: 'boolean',
  skipFixtures: 'boolean',
};

function parseArgs() {
  const rawArgs = process.argv.slice(process.argv.indexOf(__filename) + 1);
  const [command, network, file] = rawArgs;
  const numFixedArgs = ['run', 'export', 'fork:run'].includes(command) ? 3 : 2;
  if (rawArgs.length < numFixedArgs) {
    throw new Error('missing argument');
  }
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
  return {command, network, file, options, extra, fixedArgs};
}

function usage() {
  console.log(
    `Usage: node ${myName} command network [ file ] ` +
      Object.keys(expectedOptions)
        .map(
          (x) =>
            `[ --${x} ${
              expectedOptions[x] === 'string' ? x.toUpperCase() : ''
            } ]`
        )
        .join(' ')
  );
  console.log('\tfile is only used in the run, export and fork:run commands');
  console.log(
    '\t--skip-test-deployments/ntd/--ntd is the default for this command, use --include-mocks if needed'
  );
}

function getEnv({command, network, options}) {
  const env = [];
  if (options.debug) {
    env.push(`DEBUG="*hardhat-deploy"`);
  }
  if (options.skipFixtures) {
    env.push(`HARDHAT_SKIP_FIXTURES=true"`);
  }

  // What follows only make sense on forked networks
  if (!command.includes('fork')) {
    return env;
  }
  if (options['include-mocks']) {
    env.push(`HARDHAT_FORK_INCLUDE_MOCKS=true`);
  }
  if (options.blockNumber) {
    env.push(`HARDHAT_FORK_NUMBER=${options.blockNumber}`);
  }
  if (options['no-impersonation']) {
    env.push(`HARDHAT_DEPLOY_NO_IMPERSONATION=true`);
  }
  env.push(
    `HARDHAT_DEPLOY_ACCOUNTS_NETWORK=${network}`,
    `HARDHAT_FORK=${network}`
  );
  return env;
}

async function main() {
  const args = parseArgs();
  const {network, file} = args;

  const env = getEnv(args).join(' ');
  const extraArgs = args.extra.join(' ');
  const commands = {
    run: `${env} HARDHAT_NETWORK=${network} ts-node --files ${file} ${extraArgs}`,
    deploy: `${env} hardhat --network ${network} deploy ${extraArgs}`,
    test: `${env} hardhat --network ${network} test ${extraArgs}`,
    export: `${env} hardhat --network ${network} export --export ${file}`,
    'fork:run': `${env} HARDHAT_NETWORK=${network} ts-node --files ${file} ${extraArgs}`,
    'fork:deploy': `${env} hardhat deploy ${extraArgs}`,
    'fork:test': `${env} HARDHAT_DEPLOY_FIXTURE=true HARDHAT_COMPILE=true hardhat test ${extraArgs}`,
    'fork:dev': `${env} hardhat node --watch --export contractsInfo.json ${extraArgs}`,
  };
  const cmd = commands[args.command];
  if (!cmd) {
    throw new Error(`invalid command ${args.command}`);
  }
  console.log(`${myName} executing:`, cmd);
  await spawnSync('yarn', ['cross-env', ...cmd.split(' ')], {
    stdio: 'inherit',
    shell: true,
  });
}

main().catch((err) => {
  console.error(err.toString());
  usage();
});
