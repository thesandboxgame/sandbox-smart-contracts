# SandboxPasses1155 - NFT Pass System

## Overview

SandboxPasses1155 is a smart contract that powers a flexible NFT pass system on
the Ethereum blockchain. It allows for the creation, management, and
distribution of digital passes that can be used for various purposes including
event access, membership benefits, and digital collectibles.

## Key Features

### 📱 Multi-Token Support

- A single contract can manage many different types of passes
- Each pass type has its own configuration, supply limits, and transferability
  rules

### 🔒 Flexible Transferability

- Passes can be configured as transferable or non-transferable (soulbound)
- Admins can whitelist specific addresses to transfer otherwise non-transferable
  passes
- Helps maintain integrity for access passes and credentials

### 🏷️ Supply Controls

- Set maximum supply limits for each pass type
- Configure how many of each pass type a single wallet can hold
- Prevent overconcentration of passes in single wallets

### 💰 Payment Integration

- Built-in support for payments in ERC20 tokens
- Configurable treasury addresses to receive payments
- Different pass types can have different payment recipients

### 🔄 Pass Transformation

- Users can burn existing passes to receive new ones
- Supports upgrade paths and token evolution
- Operator-controlled transformations for managed ecosystems

### 🛡️ Security Features

- Role-based access control for administrative functions
- Pausable functionality for emergency situations
- Signature-based minting for secure off-chain authorization
- Meta-transaction support for better user experience

### 💸 Royalty Support

- ERC2981 royalty standard implementation
- Configure royalties for secondary market sales
- Set default royalties or override for specific pass types

## User Interactions

### For Pass Holders

- Mint passes using authorized signatures
- Transform existing passes into new pass types
- Transfer passes (if allowed by configuration)
- Use passes for access to services or content

### For Administrators

- Configure new pass types with custom properties
- Mint passes directly to users
- Update pass configurations and metadata
- Manage transferability and access control
- Pause/unpause contract functions in emergencies
- Recover accidentally sent tokens

## Technical Details

This contract implements several Ethereum standards:

- ERC1155: Multi-token standard
- ERC2981: NFT royalty standard
- ERC2771: Meta-transactions for gas-less operations

The contract is designed to be deployed behind a proxy for upgradeability,
allowing the functionality to evolve over time while maintaining the same
contract address and token balances.

---

# Pull Request Description

## SandboxPasses1155Upgradeable Implementation

This PR introduces a comprehensive, feature-rich ERC1155 implementation for The
Sandbox passes ecosystem. The contract provides a flexible foundation for
digital passes, membership tokens, and access credentials with robust security,
configurability, and user experience features.

### Key Features Added

- **Configurable Passes**: Each token ID represents a unique pass type with
  customizable properties including transferability, max supply, max per wallet,
  and dedicated treasury address.

- **Flexible Minting**: Multiple minting paths including admin minting,
  signature-authorized minting, and burn-to-mint transformations, enabling
  diverse distribution strategies.

- **Soulbound Functionality**: Optional non-transferable configuration for
  passes that should remain bound to the original owner, with admin-controlled
  transfer whitelist exceptions.

- **Supply Controls**: Granular control over token supply, both globally (max
  supply) and per user (max per wallet), to manage scarcity and fair
  distribution.

- **Security First**: Comprehensive role-based access control, EIP-712 signature
  verification, pausable functionality, and meta-transaction support.

- **Payment Integration**: Native support for ERC20 token payments with
  configurable treasury addresses per token type.

- **Upgradeable Design**: Implemented using OpenZeppelin's upgradeable contracts
  pattern to allow for future improvements without migration.

- **Royalty Support**: Complete ERC2981 implementation for marketplace royalties
  on secondary sales.

### Technical Implementation

The contract extends multiple OpenZeppelin base contracts including
ERC1155SupplyUpgradeable, AccessControlUpgradeable, ERC2981Upgradeable, and
PausableUpgradeable. It uses structured storage patterns compatible with the
upgradeable contracts pattern.

Error handling is implemented using custom errors for gas efficiency and
improved debugging. Events are emitted for all significant state changes to
support off-chain indexing and UI updates.

The contract has been thoroughly reviewed for security vulnerabilities and gas
optimization.
