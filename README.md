<p align="center"><a href="https://sandbox.game"><img width="300" title="TSB" src='brand-assets/tsb_pride.png' /></a></p>

<h1 align="center">The Sandbox Smart Contracts</h1>

<a href="https://github.com/thesandboxgame/sandbox-smart-contracts/actions"><img alt="Build Status" src="https://github.com/thesandboxgame/sandbox-smart-contracts/actions/workflows/main.yml/badge.svg"/></a>
![Node Version](https://img.shields.io/badge/node-18.x-green)
[![Discord](https://img.shields.io/discord/497312527093334036.svg?label=Discord&logo=discord)](<https://discord.gg/vAe4zvY>)

[The Sandbox](https://sandbox.game) is a user-generated content (UGC) gaming platform, that will empower creators through digital ownership and monetization of 3D voxel creations made and shared by users around the world.

This mono-repo contains The Sandbox smart contracts, underpinning The Sandbox metaverse. Our key token contracts were conceived inside the core package. You can find out more about some of our early blockchain features in [this article](https://medium.com/sandbox-game/blockchain-features-in-the-sandbox-7db91fcc615c). Since core was created, we have added new contracts and updates via new packages - see the below Architecture Overview for more information.

## Learn more

- [Website](www.sandbox.game)
- [Discord](https://discordapp.com/invite/vAe4zvY)
- [Telegram](https://t.me/sandboxgame)
- [Medium](https://medium.com/sandbox-game)

## Prerequisites

- ⚙️ [NodeJS](https://nodejs.org/)
- 🧰 [Yarn](https://yarnpkg.com/)

## Tech stack and getting started

This workspace uses [Nx: a smart, fast and extensible build system.](https://nx.dev)
Run `nx graph` to see a diagram of the dependencies of the projects.

To add a package simply add it inside the packages directory. Every package can implement the following targets that will be run by the root `package.json` scripts and on the CI:

- `test`: run unit tests inside your new package.
- `coverage`: run coverage. Note: CI expects to have at least 80% coverage.
- `lint`: lint your code.
- `format`: format the code with prettier.

See [`packages/example-hardhat`](./packages/example-hardhat) for an example template package for smart contract development with Hardhat.

Refer to each package's readme for more information about that package. Note that deployment for all new packages is carried out via `packages/deploy`.
Each package should follow the [audit best practices](./audit-best-practices.md) where applicable.

### Developer quickstart

```bash
yarn install
```

## Architecture Overview

- 📦 This mono-repository contains a suite of smart contract packages.
- ⚖️ The mono-repository is released under [MIT license](./LICENSE). Note, that the packages may contain their own licenses.

| Package                                                                                                       | Version                                                                                                                                                                  | License                                                                                                  | Description                                                                                                                                                            |
|---------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [`@sandbox-smart-contracts/packages/core`](./packages/core)                                                   | [![npm](https://img.shields.io/npm/v/@sandbox-smart-contracts/core)](https://www.npmjs.com/package/@sandbox-smart-contracts/core)                                        | [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://spdx.org/licenses/MIT.html) | 🗝️ Core smart contracts (pre 2023)                                                                                                                                      |
| [`@sandbox-smart-contracts/packages/deploy`](./packages/deploy)                                               | N/A                                                                                                                                                                      | [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://spdx.org/licenses/MIT.html) | 🚀 Deploy all packages (except core)                                                                                                                                    |
| [`@sandbox-smart-contracts/packages/example-hardhat`](./packages/example-hardhat)                             | N/A                                                                                                                                                                      | [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://spdx.org/licenses/MIT.html) | 👷 Development template using Hardhat                                                                                                                                   |
| [`@sandbox-smart-contracts/packages/giveaway`](./packages/giveaway)                                           | [![npm](https://img.shields.io/npm/v/@sandbox-smart-contracts/giveaway)](https://www.npmjs.com/package/@sandbox-smart-contracts/giveaway)                                | [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://spdx.org/licenses/MIT.html) | 🎁 Instant Giveaway smart contract claims                                                                                                                               |
| [`@sandbox-smart-contracts/packages/dependency-metatx`](./packages/dependency-metatx)                         | [![npm](https://img.shields.io/npm/v/@sandbox-smart-contracts/dependency-metatx)](https://www.npmjs.com/package/@sandbox-smart-contracts/dependency-metatx)              | [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://spdx.org/licenses/MIT.html) | 🌐 Dependency: ERC2771 handler                                                                                                                                          |
 [`@sandbox-smart-contracts/packages/marketplace`](./packages/marketplace)             | [![npm](https://img.shields.io/npm/v/@sandbox-smart-contracts/marketplace)](https://www.npmjs.com/package/@sandbox-smart-contracts/marketplace)             | [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://spdx.org/licenses/MIT.html) | 🛍️ The Sandbox marketplace contracts      |
 | [`@sandbox-smart-contracts/packages/dependency-royalty-management`](./packages/dependency-royalty-management) | [![npm](https://img.shields.io/npm/v/@sandbox-smart-contracts/dependency-royalty-management)](https://www.npmjs.com/package/@sandbox-smart-contracts/royalty-management) | [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://spdx.org/licenses/MIT.html) | 🎨 Dependency: The Sandbox Royalty Implementation in partnership with [Manifold's royalty-registry](https://github.com/manifoldxyz/royalty-registry-solidity/tree/main) |
| [`@sandbox-smart-contracts/packages/dependency-operator-filter`](./packages/dependency-operator-filter)       | [![npm](https://img.shields.io/npm/v/@sandbox-smart-contracts/dependency-operator-filter)](https://www.npmjs.com/package/@sandbox-smart-contracts/operator-filter)       | [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://spdx.org/licenses/MIT.html) | 🤝 Dependency: The Sandbox's implementation for OpenSea's operator filter                                                                                               |
| [`@sandbox-smart-contracts/packages/asset`](./packages/asset)                                                 | [![npm](https://img.shields.io/npm/v/@sandbox-smart-contracts/asset)](https://www.npmjs.com/package/@sandbox-smart-contracts/asset)                                      | [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://spdx.org/licenses/MIT.html) | 🚗 Asset contract upgrade for L2 deployment featuring tiers, abilities, operator-filter and creator royalties                                                           |

## Contributing

### Bug bounties

Submit a bug at [Immunefi](https://immunefi.com/bounty/thesandbox/) to help secure our smart contracts!
