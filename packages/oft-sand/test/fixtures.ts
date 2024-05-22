import {ethers} from 'hardhat';

export async function setupOFTSand() {
  const [
    executionAdmin,
    sandAdmin,
    oftAdapterOwner,
    oftSandOwner,
    oftSandOwner2,
    user1,
    user2,
    user3,
  ] = await ethers.getSigners();

  const eidAdapter = 1;
  const eidOFTSand = 2;
  const eidOFTSand2 = 3;

  const TrustedForwarderFactory = await ethers.getContractFactory(
    'MockTrustedForwarder',
  );
  const TrustedForwarder = await TrustedForwarderFactory.deploy();

  const EndpointFactory = await ethers.getContractFactory('EndpointMock');
  const EndPointForAdapter = await EndpointFactory.deploy(eidAdapter);
  const EndPointForOFTSand = await EndpointFactory.deploy(eidOFTSand);
  const EndPointForOFTSand2 = await EndpointFactory.deploy(eidOFTSand2);

  const SandMockFactory = await ethers.getContractFactory('SandMock');
  const SandMock = await SandMockFactory.deploy(
    sandAdmin,
    executionAdmin,
    user1,
    1,
  );

  const OFTAdapterFactory =
    await ethers.getContractFactory('OFTAdapterForSand');
  const OFTAdapter = await OFTAdapterFactory.deploy(
    SandMock,
    EndPointForAdapter,
    oftAdapterOwner,
  );

  const OFTSandFactoy = await ethers.getContractFactory('OFTSand');
  const OFTSand = await OFTSandFactoy.deploy(
    TrustedForwarder,
    sandAdmin,
    executionAdmin,
    EndPointForOFTSand,
    oftSandOwner,
  );

  const OFTSand2 = await OFTSandFactoy.deploy(
    TrustedForwarder,
    sandAdmin,
    executionAdmin,
    EndPointForOFTSand2,
    oftSandOwner2,
  );

  // Set destination endpoints in the LZEndpoint mock for each OFTAdapter and OFTSand
  await EndPointForAdapter.setDestLzEndpoint(
    OFTSand.getAddress(),
    EndPointForOFTSand.getAddress(),
  );
  await EndPointForOFTSand.setDestLzEndpoint(
    OFTAdapter.getAddress(),
    EndPointForAdapter.getAddress(),
  );

  // Set destination endpoints in the LZEndpoint mock for each OFTSand and OFTSand2
  await EndPointForOFTSand.setDestLzEndpoint(
    OFTSand2.getAddress(),
    EndPointForOFTSand2.getAddress(),
  );

  await EndPointForOFTSand2.setDestLzEndpoint(
    OFTSand.getAddress(),
    EndPointForOFTSand.getAddress(),
  );

  // Setting OFTAdapter and OFTSand as a peer of the other in the mock LZEndpoint
  await OFTAdapter.connect(oftAdapterOwner).setPeer(
    eidOFTSand,
    ethers.zeroPadValue(await OFTSand.getAddress(), 32),
  );
  await OFTSand.connect(oftSandOwner).setPeer(
    eidAdapter,
    ethers.zeroPadValue(await OFTAdapter.getAddress(), 32),
  );

  // Setting OFTSand and OFTSand2 as a peer of the other in the mock LZEndpoint
  await OFTSand.connect(oftSandOwner).setPeer(
    eidOFTSand2,
    ethers.zeroPadValue(await OFTSand2.getAddress(), 32),
  );
  await OFTSand2.connect(oftSandOwner2).setPeer(
    eidOFTSand,
    ethers.zeroPadValue(await OFTSand.getAddress(), 32),
  );

  return {
    SandMock,
    OFTAdapter,
    OFTSand,
    OFTSand2,
    eidAdapter,
    eidOFTSand,
    eidOFTSand2,
    user1,
    user2,
    user3,
  };
}
