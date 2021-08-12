---
description: Solidity best practices.
---

# General

This document describes best practices and patterns to use when writing and porting solidity code.

***This document was written in mid 2021 and current solidity version is 0.8.***

The document is composed of three parts:

1. The first one is a general recommendations for coding style
2. The second part is a more opinionated set of design patterns and recommendations specific to solidity that helps with
   the security of the code and are usually objected by auditors if not used.
3. The third part are guidelines for contract upgrade from 0.5 -> 0.8

# Coding Style

This part is based heavily
on: [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html#contract-and-library-names)

In the code we heavily recommend using linter and prettier to force a common style.

Below is a summary and some extra guidelines to follow:

- [NatSpec](https://docs.soliditylang.org/en/latest/style-guide.html#natspec): We encourage adding Natspec comments to
  functions and variables, specially to public ones.
- File structure:
    - One contract, library or interface per file.
    - [Order of Layout](https://docs.soliditylang.org/en/latest/style-guide.html#natspec): `Type declarations`,
      `State variables`, `Events`, `Functions`.
    - [Order of Functions](https://docs.soliditylang.org/en/latest/style-guide.html#order-of-functions):
      `constructor`, `fallback function` (if exists), `external`, `public`, `internal`, `private`. Within a grouping,
      place the view and pure functions last.
- [Naming Styles](https://docs.soliditylang.org/en/latest/style-guide.html#naming-styles):
    - Contracts, libraries, events, enums and structs should be named using the ***CapWords*** style and match their
      filenames.
    - Function, function arguments, local, state variable and modifiers should use ***mixedCase***. To avoid naming
      collisions add a single trailing underscore `_` to function arguments. This is specially useful when assigning
      function arguments to state variables.
    - Constants should be named with all ***CAPITAL_LETTERS_WITH_UNDERSCORES*** separating words.
    - For library functions that operate on a custom struct the first argument should always be named `self`.
    - Directory names should use ***all_lowercase_with_underscores***. Favor breaking apart names into subdirectories,
      for example: `common_stuff` can be broken into `common/stuff`.
    - ***WARNING***: there are case-sensitive and case-insensitive operating systems, avoid repeating sub-directory and
      file names with different case in the same directory.
- Long import lines: Solidity 0.6 complains when import line are broken, avoid splitting the import lines if you are
  using and old compiler.
- Use the import style: `import {Something} from "SomeFile.sol"` instead of `import "SomeFile.sol"`
- Use unit keywords in literals when possible:
    - `1 gwei` instead of 1e9 or 1000000000
    - `1 ether` instead of 1e18 or 1000000000000000000
    - `1 weeks` == `7 days`, `1 days` == `24 hours`, `1 hours` == `60 minutes`, `1 minutes`
      == `60 seconds`.

          ***WARNING***:  these units cannot be used to perform calendar calculation. The `block.timestamp` must be
      used with care too. See the note in the
      following [document](https://docs.soliditylang.org/en/latest/units-and-global-variables.html).

# Patterns and recommendations

## Inheritance / code reuse

## Composition

Solidity is kind of OOP: contracts are like classes and deployed contracts are instances. There is multiple inheritance
and interface implementation.

There is a principle in OOP: "Favor 'object composition' over 'class inheritance'." (Gang of Four 1995:20).

The problem is that solidity doesn't support composition of contracts, instead, composition can be implemented using
libraries and the following pattern:

- Define a struct that will be used to store class attributes.
- Implement class methods as internal functions in a library that take the struct as the first parameter (calling
  it `self`).
- Declare the struct and use the directive [using for](https://docs.soliditylang.org/en/latest/contracts.html#using-for)
  inside the contracts that needs to compose the class.
- The library must have only internal functions if you want everything compiled inline in the smart contract.
- Is ok to have a contract that delegates everything to the library like a Facade over it and other contracts that just
  reuse some part of the code.

### Limit the use of multiple inheritance

see: [The diamond problem](https://en.wikipedia.org/wiki/Multiple_inheritance#The_diamond_problem) and
[C3 linearization](https://en.wikipedia.org/wiki/C3_linearization).

### TO DISCUSS: Use abstract vs interfaces

An interface has more limitations: it cannot inherit other interfaces or contracts and may not define a constructor,
structs, enums or variables but is clearer to use an interface to generate the abi used to access the implementation
from outside the blockchain. On the other hand an abstract contract is more powerful. So use interfaces when possible
and if not then use abstract contracts.

## Upgradeable contracts

### Leave some space in the storage for future variables at the end

```
// Reserved storage space to allow for layout changes in the future.
uint256[50] private ______gap;
```

### Use a separate contract for storage

Create one storage contract and then inherit it into the implementation. This way it is easier to manage the storage and
add variables during upgrade.

### Loop length must be short and controlled

All the iterations in the smart contract must be limited in their length. A permanent denial of service could happen if
the gas consumed by a loop is too high.

### Rounding

Each time a division is done the numbers are rounded (the operation is like a `floor(a/b)`) and there is some remainder
to take into account.

## Visibility

### Use of private attributes

Private attributes just hide the internal state of the contract, child contracts (via inheritance), and make writing
tests impossible.

***When possible use internal or public.***

Internal solve the testing issue. A mock child contract can be used to access the variable.

Public solve all the issues the only downside is that it adds a default getter and calling a public method can make the
contract code and gas consumption higher.

### Use of private view methods

Usually view methods are used as a getters or to do some reusable calculation. Exposing the method helps to test the
contract and is useful to check the internal state of a deployed contract. Methods can be exposed using public or
external. If possible prefer external because external function's parameters are not copied into memory but are read
directly from `calldata` and this can save some gas.

### Calling internal functions is cheaper

Calling internal functions is cheaper than calling public functions. When you call a public function all the parameters
are copied again into memory and passed to that function. By contrast, when you call an internal function, references of
those parameters are passed, and they are not copied again.

## Others

### Lock pragmas to specific compiler version

Pragma must select a specific version of the compiler, instead of using `pragma solidity ^0.8.2;`
use `pragma solidity 0.8.2;`.

### Use interface type instead of the address for type safety

```
interface SomethingToCall {
    function call() returns (bool);
}

contract Example {
    function Good(SomethingToCall _something) internal returns (bool) {
    }

    function Bad(address _addr) internal returns (bool) {
        SomethingToCall something = SomethingToCall(_addr);
    }
}
```

### Use short reason strings

The solidity linter warns about it. Reason strings (those used in `revert`) that takes more than 32 bytes make the
contract byte code bigger.

### Sending funds to an uncontrolled address

Sending ether to another address in Ethereum involves a call to the receiving entity, if you are sending funds to an
address that is not under your control this can be insecure.

When possible use the [pull over push pattern](https://github.com/fravoll/solidity-patterns). This pattern involves more
interactions with the end user which can have a negative impact. A weaker alternative is
the [secure ether transfer](https://github.com/fravoll/solidity-patterns/blob/master/docs/secure_ether_transfer.md).

In any case when sending fund to an address that is not under your control you must be very carefull about it.

### Use of view methods that reverts

Usually view methods return some value. Is better to just return a value indicating a failure than doing a revert that
is reserved for state changes and is hard to catch with some blockchain client libraries. Assert can be used to test for
internal errors, and to check invariants.

## Packing

Storage variables can be packed. Pack your variables by declaring them in the right order. Tight packing variables in
structs can be useful to make the code
clear: [Tight Variable Packing](https://fravoll.github.io/solidity-patterns/tight_variable_packing.html)

For some calculations take into account that uint8 used alone can be more expensive than uint256 because the EVM word is
32bytes/256bits.

### Before repeating your self use known libraries as dependencies when possible

Is a good idea to use known libraries that are well written, secure (search online for audits) and up to date. In any
case before reinventing the wheel check available libraries.

Yarn and npm can be used to include dependencies, but it must be used with care because you end up using code that came
from a repository that is not under your control. Another alternative is to copy the code from the library into your own
source tree, the downside is that updating the code when the library is update is more complicated.

Use:

- [Openzeppelin contracts](https://github.com/OpenZeppelin/openzeppelin-contracts).
- [Solidity patterns](https://github.com/fravoll/solidity-patterns). Some code and ideas can be reused with care because
  part of might be outdated.

# Contract upgrade

This is a summary of the solidity breaking changes plus some opinions about what to do in some cases

## V0.5 -> 0.6

Based on [060-breaking-changes](https://docs.soliditylang.org/en/v0.6.0/060-breaking-changes.html).

- The function push(value) for dynamic storage arrays does not return the new length anymore (it returns nothing).
    - Change `uint length = array.push(value)` to `array.push(value);`. The new length can be accessed via array.length.
    - Change `array.length++` to `array.push()` to increase, and use `pop()` to decrease the length of a storage array.
- Add virtual to every non-interface function you intend to override. Add virtual to all functions without
  implementation outside interfaces. For single inheritance, add override to every overriding function. For multiple
  inheritance, add `override(A, B, ..)`, where you list all contracts that define the overridden function in the
  parentheses. When multiple bases define the same function, the inheriting contract must override all conflicting
  functions.
- Take some time to understand the relationship between the new `receive` and `fallback function`.
  Replace `function () external [payable] { ... }` by either `receive() external payable { ... }`, `fallback()
  external [payable] { ... }` or both. Prefer using a `receive` function only, whenever possible.
- Change `address(f)` to `f.address` for f being of external function type.
- The try/catch statement allows you to react on failed external calls.

## V0.6 -> V0.7

Base on [070-breaking-changes](https://docs.soliditylang.org/en/v0.7.0/070-breaking-changes.html).

- Using A for B only affects the contract it is mentioned in. Repeat the using A for B statements in all derived
  contracts if needed.
- Visibility (public / external) is not needed for constructors anymore: To prevent a contract from being created, it
  can be marked abstract.
    - Remove the public keyword from every constructor.
    - Remove the internal keyword from every constructor and add abstract to the contract (if not already present).
- Change `now` to `block.timestamp`.
- String literals now can only contain printable ASCII characters and this also includes a variety of escape sequences,
  such as hexadecimal (\xff) and unicode escapes (\u20ac). Unicode string literals are supported now to accommodate
  valid UTF-8 sequences. They are identified with the unicode prefix: `unicode"Hello 😃"`.
- In external function and contract creation calls, Ether and gas is now specified using a new syntax, change:
    - `x.f.value(...)()` to `x.f{value: ...}()`.
    - `(new C).value(...)()` to `new C{value: ...}()`.
    - `x.f.gas(...).value(...)()` to `x.f{gas: ..., value: ...}()`.
- Exponentiation and shifts of literals by non-literals (e.g. 1 << x or 2 ** x) will always use either the type
  uint256 (for non-negative literals) or int256 (for negative literals) to perform the operation. Previously, the
  operation was performed in the type of the shift amount / the exponent which can be misleading. Change types of right
  operand in shift operators to unsigned types. For example change `x >> (256 - y)`
  to `x >> uint(256 f- y)`. Shifts by signed types are disallowed. Previously, shifts by negative amounts were allowed,
  but reverted at runtime.
- State Mutability: The state mutability of functions can now be restricted during inheritance: Functions with default
  state mutability can be overridden by pure and view functions while view functions can be overridden by pure
  functions. At the same time, public state variables are considered view and even pure if they are constants.
- If a struct or array contains a mapping, it can only be used in storage. Previously, mapping members were silently
  skipped in memory, which is confusing and error-prone.
- Assignments to structs or arrays in storage does not work if they contain mappings. Previously, mappings were silently
  skipped during the copy operation, which is misleading and error-prone.
- Multiple events with the same name and parameter types in the same inheritance hierarchy are disallowed.
- The keyword var cannot be used anymore.

## V0.7 -> V0.8

Base on [080-breaking-changes](https://docs.soliditylang.org/en/breaking/080-breaking-changes.html).

- ***No more use of safe math***. Arithmetic operations revert on underflow and overflow. You can use unchecked { ... }
  to use the previous wrapping behaviour. Regular operators do the checks automatically and revert. If you use SafeMath
  or a similar library, change `x.add(y)` to `x + y`, `x.mul(y)` to `x * y` etc.
- ABI coder v2 is activated by default. (TO DISCUSS CONTRACT SIZE!!!). use: `pragma abicoder v1;` to use the old
  encoder. Remove `pragma experimental ABIEncoderV2` or `pragma abicoder v2` since it is redundant.
- The type `byte` has been removed. Change `byte` to `bytes1`.
- Exponentiation is right associative, i.e., the expression `a**b**c` is parsed as `a**(b**c)`. Before it was parsed
  as `(a**b)**c`. Change `x**y**z` to `(x**y)**z`.
- Unary negation cannot be used on unsigned integers anymore, only on signed integers. Negate unsigned integers by
  subtracting them from the maximum value of the type and adding 1 (e.g. `type(uint256).max - x + 1`, while ensuring
  that x is not zero)
- There are new restrictions related to explicit conversions of literals and address literals have the type `address`
  instead of `address payable`. The global variables `tx.origin` and `msg.sender` have the type `address` instead
  of `address payable`. One can convert them using an explicit conversion.
- The global functions log0, log1, log2, log3 and log4 have been removed use inline assembly as a replacement for `log0`
  , `log1`, etc.
- When calling another contract:
    - combine `c.f{gas: 10000}{value: 1}()` to `c.f{gas: 10000, value: 1}()`.
    - Change `msg.sender.transfer(x)` to `payable(msg.sender).transfer(x)` or use a stored variable of address payable
      type.

## References

- [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html#contract-and-library-names)
- [Security Recommendations](https://consensys.github.io/smart-contract-best-practices/recommendations).
- [Solidity Patterns](https://github.com/fravoll/solidity-patterns).
- [060-breaking-changes](https://docs.soliditylang.org/en/v0.6.0/060-breaking-changes.html).
- [070-breaking-changes](https://docs.soliditylang.org/en/v0.7.0/070-breaking-changes.html).
- [080-breaking-changes](https://docs.soliditylang.org/en/breaking/080-breaking-changes.html).

