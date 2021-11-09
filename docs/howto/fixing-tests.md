---
description: Fixing tests
---

# How to fix the tests locally ?

Switching branches or changing npm packages can provoke the tests to fail.
A quick fix is to reinstall the packages, clean the cache of hardhat with those commands:

```bash
yarn && yarn hardhat clean && yarn compile && yarn test

```

Note: On Windows you need at least [Powershell 7](https://github.com/PowerShell/PowerShell#get-powershell) in order to make this command work.
