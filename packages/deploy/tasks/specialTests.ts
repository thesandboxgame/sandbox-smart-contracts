import {task} from 'hardhat/config';
import {TASK_TEST} from 'hardhat/builtin-tasks/task-names';
import path from 'path';

task(TASK_TEST)
  .addFlag('runtime', 'run runtime tests')
  .addFlag('integration', 'run integration tests')
  .setAction(async (args, {config}, runSuper) => {
    if (args.runtime) {
      config.paths.tests = path.resolve(config.paths.root, 'runtime_test');
    } else if (args.integration) {
      config.paths.tests = path.resolve(config.paths.root, 'integration_test');
    }
    return await runSuper(args);
  });
