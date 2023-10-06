import {expect, assert} from 'chai';
import {ethers, artifacts} from 'hardhat';
import {getTestingAccounts} from '../fixtures';

import {
  setupFactory,
  deployBeacon,
  createBeaconWithImplementation,
  getMockInitializationArgs,
  collectionProxyAsContract,
  deployBeaconEventIndex,
} from './CollectionFactory.fixtures';

// eslint-disable-next-line mocha/no-skipped-tests
describe('CollectionFactory', function () {
  it('deployBeacon works accordingly', async function () {
    const {
      factoryContractAsOwner,
      factoryContractAsRandomWallet,
      mockImplementationContract,
    } = await setupFactory();

    const implementationAlias = ethers.encodeBytes32String('main-avatar');

    // only owner can call the function
    await expect(
      factoryContractAsRandomWallet.deployBeacon(
        await mockImplementationContract.getAddress(),
        implementationAlias
      )
    ).to.be.revertedWith('Ownable: caller is not the owner');

    // alias must be a value
    const emptyAlias = ethers.encodeBytes32String('');
    await expect(
      factoryContractAsOwner.deployBeacon(
        await mockImplementationContract.getAddress(),
        emptyAlias
      )
    ).to.be.revertedWith('CollectionFactory: beacon alias cannot be empty');

    // have a normal deploy then check that no new deploy can be made
    await factoryContractAsOwner.deployBeacon(
      await mockImplementationContract.getAddress(),
      implementationAlias
    );

    await expect(
      factoryContractAsOwner.deployBeacon(
        await mockImplementationContract.getAddress(),
        implementationAlias
      )
    ).to.be.revertedWith('CollectionFactory: beacon alias already used');

    const beaconAddedEvents = await factoryContractAsOwner.queryFilter(
      factoryContractAsOwner.filters.BeaconAdded()
    );

    // event was sent correctly
    assert.equal(beaconAddedEvents.length, 1);
    const beaconAlias = beaconAddedEvents[0].args?.[0];

    assert.equal(beaconAlias, implementationAlias);
  });

  it('addBeacon works accordingly', async function () {
    const {
      randomAddress,
      factoryContractAsOwner,
      factoryContractAsRandomWallet,
      mockImplementationContract,
    } = await setupFactory();
    const beaconContract = await createBeaconWithImplementation(
      await mockImplementationContract.getAddress(),
      true
    );
    const beaconContractAddress = await beaconContract.getAddress();
    const implementationAlias = ethers.encodeBytes32String('main-avatar');
    const secondaryAlias = ethers.encodeBytes32String('secondary-avatar');

    // only owner can call the function
    await expect(
      factoryContractAsRandomWallet.addBeacon(
        beaconContractAddress,
        implementationAlias
      )
    ).to.be.revertedWith('Ownable: caller is not the owner');

    // alias must be a value
    const emptyAlias = ethers.encodeBytes32String('');
    await expect(
      factoryContractAsOwner.addBeacon(beaconContractAddress, emptyAlias)
    ).to.be.revertedWith('CollectionFactory: beacon alias cannot be empty');

    // beacon must be a contract
    await expect(
      factoryContractAsOwner.addBeacon(randomAddress, implementationAlias)
    ).to.be.revertedWith('CollectionFactory: beacon is not a contract');

    await deployBeacon(
      factoryContractAsOwner,
      await mockImplementationContract.getAddress(),
      implementationAlias
    );

    // beacon must be a contract
    await expect(
      factoryContractAsOwner.addBeacon(
        beaconContractAddress,
        implementationAlias
      )
    ).to.be.revertedWith('CollectionFactory: beacon alias already used');

    // beacon ownership must be given to factory in advanced
    await expect(
      factoryContractAsOwner.addBeacon(beaconContractAddress, secondaryAlias)
    ).to.be.revertedWith(
      'CollectionFactory: ownership must be given to factory'
    );

    // transfer ownership to beacon
    await beaconContract.transferOwnership(
      await factoryContractAsOwner.getAddress()
    );

    // successful beacon addition
    await factoryContractAsOwner.addBeacon(
      beaconContractAddress,
      secondaryAlias
    );

    const beaconAddedEvents = await factoryContractAsOwner.queryFilter(
      factoryContractAsOwner.filters.BeaconAdded()
    );

    // event was sent correctly
    assert.equal(beaconAddedEvents.length, 2); // 2 because we added one to check the alias already existing condition
    const addedBeaconAlias = beaconAddedEvents[1].args?.[0];
    const addedBeaconAddress = beaconAddedEvents[1].args?.[1];

    assert.equal(addedBeaconAlias, secondaryAlias);
    assert.equal(addedBeaconAddress, beaconContractAddress);
  });

  it('updateBeaconImplementation works accordingly', async function () {
    const {
      factoryContractAsOwner,
      factoryContractAsRandomWallet,
      mockUpgradableContract,
      mockUpgradableV2Contract,
    } = await setupFactory();

    const mockUpgradableContractAddress =
      await mockUpgradableContract.getAddress();
    const mockUpgradableV2ContractAddress =
      await mockUpgradableV2Contract.getAddress();

    const implementationAlias = ethers.encodeBytes32String('main-avatar');

    const beaconAddress = await deployBeacon(
      factoryContractAsOwner,
      mockUpgradableContractAddress,
      implementationAlias
    );

    // sanity check beacon implementation is what we wanted it to be
    assert.equal(
      await beaconAddress.implementation(),
      mockUpgradableContractAddress
    );

    // only owner can call the function
    await expect(
      factoryContractAsRandomWallet.updateBeaconImplementation(
        implementationAlias,
        mockUpgradableV2ContractAddress
      )
    ).to.be.revertedWith('Ownable: caller is not the owner');

    const nonExistingAlias = ethers.encodeBytes32String('nonExistingAlias');

    await expect(
      factoryContractAsOwner.updateBeaconImplementation(
        nonExistingAlias,
        mockUpgradableV2ContractAddress
      )
    ).to.be.revertedWith('CollectionFactory: beacon is not tracked');

    // normal execution
    await factoryContractAsOwner.updateBeaconImplementation(
      implementationAlias,
      mockUpgradableV2ContractAddress
    );

    // sanity check beacon implementation is what we wanted it to be
    assert.equal(
      await beaconAddress.implementation(),
      mockUpgradableV2ContractAddress
    );
  });

  it('transferBeacon works accordingly', async function () {
    const {
      randomAddress,
      factoryContractAsOwner,
      factoryContractAsRandomWallet,
      mockUpgradableContract,
      mockUpgradableV2Contract,
    } = await setupFactory();

    const implementationAlias = ethers.encodeBytes32String('main-avatar');

    const mockUpgradableContractAddress =
      await mockUpgradableContract.getAddress();
    const mockUpgradableV2ContractAddress =
      await mockUpgradableV2Contract.getAddress();

    const beaconAddress = await deployBeacon(
      factoryContractAsOwner,
      mockUpgradableContractAddress,
      implementationAlias
    );

    // sanity check beacon implementation is what we wanted it to be
    assert.equal(
      await beaconAddress.implementation(),
      mockUpgradableContractAddress
    );

    // only owner can call the function
    await expect(
      factoryContractAsRandomWallet.transferBeacon(
        implementationAlias,
        mockUpgradableV2ContractAddress
      )
    ).to.be.revertedWith('Ownable: caller is not the owner');

    const nonExistingAlias = ethers.encodeBytes32String('nonExistingAlias');

    await expect(
      factoryContractAsOwner.transferBeacon(
        nonExistingAlias,
        mockUpgradableV2ContractAddress
      )
    ).to.be.revertedWith('CollectionFactory: beacon is not tracked');

    // new beacon cannot be 0 address
    await expect(
      factoryContractAsOwner.transferBeacon(
        implementationAlias,
        ethers.ZeroAddress
      )
    ).to.be.revertedWith('Ownable: new owner is the zero address');

    // sanity check beacon owner is address
    const oldOwnership = await beaconAddress.owner();
    assert.equal(oldOwnership, await factoryContractAsOwner.getAddress());

    // initial alias list
    const originalAliases: string[] =
      await factoryContractAsRandomWallet.getBeaconAliases();
    assert.equal(originalAliases.includes(implementationAlias), true);

    // normal execution
    await factoryContractAsOwner.transferBeacon(
      implementationAlias,
      randomAddress
    );

    // check that owner was changed
    assert.equal(await beaconAddress.owner(), randomAddress);

    // check that events were sent
    const beaconOwnershipChangedEvent =
      await factoryContractAsOwner.queryFilter(
        factoryContractAsOwner.filters.BeaconOwnershipChanged()
      );
    assert.equal(beaconOwnershipChangedEvent.length, 1);

    const beaconRemovedEvent = await factoryContractAsOwner.queryFilter(
      factoryContractAsOwner.filters.BeaconRemoved()
    );
    assert.equal(beaconRemovedEvent.length, 1);

    // check alias was removed
    const aliasesNow: string[] =
      await factoryContractAsRandomWallet.getBeaconAliases();
    assert.equal(aliasesNow.includes(implementationAlias), false);
  });

  it('deployCollection works accordingly', async function () {
    const {
      factoryContractAsOwner,
      factoryContractAsRandomWallet,
      mockUpgradableContract,
    } = await setupFactory();

    const implementationAlias = ethers.encodeBytes32String('main-avatar');

    const initializationArgs = await getMockInitializationArgs(
      mockUpgradableContract
    );

    const beaconContract = await deployBeacon(
      factoryContractAsOwner,
      await mockUpgradableContract.getAddress(),
      implementationAlias
    );

    // only owner can call the function
    await expect(
      factoryContractAsRandomWallet.deployCollection(
        implementationAlias,
        initializationArgs
      )
    ).to.be.revertedWith('Ownable: caller is not the owner');

    const nonExistingAlias = ethers.encodeBytes32String('nonExistingAlias');

    await expect(
      factoryContractAsOwner.deployCollection(
        nonExistingAlias,
        initializationArgs
      )
    ).to.be.revertedWith('CollectionFactory: beacon is not tracked');

    // sanity checks
    const beforeCollectionCount =
      await factoryContractAsRandomWallet.collectionCount();
    const beforeCollections: string[] =
      await factoryContractAsRandomWallet.getCollections();
    assert.equal(
      beforeCollections.length,
      0,
      'beforeCollections sanity check failed'
    );
    assert.equal(
      beforeCollectionCount,
      0n,
      'beforeCollectionCount sanity check failed'
    );

    // normal execution
    await factoryContractAsOwner.deployCollection(
      implementationAlias,
      initializationArgs
    );

    // check events were sent
    const collectionAddedEvents = await factoryContractAsOwner.queryFilter(
      factoryContractAsOwner.filters.CollectionAdded()
    );
    assert.equal(collectionAddedEvents.length, 1, 'check events were sent');

    // check events were set ok
    const attachedBeaconAddress = collectionAddedEvents[0].args?.[0];
    assert.equal(
      attachedBeaconAddress,
      await beaconContract.getAddress(),
      'check events were set ok'
    );

    const collectionAddress = collectionAddedEvents[0].args?.[1];

    // check internal accounting has collection tracked
    const afterCollections: string[] =
      await factoryContractAsRandomWallet.getCollections();
    assert.equal(
      afterCollections.length,
      1,
      'collection not added in collection'
    );
    assert.isTrue(
      afterCollections.includes(collectionAddress),
      'address not in collection set'
    );

    const afterCollectionCount =
      await factoryContractAsRandomWallet.collectionCount();
    assert.equal(
      afterCollectionCount,
      1n,
      'collection not added in afterCollectionCount'
    );
  });

  it('updateCollection works accordingly', async function () {
    const {
      randomAddress,
      factoryContractAsOwner,
      factoryContractAsRandomWallet,
      mockUpgradableContract,
    } = await setupFactory();

    const mockUpgradableContractAddress =
      await mockUpgradableContract.getAddress();

    const emptyInitializationArgs = '0x';
    const implementationAlias = ethers.encodeBytes32String('main-avatar');
    const secondaryAlias = ethers.encodeBytes32String('secondary-avatar');
    const initializationArgs = await getMockInitializationArgs(
      mockUpgradableContract
    );

    const beaconContract = await deployBeacon(
      factoryContractAsOwner,
      mockUpgradableContractAddress,
      implementationAlias
    );

    const beaconContractV2 = await deployBeaconEventIndex(
      factoryContractAsOwner,
      mockUpgradableContractAddress,
      secondaryAlias,
      1
    );

    await factoryContractAsOwner.deployCollection(
      implementationAlias,
      initializationArgs
    );
    const collectionAddedEvents = await factoryContractAsOwner.queryFilter(
      factoryContractAsOwner.filters.CollectionAdded()
    );
    const collectionAddress = collectionAddedEvents[0].args?.[1];

    // input validation checks
    await expect(
      factoryContractAsRandomWallet.updateCollection(
        randomAddress,
        secondaryAlias,
        emptyInitializationArgs
      )
    ).to.be.revertedWith('CollectionFactory: collection is not tracked');

    await expect(
      factoryContractAsRandomWallet.updateCollection(
        collectionAddress,
        secondaryAlias,
        emptyInitializationArgs
      )
    ).to.be.revertedWith(
      'CollectionFactory: caller is not collection or factory owner'
    );

    const nonExistingAlias = ethers.encodeBytes32String('nonExistingAlias');

    await expect(
      factoryContractAsRandomWallet.updateCollection(
        collectionAddress,
        nonExistingAlias,
        emptyInitializationArgs
      )
    ).to.be.revertedWith('CollectionFactory: beacon is not tracked');

    // sanity checks
    const collectionContract = await collectionProxyAsContract(
      collectionAddress
    );
    assert.equal(
      await collectionContract.beacon(),
      await beaconContract.getAddress(),
      'initial beacon address set ok'
    );

    // normal use
    await factoryContractAsOwner.updateCollection(
      collectionAddress,
      secondaryAlias,
      emptyInitializationArgs
    );

    // check events were sent
    const collectionUpdatedEvents = await factoryContractAsOwner.queryFilter(
      factoryContractAsOwner.filters.CollectionUpdated()
    );
    assert.equal(collectionUpdatedEvents.length, 1, 'check events were sent');

    // check that the collection proxy actually has a different beacon
    assert.equal(
      await collectionContract.beacon(),
      await beaconContractV2.getAddress(),
      'update beacon address set ok'
    );
  });

  it('transferCollections works accordingly', async function () {
    const {
      randomAddress,
      factoryContractAsOwner,
      factoryContractAsRandomWallet,
      mockUpgradableContract,
    } = await setupFactory();

    const mockUpgradableContractAddress =
      await mockUpgradableContract.getAddress();

    const implementationAlias = ethers.encodeBytes32String('main-avatar');
    const initializationArgs = await getMockInitializationArgs(
      mockUpgradableContract
    );
    await deployBeacon(
      factoryContractAsOwner,
      mockUpgradableContractAddress,
      implementationAlias
    );
    await factoryContractAsOwner.deployCollection(
      implementationAlias,
      initializationArgs
    );
    const collectionAddedEvents = await factoryContractAsOwner.queryFilter(
      factoryContractAsOwner.filters.CollectionAdded()
    );
    const collectionAddress = collectionAddedEvents[0].args?.[1];

    const collections: string[] = [collectionAddress];

    // input validations
    await expect(
      factoryContractAsRandomWallet.transferCollections(
        collections,
        randomAddress
      )
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(
      factoryContractAsOwner.transferCollections(
        collections,
        ethers.ZeroAddress
      )
    ).to.be.revertedWith('ERC1967: new admin is the zero address');

    // sanity checks
    const collectionContract = await collectionProxyAsContract(
      collectionAddress
    );
    const beforeCollectionCount =
      await factoryContractAsRandomWallet.collectionCount();
    const beforeCollections: string[] =
      await factoryContractAsRandomWallet.getCollections();
    assert.isTrue(
      beforeCollections.includes(collectionAddress),
      'beforeCollections includes sanity check failed'
    );
    assert.equal(
      beforeCollections.length,
      1,
      'beforeCollections sanity check failed'
    );
    assert.equal(
      beforeCollectionCount,
      1n,
      'beforeCollectionCount sanity check failed'
    );
    assert.equal(
      await collectionContract.proxyAdmin(),
      await factoryContractAsOwner.getAddress(),
      'initial proxyAdmin address set ok'
    );

    // normal usage
    await factoryContractAsOwner.transferCollections(
      collections,
      randomAddress
    );

    // check that the admin address was actually changed
    assert.equal(
      await collectionContract.proxyAdmin(),
      randomAddress,
      'proxyAdmin failed to change'
    );

    // check that internal accounting changed
    const afterCollectionCount =
      await factoryContractAsRandomWallet.collectionCount();
    const afterCollections: string[] =
      await factoryContractAsRandomWallet.getCollections();

    assert.equal(afterCollections.length, 0, 'afterCollections check failed');
    assert.equal(afterCollectionCount, 0n, 'afterCollectionCount check failed');

    // check events were sent
    const collectionRemovedEvents = await factoryContractAsOwner.queryFilter(
      factoryContractAsOwner.filters.CollectionRemoved()
    );
    assert.equal(
      collectionRemovedEvents.length,
      1,
      'collectionRemovedEvents check event failed'
    );

    const collectionProxyAdminChangedEvents =
      await factoryContractAsOwner.queryFilter(
        factoryContractAsOwner.filters.CollectionProxyAdminChanged()
      );
    assert.equal(
      collectionProxyAdminChangedEvents.length,
      1,
      'collectionProxyAdminChangedEvents check event failed'
    );

    // check that removing an inexistent collection fails
    await expect(
      factoryContractAsOwner.transferCollections(collections, randomAddress)
    ).to.be.revertedWith('CollectionFactory: failed to remove collection');
  });

  it('addCollections works accordingly', async function () {
    // setup start
    const {
      randomAddress,
      factoryContractAsOwner,
      factoryContractAsRandomWallet,
      mockUpgradableContract,
    } = await setupFactory();

    const mockUpgradableContractAddress =
      await mockUpgradableContract.getAddress();

    const implementationAlias = ethers.encodeBytes32String('main-avatar');
    const initializationArgs = await getMockInitializationArgs(
      mockUpgradableContract
    );
    const beaconContract = await deployBeacon(
      factoryContractAsOwner,
      mockUpgradableContractAddress,
      implementationAlias
    );
    await factoryContractAsOwner.deployCollection(
      implementationAlias,
      initializationArgs
    );
    const collectionAddedEventsBefore =
      await factoryContractAsOwner.queryFilter(
        factoryContractAsOwner.filters.CollectionAdded()
      );
    const collectionAddress = collectionAddedEventsBefore[0].args?.[1];
    const collections: string[] = [collectionAddress];

    // transfer ownerships to imitate real life
    await factoryContractAsOwner.transferCollections(
      collections,
      randomAddress
    );
    await factoryContractAsOwner.transferBeacon(
      implementationAlias,
      randomAddress
    );
    // setup ended

    // input validations
    await expect(
      factoryContractAsRandomWallet.addCollections(collections)
    ).to.be.revertedWith('Ownable: caller is not the owner');

    await expect(factoryContractAsOwner.addCollections([])).to.be.revertedWith(
      'CollectionFactory: empty collection list'
    );

    await expect(
      factoryContractAsOwner.addCollections([ethers.ZeroAddress])
    ).to.be.revertedWith('CollectionFactory: collection is zero address');

    await expect(
      factoryContractAsOwner.addCollections(collections)
    ).to.be.revertedWith(
      'CollectionFactory: owner of collection must be factory'
    );

    const collectionProxyInterface = await artifacts.readArtifact(
      'CollectionProxy'
    );
    const {randomWallet} = await getTestingAccounts();
    const signer = randomWallet.connect(ethers.provider);
    const collectionAsOwner = new ethers.Contract(
      collectionAddress,
      collectionProxyInterface.abi,
      signer
    );

    // give ownership back to contract (collection)
    await collectionAsOwner.changeCollectionProxyAdmin(
      await factoryContractAsOwner.getAddress()
    );

    await expect(
      factoryContractAsOwner.addCollections(collections)
    ).to.be.revertedWith(
      'CollectionFactory: beacon ownership must be given to factory'
    );

    // give ownership back to contract (beacon)
    const contractInterface = await artifacts.readArtifact('UpgradeableBeacon');
    const beaconContractAsOwner = new ethers.Contract(
      await beaconContract.getAddress(),
      contractInterface.abi,
      signer
    );
    await beaconContractAsOwner.transferOwnership(
      await factoryContractAsOwner.getAddress()
    );

    // sanity checks
    const beforeCollectionCount =
      await factoryContractAsRandomWallet.collectionCount();
    const beforeCollections: string[] =
      await factoryContractAsRandomWallet.getCollections();
    assert.equal(
      beforeCollections.length,
      0,
      'beforeCollections sanity check failed'
    );
    assert.equal(
      beforeCollectionCount,
      0n,
      'beforeCollectionCount sanity check failed'
    );

    // normal use case
    await factoryContractAsOwner.addCollections(collections);

    // check events were sent
    const collectionAddedEventsAfter = await factoryContractAsOwner.queryFilter(
      factoryContractAsOwner.filters.CollectionAdded()
    );
    assert.equal(
      collectionAddedEventsAfter.length,
      2,
      'collectionAddedEvents check event failed'
    );

    // check that internal accounting changed
    const afterCollectionCount =
      await factoryContractAsRandomWallet.collectionCount();
    const afterCollections: string[] =
      await factoryContractAsRandomWallet.getCollections();

    assert.isTrue(
      afterCollections.includes(collectionAddress),
      'afterCollections includes check failed'
    );
    assert.equal(afterCollections.length, 1, 'afterCollections check failed');
    assert.equal(afterCollectionCount, 1n, 'afterCollectionCount check failed');
  });
});
