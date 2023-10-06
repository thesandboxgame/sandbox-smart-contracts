import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;

  let sandContractAddress;
  if (hre.network.name === 'polygon') {
    sandContractAddress = '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683';
  } else {
    // hre.network.name === 'mumbai'
    sandContractAddress = '0x592daadC9eA7F56A81De1FD27A723Bd407709c46';
  }

  // const sandContract = await get('PolygonSand');
  const minter = await read('Rabbids', 'allowedToExecuteMint');
  if (minter !== sandContractAddress) {
    const owner = await read('Rabbids', 'owner');
    await catchUnknownSigner(
      execute(
        'Rabbids',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContractAddress
      )
    );
  }
};

export default func;
func.tags = ['Rabbids', 'Rabbids_setup', 'Rabbids_setup_minter'];
// func.dependencies = ['PolygonSand_deploy', 'Rabbids_deploy'];
func.dependencies = ['Rabbids_deploy'];
