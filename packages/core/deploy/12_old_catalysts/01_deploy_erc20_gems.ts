import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {execute, deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sand = await deployments.get('Sand');

  const gemGroup = await deploy('Gems', {
    contract: 'ERC20GroupGem',
    from: deployer,
    log: true,
    args: [
      sand.address, // metatx
      deployer,
      deployer,
    ],
    skipIfAlreadyDeployed: true,
  });
  async function addGems(names: string[]) {
    const gems = [];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const contractName = `${name}Gem`;
      const tokenSymbol = name.toUpperCase();
      const result = await deploy(contractName, {
        contract: 'ERC20SubToken',
        from: deployer,
        log: true,
        args: [
          gemGroup.address,
          i,
          `Sandbox's ${tokenSymbol} Gems`,
          tokenSymbol,
        ],
        skipIfAlreadyDeployed: true,
      });
      gems.push(result.address);
    }
    const contract = await ethers.getContract('Gems');
    const filter = contract.filters['SubToken']();
    const res = await contract.queryFilter(filter);
    if (res.length === 0) {
      return execute('Gems', {from: deployer}, 'addGems', gems);
    } else {
      console.log('Gems already setup');
    }
  }
  await addGems(['Power', 'Defense', 'Speed', 'Magic', 'Luck']);
};
export default func;
func.tags = ['OldGems', 'OldGems_deploy'];
func.dependencies = ['Sand'];
// comment to deploy old system
func.skip = skipUnlessTestnet; // not meant to be redeployed
