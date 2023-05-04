import inquirer from 'inquirer';

void (async () => {
  const answers = await inquirer.prompt([
    {type: 'confirm', name: 'continue', message: 'continue?'},
  ]);
  if (answers.continue) {
    console.log('continuing...');
  } else {
    console.log('stoping...');
    process.exit(0);
  }
})();
