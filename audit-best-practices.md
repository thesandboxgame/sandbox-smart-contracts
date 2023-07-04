# Audit best practices

Here a non-exhaustive list of best practices to check before sending a contract to an audit:

## Smart Contracts
- fixed pragma version on all smart contracts
- natspec at least on external functions, public functions, variables, beginning of contract
- linebreaks between code (imports, contract, within functions, etc) to improve readability
- consistent indentation
- contract size under 24kb
- check gas usage and optimise where it is sensible to do so 
- generate a gas report
- events on every non view functions
- DRTW: use OZ when possible (Access Control)
- use constants instead of strings or duplicate numbers
- disable initializer in the constructor for upgradeable contracts
- when upgrading a contract, check for storage consistency
- check who's owning the contract, the deployer should not own the contract
- when using ERC2771, only use msgSender()
- avoid loops on arrays that are not limited in size
- check for centralization issues: changing variables, transfering assets from the contract, upgrades, forwarder, centralized metadata, etc
- use recent solidity version but a stable one
- logic issues: go back to the specs and compare
- avoid fake random 
- use uint256 over any other uint
- check your inputs (address it no 0, size is correct, limit size of arrays)
- think about how the user/dApp will interact with your contract (am i missing a getter ?)
- think about how to make your contract as generic as possible, that helps us build an open protocol
- when using OZ upgradeable contracts, don't forget to call the init functions
- check if your `supportsInterface` matchs what your contract uses
- check for the usual attacks: reentrancy, front running, etc
- challenge your naming
- only use named imports
- order your code (variables, constructor, public, etc)
- @notice on every external / public function; @dev to help developers understand
- licence on every contract
- @author on every contract
- check for typographical Errors
- unused named variable
- when dealing with ERC20, keep in mind deflationary tokens
- one condition per require for readability
- check for duplicate code
- clean debug / TODO comments
- put constants in upper case
- consider to block renouncing ownership
- consider using immutable on variables

## Unit Tests
- 100% coverage
- fuzzy testing

## Reports
- generate documentation from natspec

## Deployment
- tests deploy the contracts inside the fixture; no deploy scripts in package
- verify your contract to improve trust
- open source your contracts
- integration tests

## Security
- run slither but be selective about the issues
- deploy on a testnet & test manually
