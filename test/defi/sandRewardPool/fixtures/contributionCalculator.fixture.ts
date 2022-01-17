import {getUnnamedAccounts} from 'hardhat';
import {withSnapshot} from '../../../utils';

export const landContributionCalculatorSetup = withSnapshot([], async function (
  hre
) {
  const contractName = 'LandContributionCalculator';
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deployer} = await getNamedAccounts();
  const [admin, other] = await getUnnamedAccounts();

  await deployments.deploy('LandToken', {
    from: deployer,
    contract: 'ERC721Mintable',
    args: ['LandToken', 'LTK'],
  });

  const landToken = await ethers.getContract('LandToken', deployer);

  await deployments.deploy(contractName, {
    from: deployer,
    args: [landToken.address],
  });
  const contract = await ethers.getContract(contractName, deployer);
  await contract.transferOwnership(admin);
  const contractAsAdmin = await ethers.getContract(contractName, admin);
  const contractAsOther = await ethers.getContract(contractName, other);
  return {
    contract,
    contractAsAdmin,
    contractAsOther,
    landToken,
    deployer,
    admin,
    other,
  };
});

export const landOwnerContributionCalculatorSetup = withSnapshot(
  [],
  async function (hre) {
    const contractName = 'LandOwnersAloneContributionCalculator';
    const {deployments, getNamedAccounts, ethers} = hre;
    const {deployer} = await getNamedAccounts();
    const [admin, other] = await getUnnamedAccounts();

    await deployments.deploy('LandToken', {
      from: deployer,
      contract: 'ERC721Mintable',
      args: ['LandToken', 'LTK'],
    });

    const landToken = await ethers.getContract('LandToken', deployer);

    await deployments.deploy(contractName, {
      from: deployer,
      args: [landToken.address],
    });
    const contract = await ethers.getContract(contractName, deployer);
    await contract.transferOwnership(admin);
    const contractAsAdmin = await ethers.getContract(contractName, admin);
    const contractAsOther = await ethers.getContract(contractName, other);
    return {
      contract,
      contractAsAdmin,
      contractAsOther,
      landToken,
      deployer,
      admin,
      other,
    };
  }
);
