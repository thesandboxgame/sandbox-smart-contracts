const Web3 = require('web3');
const utils = require('../utils');

const AssetComposable = artifacts.require('AssetComposable');

contract.skip('AssetComposable', (accounts) => {
  let assetComposableContract = null;
  const owner = Web3.utils.toChecksumAddress(accounts[0]);
  const user1 = Web3.utils.toChecksumAddress(accounts[1]);
  const user2 = Web3.utils.toChecksumAddress(accounts[2]);
  const gas = 4000000;
  // const ERC998_MAGIC_VALUE = '0xcd740db5';

  const assetURI1 = 'QmoiashdfohqwefuhasduhfasDFQWEFasdfasDFQWefr1';
  const assetURI2 = 'QmoiashdfohqwefuhasduhfasDFQWEFasdfasDFQWefr2';
  const assetId1 = 1;
  const assetId2 = 2;

  async function deployAssetComposable() {
    const truffleContract = await AssetComposable.new();
    assetComposableContract = new utils.web3.eth.Contract(AssetComposable._json.abi, truffleContract.address);
  }

  function mintAsset(creator, hash) {
    return assetComposableContract.methods.mint(hash).send({
      from: creator,
      gas
    });
  }

  function addChild(from, parentId, childId) {
    return assetComposableContract.methods.approve(assetComposableContract.options.address, childId).send({
      from,
      gas
    }).then(() => {
      return assetComposableContract.methods.getChild(from, parentId, assetComposableContract.options.address, childId).send({
        from,
        gas
      });
    });
  }

  function getRootOwnerAddress(bytes32) {
    //      MAGICVALUE
    // ex: "0xcd740db5000000000000000020d027bc02385e20db677cdf6fa1f3cbcbfc8f86"
    return utils.web3.utils.toChecksumAddress('0x' + bytes32.slice(26));
  }

  beforeEach(deployAssetComposable);

  it('should be deployed, AssetComposable', async () => {
    assert(assetComposableContract !== undefined, 'AssetComposable was not deployed');
  });

  it('should be the contract owner, Deployer', async () => {
    const contractOwner = await assetComposableContract.methods.owner().call();
    assert.equal(contractOwner, owner);
  });

  it('should be able to mint a composable asset', async () => {
    await mintAsset(user1, assetURI1);

    const assetOwner = await assetComposableContract.methods.ownerOf(assetId1).call();
    assert.equal(assetOwner, user1);
  });

  it('should be able to add a child', async () => {
    await mintAsset(user1, assetURI1);
    await mintAsset(user1, assetURI2);
    await addChild(user1, assetId1, assetId2);

    const childExists = await assetComposableContract.methods.childExists(assetComposableContract.options.address, assetId2).call();
    assert.equal(childExists, true);

    const result = await assetComposableContract.methods.ownerOfChild(assetComposableContract.options.address, assetId2).call();
    assert.equal(result.parentTokenId, assetId1);

    let asset2RootOwner = await assetComposableContract.methods.rootOwnerOf(assetId2).call();
    asset2RootOwner = getRootOwnerAddress(asset2RootOwner);
    assert.equal(asset2RootOwner, user1);

    const asset2Owner = await assetComposableContract.methods.ownerOf(assetId2).call();
    assert.equal(asset2Owner, assetComposableContract.options.address);
  });

  it('should be able to transfer a child to self', async () => {
    await mintAsset(user1, assetURI1);
    await mintAsset(user1, assetURI2);
    await addChild(user1, assetId1, assetId2);

    await assetComposableContract.methods.transferChild(assetId1, user1, assetComposableContract.options.address, assetId2).send({
      from: user1,
      gas
    });

    const asset2Owner = await assetComposableContract.methods.ownerOf(assetId2).call();
    assert.equal(asset2Owner, user1);

    const childExists = await assetComposableContract.methods.childExists(assetComposableContract.options.address, assetId2).call();
    assert.equal(childExists, false);
  });

  it('should be able to transfer a child to someone', async () => {
    await mintAsset(user1, assetURI1);
    await mintAsset(user1, assetURI2);
    await addChild(user1, assetId1, assetId2);

    await assetComposableContract.methods.transferChild(assetId1, user2, assetComposableContract.options.address, assetId2).send({
      from: user1,
      gas
    });

    const asset2Owner = await assetComposableContract.methods.ownerOf(assetId2).call();
    assert.equal(asset2Owner, user2);

    const childExists = await assetComposableContract.methods.childExists(assetComposableContract.options.address, assetId2).call();
    assert.equal(childExists, false);
  });

  it('should be able to transfer a composable asset', async () => {
    await mintAsset(user1, assetURI1);
    await mintAsset(user1, assetURI2);
    await addChild(user1, assetId1, assetId2);

    await assetComposableContract.methods.transferFrom(user1, user2, assetId1).send({
      from: user1,
      gas
    });

    const asset1Owner = await assetComposableContract.methods.ownerOf(assetId1).call();
    assert.equal(asset1Owner, user2);

    let asset2RootOwner = await assetComposableContract.methods.rootOwnerOf(assetId2).call();
    asset2RootOwner = getRootOwnerAddress(asset2RootOwner);
    assert.equal(asset2RootOwner, user2);

    const asset2Owner = await assetComposableContract.methods.ownerOf(assetId2).call();
    assert.equal(asset2Owner, assetComposableContract.options.address);
  });
});