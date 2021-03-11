import {DeployFunction} from 'hardhat-deploy/types';
import {BigNumber} from '@ethersproject/bignumber';
import {parseEther} from '@ethersproject/units';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read, execute, catchUnknownSigner} = deployments;

  const {deployer, catalystMinterAdmin} = await getNamedAccounts();

  const registry = await deployments.get('CatalystRegistry');
  const sand = await deployments.get('Sand');
  const asset = await deployments.get('Asset');
  const gem = await deployments.get('Gem');
  const catalyst = await deployments.get('Catalyst');

  const bakedMintData = [];
  for (let i = 0; i < 4; i++) {
    const mintData = await read('Catalyst', 'getMintData', i);
    const maxGems = BigNumber.from(mintData.maxGems).mul(
      BigNumber.from(2).pow(240)
    );
    const mintDataMinQuantity = 1;
    const minQuantity = BigNumber.from(mintDataMinQuantity).mul(
      BigNumber.from(2).pow(224)
    );
    const mintDataMaxQuantity = 65535;
    const maxQuantity = BigNumber.from(mintDataMaxQuantity).mul(
      BigNumber.from(2).pow(208)
    );
    const sandMintingFee = BigNumber.from(mintData.sandMintingFee).mul(
      BigNumber.from(2).pow(120)
    );
    const sandUpdateFee = BigNumber.from(mintData.sandUpdateFee);
    const bakedData = sandUpdateFee
      .add(sandMintingFee)
      .add(maxGems)
      .add(minQuantity)
      .add(maxQuantity);
    bakedMintData.push(bakedData);
  }

  const catalystMinter = await deploy('SandboxMinter', {
    contract: 'CatalystMinter',
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [
      registry.address,
      sand.address,
      asset.address,
      gem.address,
      sand.address,
      catalystMinterAdmin,
      '0x0000000000000000000000000000000000000000', // TODO SAND : mintingFeeCollector
      parseEther('1'), //TODO SAND : confirm
      catalyst.address,
      bakedMintData,
    ],
  });

  const isBouncer = await read('Asset', 'isBouncer', catalystMinter.address);
  if (!isBouncer) {
    console.log('setting SandboxMinter as Asset bouncer');
    const currentBouncerAdmin = await read('Asset', 'getBouncerAdmin');
    await catchUnknownSigner(
      execute(
        'Asset',
        {from: currentBouncerAdmin, log: true},
        'setBouncer',
        catalystMinter.address,
        true
      )
    );
  }

  const currentMinter = await read('CatalystRegistry', 'getMinter');
  if (currentMinter.toLowerCase() != catalystMinter.address.toLowerCase()) {
    console.log('setting SandboxMinter as CatalystRegistry minter');
    const currentRegistryAdmin = await read('CatalystRegistry', 'getAdmin');
    await catchUnknownSigner(
      execute(
        'CatalystRegistry',
        {from: currentRegistryAdmin, log: true},
        'setMinter',
        catalystMinter.address
      )
    );
  }

  async function setSuperOperatorFor(contractName: string, address: string) {
    const isSuperOperator = await read(
      contractName,
      'isSuperOperator',
      address
    );
    if (!isSuperOperator) {
      console.log(
        'setting SandboxMinter as super operator for ' + contractName
      );
      const currentSandAdmin = await read(contractName, 'getAdmin');
      await catchUnknownSigner(
        execute(
          contractName,
          {from: currentSandAdmin, log: true},
          'setSuperOperator',
          address,
          true
        )
      );
    }
  }

  await setSuperOperatorFor('Sand', catalystMinter.address);
  await setSuperOperatorFor('Gem', catalystMinter.address);
  await setSuperOperatorFor('Asset', catalystMinter.address);
  await setSuperOperatorFor(`Catalyst`, catalystMinter.address);
};
export default func;
func.tags = ['SandboxMinter', 'SandboxMinter_setup', 'SandboxMinter_deploy'];
func.dependencies = [
  'Sand_deploy',
  'Asset_deploy',
  // 'Gems_deploy', // old Gem is assumed to be deployed
  // 'Catalysts_deploy', // old Catalyst is assumed to be deployed
  // 'CatalystRegistry_deploy', // old CatalystRegistry is assumed to be deployed
];
func.skip = async (hre) => hre.network.name === 'hardhat'; // skip running in test as this is not to be used, require putting the whole Gem/Catalyst deployment back
