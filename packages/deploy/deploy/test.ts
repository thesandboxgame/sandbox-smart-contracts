import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {ethers} = hre;

  console.log(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256'],
      ['0xB37d8F5d1fEab932f99b2dC8ABda5F413043400B', 0]
    )
  );
};
export default func;
func.tags = ['test_xsd2'];
