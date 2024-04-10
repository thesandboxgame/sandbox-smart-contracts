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
      '@sandbox-smart-contracts/dn404/contracts/Benjamin404.sol:Benjamin404', 
    log: true,
    skipIfAlreadyDeployed: true,
    args: [
      "Benjamin",
      "BENJ",
      "0x",
      BigNumber.from(1).mul("1000000000000000").toString(),
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
      '@sandbox-smart-contracts/dn404/contracts/Simples404.sol:Simples404',
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
