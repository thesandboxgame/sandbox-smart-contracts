module.exports = async ({getNamedAccounts, deployments}) => {
  const {read, execute} = deployments;
  const {deployer, gemAdmin, gemMinter} = await getNamedAccounts();

  const currentAdmin = await read("Gem", "getAdmin");

  // TODO get all enabled minter from event and remove right unless specified
  const isDeployerMinter = await read("Gem", "isMinter", deployer);
  if (isDeployerMinter) {
    await execute(
      "Gem",
      {from: currentAdmin, gas: 1000000, skipUnknownSigner: true, log: true},
      "setMinter",
      deployer,
      false
    );
  }

  const isGemMinter = await read("Gem", "isMinter", gemMinter);
  if (!isGemMinter) {
    await execute(
      "Gem",
      {from: currentAdmin, gas: 1000000, skipUnknownSigner: true, log: true},
      "setMinter",
      gemMinter,
      true
    );
  }

  if (currentAdmin.toLowerCase() !== gemAdmin.toLowerCase()) {
    await execute(
      "Gem",
      {from: currentAdmin, gas: 1000000, skipUnknownSigner: true, log: true},
      "changeAdmin",
      gemAdmin
    );
  }
};
