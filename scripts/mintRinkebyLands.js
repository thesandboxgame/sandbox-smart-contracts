module.exports = async ({getNamedAccounts, deployments}) => {
  const {read, execute, log} = deployments;
  const {deployer} = await getNamedAccounts();

  await deployments.get("Land");
  const currentLandAdmin = await read("Land", "getAdmin");

  let counter = 50;
  async function mintLandQuad() {
    await execute(
      "Land",
      {from: currentLandAdmin, skipUnknownSigner: true, gasLimit: 6000000},
      "mintQuad",
      deployer,
      1,
      counter,
      counter,
      "0x"
    );
    counter++;
  }

  for (let i = 0; i < 20; i++) {
    log(`Minting LAND quad ${counter}`);
    await mintLandQuad();
  }
};
