# Sandbox Forwarder

This package contains the SandboxForwarder contract, which is a meta-transaction forwarder implementation based on OpenZeppelin's ERC2771Forwarder.

## Overview

The SandboxForwarder contract enables meta-transactions in The Sandbox ecosystem, allowing users to execute transactions without holding ETH by having a relayer pay for the gas fees.

## Installation

```bash
npm install @sandbox-smart-contracts/sandbox-forwarder
```

## Usage

The SandboxForwarder can be used as a trusted forwarder in any contract that implements ERC2771 meta-transaction support.

```solidity
import "@sandbox-smart-contracts/sandbox-forwarder/contracts/SandboxForwarder.sol";
```
