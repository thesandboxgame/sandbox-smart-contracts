import {
  Claim,
  compareClaim,
  ERC1155BatchClaim,
  ERC1155Claim,
  ERC20Claim,
  getClaimEntires,
  signedMultiGiveawaySignature,
  TokenType,
} from './signature';
import {ethers} from 'hardhat';
import {expect} from 'chai';
import {Contract, Signer} from 'ethers';

export async function deploy(
  name: string,
  users: Signer[] = []
): Promise<Contract[]> {
  const Contract = await ethers.getContractFactory(name);
  const contract = await Contract.deploy();
  await contract.waitForDeployment();
  const ret = [];
  for (const s of users) {
    ret.push(await contract.connect(s));
  }
  ret.push(contract);
  return ret;
}

export async function deployWithProxy(
  name: string,
  users: Signer[] = []
): Promise<Contract[]> {
  const contract = await deploy(name, users);

  const Proxy = await ethers.getContractFactory('FakeProxy');
  // This uses signers[0]
  const proxy = await Proxy.deploy(await contract[0].getAddress());
  await proxy.waitForDeployment();
  const ret = [];
  for (let i = 0; i < contract.length; i++) {
    ret[i] = await contract[i].attach(await proxy.getAddress());
  }
  // add implementation contract
  ret.push(contract[contract.length - 1]);
  return ret;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function setupSignedMultiGiveaway() {
  const [
    ,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    admin,
    backofficeAdmin,
    seller,
    signer,
    other,
    dest,
  ] = await ethers.getSigners();
  const [sandToken, sandTokenAsOther] = await deploy('FakeMintableERC20', [
    deployer,
    other,
  ]);
  const [landToken] = await deploy('FakeMintableERC721', [deployer]);
  const [assetToken] = await deploy('FakeMintableERC1155', [deployer]);
  const [
    contractAsDeployer,
    contract,
    contractAsAdmin,
    contractAsBackofficeAdmin,
    signedGiveaway,
  ] = await deployWithProxy('SignedMultiGiveaway', [
    deployer,
    other,
    admin,
    backofficeAdmin,
  ]);

  // Initialize
  await contractAsDeployer.initialize(
    await trustedForwarder.getAddress(),
    await admin.getAddress()
  );
  // Grant roles.
  const signerRole = await contractAsAdmin.SIGNER_ROLE();
  await contractAsAdmin.grantRole(signerRole, await signer.getAddress());
  const backofficeRole = await contractAsAdmin.BACKOFFICE_ROLE();
  await contractAsAdmin.grantRole(
    backofficeRole,
    await backofficeAdmin.getAddress()
  );

  interface ERC721Balance {
    tokenType: TokenType.ERC721 | TokenType.ERC721_SAFE;
    owner: string;
  }

  interface ERC721BatchBalance {
    tokenType: TokenType.ERC721_BATCH | TokenType.ERC721_SAFE_BATCH;
    owners: string[];
  }

  type Balance =
    | ERC20Claim
    | ERC1155Claim
    | ERC1155BatchClaim
    | ERC721Balance
    | ERC721BatchBalance;

  async function checkBalances(
    source: string,
    pre: Balance[],
    preDest: Balance[],
    claims: Claim[]
  ) {
    const pos = await balances(source, claims);
    const postDest = await balances(await dest.getAddress(), claims);
    for (const [idx, c] of claims.entries()) {
      switch (c.tokenType) {
        case TokenType.ERC20:
        case TokenType.ERC1155:
          {
            const r = pre[idx] as ERC20Claim;
            const rDest = preDest[idx] as ERC20Claim;
            const s = pos[idx] as ERC20Claim;
            const sDest = postDest[idx] as ERC20Claim;
            expect(s.amount).to.be.equal(r.amount - c.amount);
            expect(sDest.amount).to.be.equal(rDest.amount + c.amount);
          }
          break;
        case TokenType.ERC721:
          {
            const r = pre[idx] as ERC721Balance;
            const s = pos[idx] as ERC721Balance;
            expect(r.owner).to.be.equal(await contract.getAddress());
            expect(s.owner).to.be.equal(await dest.getAddress());
          }
          break;
      }
    }
  }

  async function balances(
    address: string,
    claims: Claim[]
  ): Promise<Balance[]> {
    const ret: Balance[] = [];
    for (const c of claims) {
      switch (c.tokenType) {
        case TokenType.ERC20:
          ret.push({...c, amount: await c.token.balanceOf(address)});
          break;
        case TokenType.ERC721:
        case TokenType.ERC721_SAFE:
          ret.push({...c, owner: await c.token.ownerOf(c.tokenId)});
          break;
        case TokenType.ERC721_BATCH:
        case TokenType.ERC721_SAFE_BATCH:
          {
            const owners = [];
            for (const tokenId of c.tokenIds) {
              owners.push(await c.token.ownerOf(tokenId));
            }
            ret.push({...c, owners});
          }
          break;
        case TokenType.ERC1155:
          ret.push({...c, amount: await c.token.balanceOf(address, c.tokenId)});
          break;
        case TokenType.ERC1155_BATCH:
          {
            const amounts = [];
            for (const tokenId of c.tokenIds) {
              amounts.push(await c.token.balanceOf(address, tokenId));
            }
            ret.push({...c, amounts});
          }
          break;
        default:
          throw new Error('balances: invalid token type ' + c.tokenType);
      }
    }
    return ret;
  }

  async function mintToContract(address: string, claims: Claim[]) {
    for (const c of claims) {
      switch (c.tokenType) {
        case TokenType.ERC20:
          await c.token.mint(address, c.amount);
          break;
        case TokenType.ERC721:
        case TokenType.ERC721_SAFE:
          await c.token.safeMint(address, c.tokenId);
          break;
        case TokenType.ERC721_BATCH:
        case TokenType.ERC721_SAFE_BATCH:
          {
            for (const tokenId of c.tokenIds) {
              await c.token.safeMint(address, tokenId);
            }
          }
          break;
        case TokenType.ERC1155:
          await c.token.mint(
            address,
            c.tokenId,
            c.amount,
            ethers.getBytes(c.data)
          );
          break;
        case TokenType.ERC1155_BATCH:
          {
            for (const [idx, tokenId] of c.tokenIds.entries()) {
              await c.token.mint(
                address,
                tokenId,
                c.amounts[idx],
                ethers.getBytes(c.data)
              );
            }
          }
          break;
        default:
          throw new Error('mintToContract: invalid token type ' + c.tokenType);
      }
    }
  }

  return {
    mintToContract,
    balances,
    checkBalances,
    signAndClaim: async (
      claimIds: bigint[],
      claims: Claim[],
      signerUser = signer,
      expiration = 0
    ) => {
      await mintToContract(await contract.getAddress(), claims);
      const pre = await balances(await contract.getAddress(), claims);
      const preDest = await balances(await dest.getAddress(), claims);
      const {v, r, s} = await signedMultiGiveawaySignature(
        contract,
        signerUser,
        claimIds,
        expiration,
        await contract.getAddress(),
        await dest.getAddress(),
        await getClaimEntires(claims)
      );
      await expect(
        contract.claim(
          [{v, r, s}],
          claimIds,
          expiration,
          await contract.getAddress(),
          await dest.getAddress(),
          await getClaimEntires(claims)
        )
      )
        .to.emit(contract, 'Claimed')
        .withArgs(
          claimIds,
          await contract.getAddress(),
          await dest.getAddress(),
          compareClaim(await getClaimEntires(claims)),
          await other.getAddress()
        );
      await checkBalances(await contract.getAddress(), pre, preDest, claims);
    },
    signedGiveaway,
    contract,
    contractAsDeployer,
    contractAsAdmin,
    contractAsBackofficeAdmin,
    sandToken,
    sandTokenAsOther,
    landToken,
    assetToken,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    admin,
    backofficeAdmin,
    seller,
    signer,
    other,
    dest,
  };
}

export async function deploySignedMultiGiveaway() {
  const [, deployer, trustedForwarder, admin] = await ethers.getSigners();
  const [contract, proxy, implementation] = await deployWithProxy(
    'SignedMultiGiveaway',
    [deployer]
  );
  return {
    contract,
    proxy,
    implementation,
    deployer,
    trustedForwarder,
    admin,
  };
}
