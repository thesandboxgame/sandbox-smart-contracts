# Gems & Catalyst

## Introduction

The aim of this document is to explain how Gems & catalysts work and how they are tracked by the smart contracts.

Roughly a **catalyst** is a container for **gems**. The rarer the catalyst, the more gems it may contain. The user can then equip his asset with a catalyst in order to add ability to it. The gems are of different **types** (luck, power...). Depending on their types, the gems will have a different effect in games. One Gem will be able to provide up to 25 **attribute** points of a specific type.

From now on we will call gems and catalysts G&C.

G&C in action:
![](https://miro.medium.com/max/3600/0*9tVheYzwmmALkJBa)

For more information checkout this [introduction on Gems & Catalysts](https://medium.com/sandbox-game/presenting-the-sandbox-gems-catalysts-f017a18ff5fb).

## Model

### Catalyst

Each catalyst type is a different ERC20 smart contract (ie Catalyst RARE is a smart contract, Catalyst LEGENDARY another...).

Retrieve from [here](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/data/catalysts.ts)

| Id  | Catalyst type | Max Gems |
| --- | ------------- | -------- |
| 1   | COMMON        | 1        |
| 2   | RARE          | 2        |
| 3   | EPIC          | 3        |
| 4   | LEGENDARY     | 4        |

### Gem

Like catalyst, each gem type is a different ERC-20 smart contract (ie Gems Power, Gems Luck...). Internally every contract is identified by the Ids defined in the following table.

Retrieve from [here](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/data/gems.ts)

| Id  | Gem type | Attribute point |
| --- | -------- | --------------- |
| 1   | POWER    | 1..25           |
| 2   | DEFENSE  | 1..25           |
| 3   | MAGIC    | 1..25           |
| 4   | LUCK     | 1..25           |

More on attribute point logic [here](https://sandboxgame.gitbook.io/the-sandbox/assets/gems-and-catalysts/attributes-and-behaviours)

### Registry

The GemsCatalystsRegistry contract manage every G&C contract, it can add new G&C contract, handle Id's, burn differents tokens in one transaction, expose attributes of an asset... It could handle meta-transaction, use admin and super-operator.

This contract store every G&C contracts in open arrays. One could add new G&C types by calling `addGemsAndCatalysts`. The caller of this function has to take care that the contracts Ids match the order in the corresponding array, some require in the code ensure that it fail if not in order. Please note that Ids are 1-based while index in array are 0-based.

| Feature            | Link                                                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract           | [GemsCatalystsRegistry.sol](https://github.com/thesandboxgame/sandbox-smart-contracts/blob/master/src/solc_0.8/catalyst/GemsCatalystsRegistry.sol) |
| ERC2771 (Meta-Tx)  | [OpenZeppelin contract](https://docs.openzeppelin.com/contracts/4.x/api/metatx#ERC2771Context)                                                     |
| WithSuperOperators | Yes                                                                                                                                                |

### Class diagram

```plantuml
title class diagram
interface IGemsCatalystsRegistry {

}

class GemsCatalystsRegistry #palegreen{
+ getAttributes(...)
+ getMaxGems(...)
+ burnDifferentGems(...)
+ burnDifferentCatalysts(...)
+ batchBurnGems(...)
+ batchBurnCatalysts(...)
+ addGemsAndCatalysts(...)
+ doesGemExist(...)
+ burnCatalyst(...)
+ burnGem(...)
}
note top of ERC2771Context : "Meta-transaction handler"
abstract ERC2771Context {}
class WithSuperOperators {}
class WithAdmin {}
class Gem #palegreen{
    + uint16 gemId
}
class DefaultAttributes{}
class Catalyst #palegreen{
    + uint16 catalystId
    - uint8  _maxGems
    +  getAttributes(...)
}
interface IAttributes
class ERC20Token

IGemsCatalystsRegistry <|.. GemsCatalystsRegistry
ERC2771Context <|-- GemsCatalystsRegistry
WithSuperOperators <|-- GemsCatalystsRegistry
WithAdmin<|--WithSuperOperators
ERC20Token<|--Gem
ERC20Token<|--Catalyst
IAttributes<|..Catalyst
DefaultAttributes -- Catalyst
IAttributes <|.. DefaultAttributes
Gem o-- GemsCatalystsRegistry
Catalyst o--GemsCatalystsRegistry
```

## Processes

### Get every attribute of gems on a catalyst in an asset

An asset can fetch all the gems data of a catalyst it's currently owning by getting the attributes from the Gems & Catalyst registry with `GemsCatalystRegistry.GetAttributes`.

```plantuml

title sequence diagram


entity GemsCatalystsRegistry
entity Catalyst
entity DefaultAttributes

note right of GemsCatalystsRegistry
An asset has to be minted with G&C.
A CatalystApplied events are then created.
The events param is retrieve from these events.
end note

-> GemsCatalystsRegistry: getAttributes(catalystId, assetId, events[])
GemsCatalystsRegistry -> Catalyst: getAttributes(assetId, events[])
Catalyst -> DefaultAttributes: getAttributes(assetId, events[])
note over  DefaultAttributes: Random values are calculated using gems data in event[]
Catalyst <-- DefaultAttributes: values []
GemsCatalystsRegistry <-- Catalyst: values []
<--GemsCatalystsRegistry: values []

```

### Burn 1 LEGENDARY and 1 EPIC Catalyst in batch

For this example we assume that an asset wants to burn two catalysts in a single tx. All the Asset part is out of scope, see [Asset documentation](../asset/asset.md).
The same can be done for gems with `batchBurnGems`.

```plantuml

entity AssetMinter
entity GemsCatalystsRegistry
entity "LEGENDARY Catalyst" as L
entity "EPIC Catalyst" as E


AssetMinter ->GemsCatalystsRegistry: BatchBurnCatalysts(from,  catalystIds[4,3], amounts[1,1])
note over GemsCatalystsRegistry: retrieve LEGENDARY catalyst contract
GemsCatalystsRegistry -> GemsCatalystsRegistry: getCatalyst(catalystId=4)
GemsCatalystsRegistry -> L: burnFor(from, 1)

note over GemsCatalystsRegistry: retrieve EPIC catalyst contract
GemsCatalystsRegistry -> GemsCatalystsRegistry: getCatalyst(catalystId=3)
GemsCatalystsRegistry -> E: burnFor(from, 1)

```
