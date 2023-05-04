const {spawn} = require("child_process");

const command = `docker build https://github.com/slatedocs/slate.git -t slate:latest`;

const splitCommand = command.split(" ");
const child = spawn(splitCommand[0], splitCommand.slice(1));

child.stdout.setEncoding("utf8");
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

child.on("close", (code) => {
  console.log(`child process exited with code ${code}`);
});
