module.exports = async ({getNamedAccounts, deployments}) => {
  const {read, execute} = deployments;
  const {deployer, catalystAdmin, catalystMinter} = await getNamedAccounts();

  const currentAdmin = await read("Catalyst", "getAdmin");

  // TODO get all enabled minter from event and remove right unless specified
  const isDeployerMinter = await read("Catalyst", "isMinter", deployer);
  if (isDeployerMinter) {
    await execute(
      "Catalyst",
      {from: currentAdmin, gas: 1000000, skipUnknownSigner: true, log: true},
      "setMinter",
      deployer,
      false
    );
  }

  const isCatalystMinter = await read("Catalyst", "isMinter", catalystMinter);
  if (!isCatalystMinter) {
    await execute(
      "Catalyst",
      {from: currentAdmin, gas: 1000000, skipUnknownSigner: true, log: true},
      "setMinter",
      catalystMinter,
      true
    );
  }

  if (currentAdmin.toLowerCase() !== catalystAdmin.toLowerCase()) {
    await execute(
      "Catalyst",
      {from: currentAdmin, gas: 1000000, skipUnknownSigner: true, log: true},
      "changeAdmin",
      catalystAdmin
    );
  }
};
