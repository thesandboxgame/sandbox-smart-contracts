import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {BigNumber} from '@ethersproject/bignumber';
import {parseEther} from '@ethersproject/units';

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, log, read, execute} = deployments;

  const {deployer, catalystMinterAdmin} = await getNamedAccounts();

  const registry = await deployments.get('CatalystRegistry');
  const sand = await deployments.get('Sand');
  const asset = await deployments.get('Asset');
  const gem = await deployments.get('Gems');
  const catalyst = await deployments.get('Catalysts');

  const bakedMintData = [];
  for (let i = 0; i < 4; i++) {
    const mintData = await read('Catalysts', 'getMintData', i);
    const maxGems = BigNumber.from(mintData.maxGems).mul(
      BigNumber.from(2).pow(240)
    );
    const minQuantity = BigNumber.from(mintData.minQuantity).mul(
      BigNumber.from(2).pow(224)
    );
    const maxQuantity = BigNumber.from(mintData.maxQuantity).mul(
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

  const catalystMinter = await deploy('CatalystMinter', {
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

  const currentMinter = await read('CatalystRegistry', 'getMinter');
  if (currentMinter.toLowerCase() != catalystMinter.address.toLowerCase()) {
    log('setting CatalystMinter as CatalystRegistry minter');
    const currentRegistryAdmin = await read('CatalystRegistry', 'getAdmin');
    await execute(
      'CatalystRegistry',
      {from: currentRegistryAdmin},
      'setMinter',
      catalystMinter.address
    );
  }

  const isBouncer = await read('Asset', 'isBouncer', catalystMinter.address);
  if (!isBouncer) {
    log('setting CatalystMinter as Asset bouncer');
    const currentBouncerAdmin = await read('Asset', 'getBouncerAdmin');
    await execute(
      'Asset',
      {from: currentBouncerAdmin},
      'setBouncer',
      catalystMinter.address,
      true
    );
  }

  async function setSuperOperatorFor(contractName: string, address: string) {
    const isSuperOperator = await read(
      contractName,
      'isSuperOperator',
      address
    );
    if (!isSuperOperator) {
      log('setting CatalystMinter as super operator for ' + contractName);
      const currentSandAdmin = await read(contractName, 'getAdmin');
      await execute(
        contractName,
        {from: currentSandAdmin},
        'setSuperOperator',
        address,
        true
      );
    }
  }

  await setSuperOperatorFor('Sand', catalystMinter.address);
  await setSuperOperatorFor('Gems', catalystMinter.address);
  await setSuperOperatorFor('Asset', catalystMinter.address);
  await setSuperOperatorFor(`Catalysts`, catalystMinter.address);
};
export default func;
if (require.main === module) {
  func(hre);
}
