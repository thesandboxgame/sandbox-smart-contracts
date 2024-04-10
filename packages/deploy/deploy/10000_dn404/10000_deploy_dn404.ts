import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {BigNumber} from '@ethersproject/bignumber';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin} = await getNamedAccounts();

  // string memory name_,
  // string memory symbol_,
  // bytes32 allowlistRoot_,
  // uint96 publicPrice_,
  // uint96 allowlistPrice_,
  // uint96 initialTokenSupply,
  // address initialSupplyOwner
  await deploy('TSBNFTMintDN404', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/dn404/contracts/NFTMintDN404.sol:NFTMintDN404', 
    log: true,
    skipIfAlreadyDeployed: true,
    args: [
      "Benjamin",
      "BENJ",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      BigNumber.from(1).mul("1000000000000000").toString(),
      BigNumber.from(5).mul("100000000000000").toString(),
      BigNumber.from(3000).mul("1000000000000000000").toString(),
      sandAdmin
    ],
  });

  // string memory name_,
  // string memory symbol_,
  // uint96 initialTokenSupply,
  // address initialSupplyOwner
  await deploy('TSBSimpleDN404', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/dn404/contracts/SimpleDN404.sol:SimpleDN404',
    log: true,
    skipIfAlreadyDeployed: true,
    args: [
      "Simples",
      "SIMP",
      BigNumber.from(5000).mul("1000000000000000000").toString(),
      sandAdmin
    ],
  });
};

func.tags = ['DN404', 'DN404_deploy'];

export default func;
