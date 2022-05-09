# Sand, an ERC-20 token implementation that support meta transactions natively

See: [Sand.sol](../src/solc_0.5/Sand.sol)

Sand smart contract is the ERC-20 token that will be used for

- Trading Assets among players
- Fee for minting Assets
- Staking in our curation / moderation system
- Paying for meta-transactions
- Voting decisions

Sand implements the ERC-20 standard

Sand was originally deployed in April 2019 and while we started to distribute the tokens to early investors. We made the decision to re-deploy a better version.
The new version has been audited by both Solidified (see [./audits/sand_solidified_audit.pdf](./audits/sand_solidified_audit.pdf)) and Certik (see [./audits/sand_certik_audit.pdf](./audits/sand_certik_audit.pdf))

The original Sand was made upgradeable as we wanted to be sure we could adapt to new standard.
the 2 main reasons was:

1. ERC-777 (an improvement over ERC-20) was still in the work. We wanted to make sure we could support it later. For that our SAND smart contract was emitting ERC-777 events for transfer. This way we could switch to an ERC-777 implementation down the line.

2. We were also working on [EIP-1776](https://github.com/ethereum/EIPs/issues/1776), a meta transaction draft proposal. Since the standard was likely to evolve we needed a way to upgrade our smart contract

But as time passed it became clear that 1) was not that strong a reason. ERC-777 is not going to get traction any time soon and the advantages it provides are not so clear cut. Plus the cost of upgradeability is not null and the extra cost of emitting ERC-777 events was not small.

Secondly, we found out we could design meta-transaction outside of the SAND contract, while preserving efficiency.

The new contract can be found here : [Sand.sol](old_src/Sand.sol)
It implements Hooks so that our meta transaction implementation remains efficient. But our overall system also support for external meta transaction processor, including external one such as [GSN](https://gsn.openzeppelin.com)
