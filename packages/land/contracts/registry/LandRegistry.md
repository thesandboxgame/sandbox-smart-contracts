# Audience

The intended audience for .md documentation is auditors, internal developers and
external developer contributors.

# Features

A [LAND](https://sandboxgame.gitbook.io/the-sandbox/land/what-is-land) is a
digital piece of real-estate in The Sandbox's metaverse. Each LAND is a unique
piece of the metaverse map which is a grid of 408x408 lands.

We want to:

- store on-chain if a LAND is premium or regular, so we can gate some features
  based on this information.
- add an extra information on-chain to "categorize" a LAND with its
  neighborhood, in order to be able to detect in which area/neighborhood this
  LAND is located.

The LandRegistry contract implements a metadata registry for the
[Land](../Land.md) and [PolygonLand](../PolygonLand.md) contracts to store the
premium and neighborhood information.

Given a land TokenId we store:

- Premiumness: a flag that indicates if a land is premium.
- Neighborhood: Lands are grouped in neighborhoods. There are 127 different
  neighborhoods.

## Roles

The land contract has a list of addresses that are the administrators and can
change the metadata for any token.

# Implementation

- Each land type (premiumness + neighborhood) takes 8 bits (1 byte)
- We pack 32 land types in a 32 byte EVM word, so we use 5202 EVM words for the
  whole map.

## Land type

- Key of the map: tokenId / 32
- Value of the map: in each 256 bits we store 32 land types
- Index inside each word: tokenId mod 32

### Land Type

Land Type is stored in a mapping: `mapping(uint256 key => uint256 value)`. Where
key is tokenId / 32 and values is the land type.

| Land Type: 8 bits                              |
| ---------------------------------------------- |
| 1 bit Premiumness + 7 bits Neighborhood number |

### EVM WORD

| Land type 1 | Land type 2 | Land type 3 | Land type 4 | Land type 5 | …   | Land type 28 | Land type 29 | Land type 30 | Land type 31 | Land type 32 |
| ----------- | ----------- | ----------- | ----------- | ----------- | --- | ------------ | ------------ | ------------ | ------------ | ------------ |

### Neighborhood Name

Neighborhood name is stored in the following mapping:
`mapping(uint256 => string) neighborhoodName` it maps from neighborhood number
(1 - 127) to name.
