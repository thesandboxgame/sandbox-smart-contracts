const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

module.exports.setupStarterPack = deployments.createFixture(async () => {
  const {deployer, starterPackAdmin, starterPackSaleBeneficiary, others} = await getNamedAccounts();
  await deployments.fixture();

  const sandContract = await ethers.getContract("Sand");
  const medianizerContract = await ethers.getContract("DAIMedianizer");
  const daiContract = await ethers.getContract("DAI");
  const starterPackContract = await ethers.getContract("StarterPackV1");

  const starterPackContractAsDeployer = await ethers.getContract("StarterPackV1", deployer);
  const starterPackContractAsAdmin = await ethers.getContract("StarterPackV1", starterPackAdmin);
  const starterPackContractAsBeneficiary = await ethers.getContract("StarterPackV1", starterPackSaleBeneficiary);

  const users = [];
  for (const other of others) {
    users.push({
      address: other,
      StarterPack: starterPackContract.connect(starterPackContract.provider.getSigner(other)),
      Sand: sandContract.connect(sandContract.provider.getSigner(other)),
      Dai: daiContract.connect(daiContract.provider.getSigner(other)),
    });
  }

  return {
    starterPackContract,
    starterPackContractAsDeployer,
    starterPackContractAsAdmin,
    starterPackContractAsBeneficiary,
    sandContract,
    medianizerContract,
    daiContract,
    users,
  };
});
