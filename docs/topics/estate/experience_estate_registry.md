
---
description: Experience Estate Registry
---

# ExperienceEstateRegistry

## Introduction
Registry contract to keep links between single lands or estates with experiences.

## Model

### Features of the contract

|              Feature | Link                                   |
| --------------------:|:-------------------------------------- |
|        `Upgradeable` | Yes                                     |
|             `Minter` | No                                     |
| `WithSuperOperators` | No                                    |

### Class diagram
```plantuml
title class diagram


class IEstateExperienceRegistry{
    + link(estateId, expId, x, y)
    + unLink(expId)
    + function batchUnLinkFrom(from, expIdsToUnlink)
    + function isLinked(expId)
    + function isLinked(calldata quads[][3])
    + function isLinked(tiles[])
}
class ExperienceEstateRegistry{
    + getNumberTiles(expId)
    + getLandCount(expId)
    + getEstateId(expId)
    + linkSingle(estateId, expId, x, y)
    + unLink(expId)
    + relink(expIdsToUnlink[], expToLink)
    + batchUnLinkFrom(from, expIdsToUnlink)
    + isLinked(quads[][3])
    + isLinked(expId)
    + isLinked(tiles[])
    + setLandContract(newLandToken)
    + setEstateContract(newEstateToken)
    + setExperienceContract(newExperienceToken)
    + grantSetterRole(newSetter)?
    + revokeSetterRole(oldSetter)?
}

Initializable <|-- ExperienceEstateRegistry
ContextUpgradeable <|-- ExperienceEstateRegistry
AccessControlUpgradeable <|-- ExperienceEstateRegistry
IEstateExperienceRegistry <|-- ExperienceEstateRegistry


``` 

## Processes 

### Links
The ExperienceEstateRegistry is a registry to keep the links between experiences and either a single land or a group of lands, also known as estate.  



### Contract storage
```shell
       address experienceToken;
        address estateToken;
        address landToken;
        mapping(uint256 => EstateAndLands) links;
        MapLib.Map linkedLands;
```
* experienceToken;
* estateToken
* landToken
* mapping links
* linkedLands


#### Diamond proxy storage
EstateBaseToken adopts a diamond proxy approach to its storage
https://eips.ethereum.org/EIPS/eip-2535#:~:text=function%20diamondStorage()%20internal%20pure%20returns(DiamondStorage%20storage%20ds)%20%7B
```shell
function _s() internal pure returns (RegistryStorage storage ds) {
        bytes32 storagePosition = keccak256("ExperienceEstateRegistry.RegistryStorage");
        assembly {
            ds.slot := storagePosition
        }
    }
```    

### Link creation
A link can be created between an experience and either a single land or an estate(containing more than one land). The link creation will depend on the experience template, and if the submitted land(s) correspond to the template. 

The registry offer a specific function for the creation of links with a single land, *linkSingle*
#### Input for linkSingle link creation:
```shell
    /// @param expId the experience id
    /// @param x coordinate of the template
    /// @param y coordinate of the template
```

For links created with estates, use *link*
#### Input for estate link creation:
```shell
   /// @param estateId the estate id
    /// @param expId the experience id
    /// @param x coordinate of the template
    /// @param y coordinate of the template 
```

### Unlink
*unLink* functions allows users to unlink experiences from either land or estate. 

#### Input for unlink
```shell
 /// @param expId the experience id to be unlinked
```

### Relink
*relink* an experience, first erasing the previous link and creating a new one
#### Input for relink
```shell
    /// @param expIdsToUnlink array of experience ids to unlink
    /// @param expToLink RelinkData, containing 
    /// estateId: estate id to be linked
    /// expId: exp id to be linked
    /// x: template x coord
    /// y: template y coord
```    
### batchUnLinkFrom
Can only be called through the Estate contract
#### Input for batchUnLinkFrom
```shell
/// @param from owner of the links
/// @param expIdsToUnlink array of ids to be unlinked
```

### isLinked
isLinked can be used to check if a link exists. The function is overloaded with different types of inputs:
* Quad coordinates
* experience id
* tile with coordinates

#### Input for isLinked
##### by quad coordinates
```shell
/// @param quads set of quads to verify if they are linked
```
##### by quad experience id
```shell
/// @param expId experience id to verify if it is linked
```
##### by tile with coordinates
```shell
/// @param tiles tile with coordinate, to verify if is linked 
```


### setLandContract
Setter for updating the pointer to a different Land contract
#### Input for setLandContract
```shell
/// @param newLandToken new land token address
```
### setEstateContract
Setter for updating the pointer to a different Estate contract
#### Input for setEstateContract
```shell
/// @param newEstateToken new estate token address
```

### setExperienceContract
Setter for updating the pointer to a different Experience contract
#### Input for setExperienceContract
```shell
/// @param newExperienceToken new land token address
```
