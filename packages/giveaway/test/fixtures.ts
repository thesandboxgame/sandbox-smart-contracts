import {BigNumber, BigNumberish, Contract, Signer} from 'ethers';
import {signedClaimSignature, signedMultiGiveawaySignature} from './signature';
import {ethers} from 'hardhat';
import {expect} from 'chai';
import {
  Claim,
  ERC1155BatchClaim,
  ERC1155Claim,
  ERC20Claim,
  getClaimData,
  getClaimEntries,
  getPopulatedTx,
  TokenType,
} from './claim';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ANY = any;
type AsyncReturnType<T extends (...args: ANY) => Promise<ANY>> = T extends (
  ...args: ANY
) => Promise<infer R>
  ? R
  : ANY;

async function deploy(name: string, users: Signer[] = []): Promise<Contract[]> {
  const Contract = await ethers.getContractFactory(name);
  const contract = await Contract.deploy();
  await contract.deployed();
  const ret = [];
  for (const s of users) {
    ret.push(await contract.connect(s));
  }
  ret.push(contract);
  return ret;
}

type ClaimEntry = {
  tokenType: TokenType;
  tokenAddress: string;
  data: string;
};

function compareClaim(a: Claim[]): (b: ClaimEntry[]) => boolean {
  return (b: ClaimEntry[]) =>
    a.every(
      (x, idx) =>
        x.tokenType === b[idx].tokenType &&
        x.token.address === b[idx].tokenAddress &&
        getClaimData(x) === b[idx].data
    );
}

type TransferEntry = {
  tokenAddress: string;
  data: string;
};

function compareTransfers(a: TransferEntry[]): (b: TransferEntry[]) => boolean {
  return (b: TransferEntry[]) =>
    a.every(
      (x, idx) =>
        x.tokenAddress === b[idx].tokenAddress && x.data === b[idx].data
    );
}

async function setupEnv() {
  const [
    ,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    admin,
    backofficeAdmin,
    operator,
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
    const postDest = await balances(dest.address, claims);
    for (const [idx, c] of claims.entries()) {
      switch (c.tokenType) {
        case TokenType.ERC20:
        case TokenType.ERC1155:
          {
            const r = pre[idx] as ERC20Claim;
            const rDest = preDest[idx] as ERC20Claim;
            const s = pos[idx] as ERC20Claim;
            const sDest = postDest[idx] as ERC20Claim;
            expect(s.amount).to.be.equal(
              BigNumber.from(r.amount).sub(c.amount)
            );
            expect(sDest.amount).to.be.equal(
              BigNumber.from(rDest.amount).add(c.amount)
            );
          }
          break;
        case TokenType.ERC721:
          {
            const r = pre[idx] as ERC721Balance;
            const s = pos[idx] as ERC721Balance;
            expect(r.owner).to.be.equal(source);
            expect(s.owner).to.be.equal(dest.address);
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

  async function mintTo(address: string, claims: Claim[]) {
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
          await c.token.mint(address, c.tokenId, c.amount, c.data);
          break;
        case TokenType.ERC1155_BATCH:
          {
            for (const [idx, tokenId] of c.tokenIds.entries()) {
              await c.token.mint(address, tokenId, c.amounts[idx], c.data);
            }
          }
          break;
        default:
          throw new Error('mintToContract: invalid token type ' + c.tokenType);
      }
    }
  }

  return {
    mintTo,
    balances,
    checkBalances,
    sandToken,
    sandTokenAsOther,
    landToken,
    assetToken,
    deployer,
    upgradeAdmin,
    trustedForwarder,
    admin,
    backofficeAdmin,
    operator,
    seller,
    signer,
    other,
    dest,
  };
}

export async function setupSignedMultiGiveaway() {
  const ret = await setupEnv();
  const [
    contractAsDeployer,
    contract,
    contractAsAdmin,
    contractAsBackofficeAdmin,
    contractAsOperator,
    contactDeploy,
  ] = await deploy('SignedMultiGiveaway', [
    ret.deployer,
    ret.other,
    ret.admin,
    ret.backofficeAdmin,
    ret.operator,
  ]);
  // Initialize
  await contractAsDeployer.initialize(
    ret.trustedForwarder.address,
    ret.admin.address
  );

  const backofficeRole = await contractAsAdmin.BACKOFFICE_ROLE();
  await contractAsAdmin.grantRole(backofficeRole, ret.backofficeAdmin.address);
  const signerRole = await contractAsAdmin.SIGNER_ROLE();
  await contractAsAdmin.grantRole(signerRole, ret.signer.address);
  return {
    ...ret,
    contractAsDeployer,
    contract,
    contractAsAdmin,
    contractAsBackofficeAdmin,
    contractAsOperator,
    contactDeploy,
    signAndClaim: async (
      claimIds: BigNumberish[],
      claims: Claim[],
      signerUser = ret.signer,
      expiration = 0
    ) => {
      await ret.mintTo(contract.address, claims);
      const pre = await ret.balances(contract.address, claims);
      const preDest = await ret.balances(ret.dest.address, claims);
      const {v, r, s} = await signedMultiGiveawaySignature(
        contract,
        signerUser.address,
        claimIds,
        expiration,
        contract.address,
        ret.dest.address,
        claims
      );
      await expect(
        contract.claim(
          [{v, r, s}],
          claimIds,
          expiration,
          contract.address,
          ret.dest.address,
          getClaimEntries(claims)
        )
      )
        .to.emit(contract, 'Claimed')
        .withArgs(
          claimIds,
          contract.address,
          ret.dest.address,
          compareClaim(claims),
          ret.other.address
        );
      await ret.checkBalances(contract.address, pre, preDest, claims);
    },
  };
}

async function getSignerCaller(ret: AsyncReturnType<typeof setupEnv>) {
  const [
    contractAsDeployer,
    contract,
    contractAsAdmin,
    contractAsOperator,
    contactDeploy,
  ] = await deploy('SignedCaller', [
    ret.deployer,
    ret.other,
    ret.admin,
    ret.operator,
  ]);
  // Initialize
  await contractAsDeployer.initialize(
    ret.trustedForwarder.address,
    ret.admin.address
  );

  const signerRole = await contractAsAdmin.SIGNER_ROLE();
  await contractAsAdmin.grantRole(signerRole, ret.signer.address);
  return {
    contractAsDeployer,
    contract,
    contractAsAdmin,
    contractAsOperator,
    contactDeploy,
  };
}

export async function setupSignedCaller() {
  const ret = await setupEnv();
  const signerCaller = await getSignerCaller(ret);

  async function getTxData(
    from: string,
    to: string,
    claim: Claim
  ): Promise<string> {
    const tx = await getPopulatedTx(from, to, claim, signerCaller.contract, {
      erc20: ret.sandToken,
      erc721: ret.landToken,
      erc1155: ret.assetToken,
    });
    if (!tx.data) {
      throw new Error('Error populating tx');
    }
    return tx.data;
  }

  return {
    ...ret,
    ...signerCaller,
    getTxData,
    signAndClaim: async (
      claimIds: BigNumberish[],
      claim: Claim,
      signerUser = ret.signer,
      expiration = 0
    ) => {
      await ret.mintTo(signerCaller.contract.address, [claim]);
      const pre = await ret.balances(signerCaller.contract.address, [claim]);
      const preDest = await ret.balances(ret.dest.address, [claim]);
      const data = await getTxData(
        signerCaller.contract.address,
        ret.dest.address,
        claim
      );
      const {v, r, s} = await signedClaimSignature(
        signerCaller.contract,
        signerUser.address,
        claimIds,
        expiration,
        claim.token.address,
        data
      );
      await expect(
        signerCaller.contract.claim(
          [{v, r, s}],
          claimIds,
          expiration,
          claim.token.address,
          data
        )
      )
        .to.emit(signerCaller.contract, 'Claimed')
        .withArgs(claimIds, claim.token.address, data, ret.other.address);
      await ret.checkBalances(signerCaller.contract.address, pre, preDest, [
        claim,
      ]);
    },
  };
}

async function getTokenHolder(ret: AsyncReturnType<typeof setupEnv>) {
  const [
    contractAsDeployer,
    contract,
    contractAsAdmin,
    contractAsBackofficeAdmin,
    contractAsOperator,
    contactDeploy,
  ] = await deploy('TokenHolder', [
    ret.deployer,
    ret.other,
    ret.admin,
    ret.backofficeAdmin,
    ret.operator,
  ]);
  // Initialize
  await contractAsDeployer.initialize(
    ret.trustedForwarder.address,
    ret.admin.address
  );
  const backofficeRole = await contractAsAdmin.BACKOFFICE_ROLE();
  await contractAsAdmin.grantRole(backofficeRole, ret.backofficeAdmin.address);
  const operatorRole = await contractAsAdmin.OPERATOR_ROLE();
  await contractAsAdmin.grantRole(operatorRole, ret.operator.address);

  async function getTransfers(
    claims: Claim[],
    from: string,
    to: string
  ): Promise<TransferEntry[]> {
    const tranfers: TransferEntry[] = [];
    for (const c of claims) {
      const tx = await getPopulatedTx(from, to, c, contract, {
        erc20: ret.sandToken,
        erc721: ret.landToken,
        erc1155: ret.assetToken,
      });
      if (!tx.data) {
        throw new Error('Error populating tx');
      }
      tranfers.push({
        tokenAddress: c.token.address,
        data: tx.data,
      });
    }
    return tranfers;
  }

  return {
    contractAsDeployer,
    contract,
    contractAsAdmin,
    contractAsBackofficeAdmin,
    contractAsOperator,
    contactDeploy,
    operatorRole,
    getTransfers,
  };
}

export async function setupTokenHolder() {
  const ret = await setupEnv();
  const tokenHolder = await getTokenHolder(ret);
  return {
    ...ret,
    ...tokenHolder,
    mintAndTransfer: async (from: string, claims: Claim[]) => {
      await ret.mintTo(from, claims);
      const pre = await ret.balances(from, claims);
      const preDest = await ret.balances(ret.dest.address, claims);
      const transfers: TransferEntry[] = await tokenHolder.getTransfers(
        claims,
        from,
        ret.dest.address
      );
      await expect(tokenHolder.contractAsOperator.transfer(transfers))
        .to.emit(tokenHolder.contract, 'Transferred')
        .withArgs(compareTransfers(transfers), ret.operator.address);
      await ret.checkBalances(from, pre, preDest, claims);
    },
  };
}

export async function setupSignedCallerWithTokenHolder() {
  const ret = await setupEnv();
  const tokenHolder = await getTokenHolder(ret);
  const signerCaller = await getSignerCaller(ret);
  await tokenHolder.contractAsAdmin.grantRole(
    tokenHolder.operatorRole,
    signerCaller.contract.address
  );

  async function prepareTxData(
    claims: Claim[],
    from: string,
    to: string
  ): Promise<{data: string; transfers: TransferEntry[]}> {
    const transfers: TransferEntry[] = await tokenHolder.getTransfers(
      claims,
      from,
      to
    );
    const tx = await tokenHolder.contract.populateTransaction.transfer(
      transfers
    );
    if (!tx.data) {
      throw new Error('Error populating tx');
    }
    return {data: tx.data, transfers};
  }

  return {
    ...ret,
    tokenHolder,
    signerCaller,
    getTxData: async (claims: Claim[], from: string, to: string) => {
      const {data} = await prepareTxData(claims, from, to);
      return data;
    },
    signAndClaim: async (
      claimIds: BigNumberish[],
      claims: Claim[],
      signerUser = ret.signer,
      expiration = 0
    ) => {
      await ret.mintTo(tokenHolder.contract.address, claims);
      const pre = await ret.balances(tokenHolder.contract.address, claims);
      const preDest = await ret.balances(ret.dest.address, claims);
      const {data, transfers} = await prepareTxData(
        claims,
        tokenHolder.contract.address,
        ret.dest.address
      );
      const {v, r, s} = await signedClaimSignature(
        signerCaller.contract,
        signerUser.address,
        claimIds,
        expiration,
        tokenHolder.contract.address, // We will call tokenHolder through signerCaller
        data
      );
      const receipt = expect(
        signerCaller.contract.claim(
          [{v, r, s}],
          claimIds,
          expiration,
          tokenHolder.contract.address,
          data
        )
      );
      await receipt.to
        .emit(signerCaller.contract, 'Claimed')
        .withArgs(
          claimIds,
          tokenHolder.contract.address,
          data,
          ret.other.address
        );
      await receipt.to
        .emit(tokenHolder.contract, 'Transferred')
        .withArgs(compareTransfers(transfers), signerCaller.contract.address);
      await ret.checkBalances(
        tokenHolder.contract.address,
        pre,
        preDest,
        claims
      );
    },
  };
}
