import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';

const {read, execute, deploy} = deployments;
import {Event} from '@ethersproject/contracts';

import {setupUsers, waitFor} from '../../utils';

import {Contract} from 'ethers';
import catalysts from '../../../data/catalysts';
import gems from '../../../data/gems';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const assetFixtures = async function () {
  // await asset_regenerate_and_distribute(hre);
  const unnamedAccounts = await getUnnamedAccounts();
  const otherAccounts = [...unnamedAccounts];
  const minter = otherAccounts[0];
  otherAccounts.splice(0, 1);

  const {assetBouncerAdmin} = await getNamedAccounts();

  const assetContractAsBouncerAdmin = await ethers.getContract(
    'Asset',
    assetBouncerAdmin
  );
  await waitFor(assetContractAsBouncerAdmin.setBouncer(minter, true));
  const Asset = await ethers.getContract('Asset', minter);
  const predicate = await ethers.getContract('ERC1155_PREDICATE');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const trustedForwarder = await ethers.getContractAt(
    'TestMetaTxForwarder',
    TRUSTED_FORWARDER.address
  );

  // Set predicate Asset
  try {
    await waitFor(predicate.setAsset(Asset.address));
  } catch (e) {
    console.log(e);
  }

  let id = 0;
  const ipfsHashString =
    '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

  async function mintAsset(to: string, value: number, hash = ipfsHashString) {
    // Asset to be minted
    const creator = to;
    const packId = ++id;
    const supply = value;
    const rarity = 0;
    const owner = to;
    const data = '0x';

    let receipt;
    try {
      receipt = await waitFor(
        Asset.mint(creator, packId, hash, supply, rarity, owner, data)
      );
    } catch (e) {
      console.log(e);
    }

    const event = receipt?.events?.filter(
      (event: Event) => event.event === 'TransferSingle'
    )[0];
    if (!event) {
      throw new Error('no TransferSingle event after mint single');
    }
    return event.args?.id;
  }

  async function mintMultiple(
    to: string,
    supplies: number[],
    hash = ipfsHashString
  ): Promise<number[]> {
    const creator = to;
    const packId = ++id;
    const rarity = 0;
    const owner = to;
    const data = '0x';

    const tx = await Asset.mintMultiple(
      creator,
      packId,
      hash,
      supplies,
      rarity,
      owner,
      data
    );
    const receipt = await tx.wait();

    return receipt.events.find((v: Event) => v.event === 'TransferBatch')
      .args[3];
  }

  const users = await setupUsers(otherAccounts, {Asset});

  return {
    Asset,
    users,
    mintAsset,
    mintMultiple,
    trustedForwarder,
    predicate,
  };
};

export const gemsAndCatalystsFixture = async function (
  isSetupForL2: boolean
): Promise<Contract> {
  const {
    assetAttributesRegistryAdmin,
    gemMinter,
    deployer,
    catalystAdmin,
  } = await getNamedAccounts();
  const L2Prefix = isSetupForL2 ? 'Polygon' : '';
  const assetAttributesRegistryAsRegistryAdmin: Contract = await ethers.getContract(
    L2Prefix + 'AssetAttributesRegistry',
    assetAttributesRegistryAdmin
  );

  const GemsCatalystsRegistry = await deployments.get(
    L2Prefix + 'GemsCatalystsRegistry'
  );

  const DefaultAttributes = await deployments.deploy(`DefaultAttributes`, {
    from: deployer,
    log: true,
  });

  const catalystsToAdd = [];
  const gemsToAdd = [];

  for (const catalyst of catalysts) {
    const doesCatalystExist = await read(
      L2Prefix + 'GemsCatalystsRegistry',
      'doesCatalystExist',
      catalyst.catalystId
    );

    let catalystContract;
    if (!doesCatalystExist) {
      catalystContract = await deploy(
        L2Prefix + `Catalyst_${catalyst.symbol}`,
        {
          contract: 'Catalyst',
          from: deployer,
          log: true,
          args: [
            `Sandbox's ${catalyst.symbol} Catalysts`,
            catalyst.symbol,
            catalystAdmin,
            catalyst.maxGems,
            catalyst.catalystId,
            DefaultAttributes.address,
            GemsCatalystsRegistry.address,
          ],
          skipIfAlreadyDeployed: true,
        }
      );

      catalystsToAdd.push(catalystContract.address);
    }
  }

  for (const gem of gems) {
    const doesGemExist = await read(
      L2Prefix + 'GemsCatalystsRegistry',
      'doesGemExist',
      gem.gemId
    );
    let gemsContract;
    if (!doesGemExist) {
      gemsContract = await deploy(L2Prefix + `Gem_${gem.symbol}`, {
        contract: 'Gem',
        from: deployer,
        log: true,
        args: [
          `Sandbox's ${gem.symbol} Gems`,
          gem.symbol,
          gemMinter,
          gem.gemId,
          GemsCatalystsRegistry.address,
        ],
        skipIfAlreadyDeployed: true,
      });
      gemsToAdd.push(gemsContract.address);
    }
  }

  const currentAdmin = await read(
    L2Prefix + 'GemsCatalystsRegistry',
    'getAdmin'
  );
  await execute(
    L2Prefix + 'GemsCatalystsRegistry',
    {from: currentAdmin, log: true},
    'addGemsAndCatalysts',
    gemsToAdd,
    catalystsToAdd
  );

  return assetAttributesRegistryAsRegistryAdmin;
};
