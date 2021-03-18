import {MultiClaim} from '../../../lib/merkleTreeHelper';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const exampleClaim: MultiClaim = {
  to: "reservedAddress",
  erc1155: [
    {
      ids: ['1', '2', '3'], // ERC1155 ids e.g. asset IDs
      values: [10, 10, 10], // ERC1155 values e.g. asset values
      contractAddress: "assetAddress" // ERC1155 contract address e.g. asset
    },
    {
      ids: ['1', '2', '3' ], // ERC1155 ids
      values: [5, 5, 5], // ERC1155 values
      contractAddress: "anotherERC1155Address" // ERC1155 contract address
    },
  ],
  erc721: [
    {
      ids: [1, 2], // ERC721 ids e.g. land IDs
      contractAddress: "landAddress" // ERC721 contract address e.g. land
    },
    {
      ids: [1, 2], // ERC721 ids
      contractAddress: "anotherERC721Address" // ERC721 contract address
    }
  ],
  erc20: {
    amounts: [200, 4, 1, 10], // ERC20 amounts
    contractAddresses: ["sandAddress", "speedGemAddress", "rareCatalystAddress", "anotherERC20Address"] // ERC20 contract addresses
  }
}


