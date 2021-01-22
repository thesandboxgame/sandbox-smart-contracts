import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sand = await deployments.get('Sand');

  const gemGroup = await deploy('OldGems', {
    contract: 'ERC20GroupGem',
    from: deployer,
    log: true,
    args: [
      sand.address, // metatx
      deployer,
      deployer,
    ],
  });
  async function addGems(names: string[]) {
    const gems = [];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const contractName = `Old_${name}Gem`;
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
      });
      gems.push(result.address);
    }
    return execute('OldGems', {from: deployer}, 'addGems', gems);
  }
  await addGems(['Power', 'Defense', 'Speed', 'Magic', 'Luck']);
};
export default func;
func.tags = ['OldGems', 'OldGems_deploy'];
func.dependencies = ['Sand'];
