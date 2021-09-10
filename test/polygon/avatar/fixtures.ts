/* eslint-disable mocha/no-exports */
import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot} from '../../utils';
import {BigNumberish, Contract} from 'ethers';
import ERC20Mock from '@openzeppelin/contracts-0.8/build/contracts/ERC20PresetMinterPauser.json';
import {AddressZero} from '@ethersproject/constants';
import {expect} from 'chai';
import {
  Log,
  TransactionReceipt,
  TransactionResponse,
} from '@ethersproject/abstract-provider';

const name = 'AVATARNAME';
const symbol = 'TSBAV';
const baseUri = 'http://api';
export const setupAvatarTest = withSnapshot([], async function () {
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    minter,
    other,
    dest,
    pauser,
  ] = await getUnnamedAccounts();
  await deployments.deploy('PolygonAvatar', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [name, symbol, baseUri, trustedForwarder, adminRole],
      },
    },
  });
  const polygonAvatar = await ethers.getContract('PolygonAvatar', deployer);
  const polygonAvatarAsAdmin = await ethers.getContract(
    'PolygonAvatar',
    adminRole
  );
  // Grant roles.
  const minterRole = await polygonAvatar.MINTER_ROLE();
  await polygonAvatarAsAdmin.grantRole(minterRole, minter);
  const polygonAvatarAsMinter = await ethers.getContract(
    'PolygonAvatar',
    minter
  );
  const polygonAvatarAsOther = await ethers.getContract('PolygonAvatar', other);
  const polygonAvatarAsTrustedForwarder = await ethers.getContract(
    'PolygonAvatar',
    trustedForwarder
  );
  const pauseRole = await polygonAvatar.PAUSE_ROLE();
  await polygonAvatarAsAdmin.grantRole(pauseRole, pauser);
  const polygonAvatarAsPauser = await ethers.getContract(
    'PolygonAvatar',
    pauser
  );

  return {
    baseUri,
    symbol,
    name,
    polygonAvatar,
    polygonAvatarAsAdmin,
    polygonAvatarAsMinter,
    polygonAvatarAsOther,
    polygonAvatarAsPauser,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    polygonAvatarAsTrustedForwarder,
    adminRole,
    minterRole,
    pauseRole,
    minter,
    pauser,
    other,
    dest,
  };
});

export const mintSandAndApprove = async function (
  sandToken: Contract,
  addr: string,
  amount: BigNumberish,
  spender: string
): Promise<void> {
  await sandToken.mint(addr, amount);
  const sandTokenAsOther = await ethers.getContract('SandMock', addr);
  await sandTokenAsOther.approve(spender, amount);
};

export const setupAvatarSaleTest = withSnapshot([], async function () {
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const [
    trustedForwarder,
    adminRole,
    seller,
    signer,
    other,
    dest,
  ] = await getUnnamedAccounts();
  await deployments.deploy('SandMock', {
    from: deployer,
    contract: ERC20Mock,
    args: ['AToken', 'SAND'],
    proxy: false,
  });

  // Polygon avatar implements batch mint.
  await deployments.deploy('PolygonAvatar', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [name, symbol, baseUri, trustedForwarder, adminRole],
      },
    },
  });
  const avatarAsAdmin = await ethers.getContract('PolygonAvatar', adminRole);
  const sandToken = await ethers.getContract('SandMock', deployer);

  await deployments.deploy('PolygonAvatarSale', {
    from: deployer,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          avatarAsAdmin.address,
          sandToken.address,
          trustedForwarder,
          adminRole,
        ],
      },
    },
  });
  const avatarSaleAsOther = await ethers.getContract(
    'PolygonAvatarSale',
    other
  );
  const avatarSaleAsAdmin = await ethers.getContract(
    'PolygonAvatarSale',
    adminRole
  );
  // Grant roles.
  const minter = await avatarAsAdmin.MINTER_ROLE();
  await avatarAsAdmin.grantRole(minter, avatarSaleAsAdmin.address);
  const signerRole = await avatarSaleAsAdmin.SIGNER_ROLE();
  await avatarSaleAsAdmin.grantRole(signerRole, signer);
  const sellerRole = await avatarSaleAsAdmin.SELLER_ROLE();
  await avatarSaleAsAdmin.grantRole(sellerRole, seller);
  return {
    avatarSaleAsOther,
    avatarSaleAsAdmin,
    avatarAsAdmin,
    sandToken,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    adminRole,
    seller,
    signer,
    other,
    dest,
  };
});

export const setupAvatarTunnelTest = withSnapshot([], async function () {
  const {deployer} = await getNamedAccounts();
  const [
    trustedForwarder,
    other,
    fxChildTunnel,
    dst,
  ] = await getUnnamedAccounts();
  await deployments.deploy('ERC721Mintable', {
    from: deployer,
    args: ['TestRootERC721', 'TestRootERC721'],
  });
  const rootAvatarToken = await ethers.getContract('ERC721Mintable', deployer);
  const rootAvatarTokenAsOther = await ethers.getContract(
    'ERC721Mintable',
    other
  );
  await deployments.deploy('FakeFxRoot', {from: deployer});
  const fxRoot = await ethers.getContract('FakeFxRoot', deployer);

  const checkpointManager = AddressZero;
  await deployments.deploy('AvatarTunnel', {
    contract: 'MockAvatarTunnel',
    from: deployer,
    args: [
      checkpointManager,
      fxRoot.address,
      rootAvatarToken.address,
      trustedForwarder,
    ],
  });
  const avatarTunnelAsOwner = await ethers.getContract(
    'AvatarTunnel',
    deployer
  );
  const avatarTunnelAsOther = await ethers.getContract('AvatarTunnel', other);
  return {
    deployer,
    owner: deployer,
    other,
    dst,
    fxChildTunnel,
    checkpointManager,
    fxRoot,
    rootAvatarToken,
    rootAvatarTokenAsOther,
    trustedForwarder,
    contract: avatarTunnelAsOwner,
    avatarTunnelAsOwner,
    avatarTunnelAsOther,
  };
});

export const setupPolygonAvatarTunnelTest = withSnapshot([], async function () {
  const {deployer} = await getNamedAccounts();
  const [
    trustedForwarder,
    other,
    fxRootTunnel,
    fxChild,
    dst,
  ] = await getUnnamedAccounts();
  await deployments.deploy('ERC721Mintable', {
    from: deployer,
    args: ['TestChildERC721', 'TestChildERC721'],
  });
  const childAvatarToken = await ethers.getContract('ERC721Mintable', deployer);
  const childAvatarTokenAsOther = await ethers.getContract(
    'ERC721Mintable',
    other
  );

  const checkpointManager = AddressZero;
  await deployments.deploy('PolygonAvatarTunnel', {
    from: deployer,
    args: [fxChild, childAvatarToken.address, trustedForwarder],
  });
  const avatarTunnelAsOwner = await ethers.getContract(
    'PolygonAvatarTunnel',
    deployer
  );
  const avatarTunnelAsFxChild = await ethers.getContract(
    'PolygonAvatarTunnel',
    fxChild
  );
  const avatarTunnelAsOther = await ethers.getContract(
    'PolygonAvatarTunnel',
    other
  );
  return {
    deployer,
    owner: deployer,
    other,
    dst,
    fxRootTunnel,
    checkpointManager,
    fxChild,
    childAvatarToken,
    childAvatarTokenAsOther,
    trustedForwarder,
    contract: avatarTunnelAsOwner,
    avatarTunnelAsOwner,
    avatarTunnelAsFxChild,
    avatarTunnelAsOther,
  };
});

export function onlyOwner(
  setupFunc: () => Promise<{
    contract: Contract;
    avatarTunnelAsOwner: Contract;
    avatarTunnelAsOther: Contract;
    other: string;
  }>,
  setter: string,
  getter: string
): void {
  it('only owner can ' + setter, async function () {
    const fixtures = await setupFunc();
    expect(await fixtures.contract[getter]()).to.not.be.equal(fixtures.other);
    await fixtures.avatarTunnelAsOwner[setter](fixtures.other);
    expect(await fixtures.contract[getter]()).to.be.equal(fixtures.other);
  });
  it('other should fail to ' + setter, async function () {
    const fixtures = await setupFunc();
    await expect(
      fixtures.avatarTunnelAsOther[setter](fixtures.other)
    ).to.be.revertedWith('caller is not the owner');
  });
}

export const setupFxAvatarTunnelIntegrationTest = withSnapshot(
  [],
  async function () {
    const {deployer} = await getNamedAccounts();
    const [
      upgradeAdmin,
      trustedForwarder,
      adminRole,
      other,
      minter,
      checkpointManager,
      dstRoot,
      dstChild,
      dstRoot2,
      dstChild2,
    ] = await getUnnamedAccounts();
    // L1
    await deployments.deploy('Avatar', {
      from: deployer,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [
            'L1Avatar',
            'TSBAV',
            'http://XXX.YYY',
            trustedForwarder,
            adminRole,
          ],
        },
        upgradeIndex: 0,
      },
    });
    const rootAvatarToken = await ethers.getContract('Avatar', deployer);
    await deployments.deploy('FakeFxRoot', {from: deployer});
    const fxRoot = await ethers.getContract('FakeFxRoot', deployer);
    await deployments.deploy('AvatarTunnel', {
      contract: 'MockAvatarTunnel',
      from: deployer,
      args: [
        checkpointManager,
        fxRoot.address,
        rootAvatarToken.address,
        trustedForwarder,
      ],
    });
    const rootAvatarTunnel = await ethers.getContract('AvatarTunnel');
    const avatarMinterRole = await deployments.read('Avatar', 'MINTER_ROLE');
    await deployments.execute(
      'Avatar',
      {from: adminRole},
      'grantRole',
      avatarMinterRole,
      rootAvatarTunnel.address
    );
    // L2
    await deployments.deploy('PolygonAvatar', {
      from: deployer,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [
            'Avatar',
            'TSBAV',
            'http://XXX.YYY',
            trustedForwarder,
            adminRole,
          ],
        },
      },
    });
    const childAvatarToken = await ethers.getContract('PolygonAvatar');
    await deployments.deploy('FakeFxChild', {from: deployer});
    const fxChild = await ethers.getContract('FakeFxChild', deployer);
    await deployments.deploy('PolygonAvatarTunnel', {
      from: deployer,
      args: [fxChild.address, childAvatarToken.address, trustedForwarder],
    });
    const childAvatarTunnel = await ethers.getContract('PolygonAvatarTunnel');

    // Connect L1 <-> L2
    await fxRoot.setFxChild(fxChild.address);
    await childAvatarTunnel.setFxRootTunnel(rootAvatarTunnel.address);
    await rootAvatarTunnel.setFxChildTunnel(childAvatarTunnel.address);

    return {
      deployer,
      trustedForwarder,
      owner: deployer,
      other,
      adminRole,
      minter,
      avatarMinterRole,
      checkpointManager,
      dstRoot,
      dstChild,
      dstRoot2,
      dstChild2,
      fxRoot,
      fxChild,
      rootAvatarToken,
      childAvatarToken,
      rootAvatarTunnel,
      childAvatarTunnel,
    };
  }
);

export async function getMessageLogFromTx(
  childAvatarTunnel: Contract,
  receipt: TransactionReceipt
): Promise<Log> {
  const filter = childAvatarTunnel.filters.MessageSent(null);
  const log = receipt.logs.filter(
    (x) =>
      x.address == filter.address &&
      filter.topics &&
      x.topics[0] == filter.topics[0]
  );
  return log[0];
}

export async function getMessageFromTx(
  tx: TransactionResponse
): Promise<string> {
  const childAvatarTunnel = await ethers.getContract('PolygonAvatarTunnel');
  const receipt: TransactionReceipt = await tx.wait();
  const log = await getMessageLogFromTx(childAvatarTunnel, receipt);
  const desc = childAvatarTunnel.interface.parseLog(log);
  return desc.args['message'];
}
