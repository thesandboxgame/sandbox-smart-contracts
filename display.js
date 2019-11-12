const rocketh = require('rocketh');
const deployments = rocketh.deployments();
for (const name of Object.keys(deployments)) {
    const deploymentInfo = deployments[name];
    const address = deploymentInfo.address;
    console.log('CONTRACT ' + name + ' DEPLOYED AT : ' + address);
}
