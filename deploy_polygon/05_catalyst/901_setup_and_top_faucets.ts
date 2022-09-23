import {BigNumber} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import catalysts from '../../data/catalysts';
import gems from '../../data/gems';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, get} = deployments;
  const {deployer, catalystAdmin} = await getNamedAccounts();
  const AttributesFaucets = await get('AttributesFaucets');
  const period = 60 * 60 * 24; // 1 day in seconds
  const limit = BigNumber.from('10000000000000000000'); // 10 ETH or 100e^18 WEI
  const topBalance = limit.mul(BigNumber.from(200)); // 200 claims of 10 ETH each
  const contractNames = [
    ...gems.map((gem) => `PolygonGem_${gem.symbol}`),
    ...catalysts.map((catalyst) => `PolygonCatalyst_${catalyst.symbol}`),
  ];
  for (const contractName of contractNames) {
    const Contract = await get(contractName);
    const hasFaucet = await read(
      'AttributesFaucets',
      'getFaucet',
      Contract.address
    );
    if (!hasFaucet) {
      await execute(
        'AttributesFaucets',
        {from: deployer, log: true},
        'addFaucet',
        Contract.address,
        period,
        limit
      );
    }
    const balance = await read(
      'AttributesFaucets',
      'getBalance',
      Contract.address
    );
    if (balance.lt(topBalance)) {
      await execute(
        contractName,
        {from: catalystAdmin, log: true},
        'mint',
        AttributesFaucets.address,
        topBalance.sub(balance)
      );
    }
  }
};

func.tags = ['AttributesFaucets', 'AttributesFaucets_setup'];
func.dependencies = [
  'AttributesFaucets_deploy',
  'PolygonCatalysts_deploy',
  'PolygonGems_deploy',
];
func.skip = skipUnlessTestnet;

export default func;
