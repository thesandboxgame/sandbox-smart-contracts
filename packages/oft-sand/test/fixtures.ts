import {ethers} from 'hardhat';

export async function setupOFTSand() {
  const [
    executionAdmin,
    sandAdmin,
    oftAdapterAdmin,
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
  const EndpointForAdapter = await EndpointFactory.deploy(eidAdapter);
  const EndpointForOFTSand = await EndpointFactory.deploy(eidOFTSand);
  const EndpointForOFTSand2 = await EndpointFactory.deploy(eidOFTSand2);

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
    EndpointForAdapter,
    oftAdapterOwner,
    TrustedForwarder,
    oftAdapterAdmin,
  );

  const OFTSandFactoy = await ethers.getContractFactory('OFTSand');
  const OFTSand = await OFTSandFactoy.deploy(
    TrustedForwarder,
    sandAdmin,
    executionAdmin,
    EndpointForOFTSand,
    oftSandOwner,
  );

  const OFTSand2 = await OFTSandFactoy.deploy(
    TrustedForwarder,
    sandAdmin,
    executionAdmin,
    EndpointForOFTSand2,
    oftSandOwner2,
  );

  // Set destination endpoints in the LZEndpoint mock for each OFTAdapter and OFTSand
  await EndpointForAdapter.setDestLzEndpoint(
    OFTSand.getAddress(),
    EndpointForOFTSand.getAddress(),
  );
  await EndpointForOFTSand.setDestLzEndpoint(
    OFTAdapter.getAddress(),
    EndpointForAdapter.getAddress(),
  );

  // Set destination endpoints in the LZEndpoint mock for each OFTSand and OFTSand2
  await EndpointForOFTSand.setDestLzEndpoint(
    OFTSand2.getAddress(),
    EndpointForOFTSand2.getAddress(),
  );
  await EndpointForOFTSand2.setDestLzEndpoint(
    OFTSand.getAddress(),
    EndpointForOFTSand.getAddress(),
  );

  // Set destination endpoints in the LZEndpoint mock for each OFTSand2 and OFTAdapter
  await EndpointForOFTSand2.setDestLzEndpoint(
    OFTAdapter.getAddress(),
    EndpointForAdapter.getAddress(),
  );
  await EndpointForAdapter.setDestLzEndpoint(
    OFTSand2.getAddress(),
    EndpointForOFTSand2.getAddress(),
  );

  // Setting OFTAdapter and OFTSand as peers of each other
  await OFTAdapter.connect(oftAdapterOwner).setPeer(
    eidOFTSand,
    ethers.zeroPadValue(await OFTSand.getAddress(), 32),
  );
  await OFTSand.connect(oftSandOwner).setPeer(
    eidAdapter,
    ethers.zeroPadValue(await OFTAdapter.getAddress(), 32),
  );

  // Setting OFTSand and OFTSand2 as peers of each other
  await OFTSand.connect(oftSandOwner).setPeer(
    eidOFTSand2,
    ethers.zeroPadValue(await OFTSand2.getAddress(), 32),
  );
  await OFTSand2.connect(oftSandOwner2).setPeer(
    eidOFTSand,
    ethers.zeroPadValue(await OFTSand.getAddress(), 32),
  );

  // Setting OFTSand2 and OFTAdapter as peers of each other
  await OFTSand2.connect(oftSandOwner2).setPeer(
    eidAdapter,
    ethers.zeroPadValue(await OFTAdapter.getAddress(), 32),
  );
  await OFTAdapter.connect(oftAdapterOwner).setPeer(
    eidOFTSand2,
    ethers.zeroPadValue(await OFTSand2.getAddress(), 32),
  );

  return {
    SandMock,
    OFTAdapter,
    OFTSand,
    OFTSand2,
    TrustedForwarder,
    eidAdapter,
    eidOFTSand,
    eidOFTSand2,
    oftSandOwner,
    sandAdmin,
    oftAdapterOwner,
    oftAdapterAdmin,
    user1,
    user2,
    user3,
  };
}
