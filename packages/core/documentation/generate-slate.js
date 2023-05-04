const fs = require("fs-extra");
const path = require("path");
const {spawn} = require("child_process");

const dir = path.resolve(__dirname, "..");
const source = `${dir}/slate-docs`;
const output = `${dir}/docs`;
fs.emptyDirSync(output);
command = `docker run -p 4567:4567 -v ${source}:/srv/slate/source -v ${output}:/srv/slate/build slate:latest bundle exec middleman build --clean`;

const splitCommand = command.split(" ");
const child = spawn(splitCommand[0], splitCommand.slice(1));

child.stdout.setEncoding("utf8");
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

child.on("close", (code) => {
  console.log(`child process exited with code ${code}`);
});
