//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

library MisteryBoxHelper {
    enum ContractType {ERC721, ERC1155}

    struct TransferData {
        uint8 contractType;
        address contractAddress;
        address from;
        address to;
        uint256 tokenId;
        uint256 amount;
    }

    function isContractTypeValid(uint8 contractType) internal pure returns (bool) {
        return contractType == uint8(ContractType.ERC721) || contractType == uint8(ContractType.ERC1155);
    }

    function isERC721(uint8 contractType) internal pure returns (bool) {
        return contractType == uint8(ContractType.ERC721);
    }

    function isERC1155(uint8 contractType) internal pure returns (bool) {
        return contractType == uint8(ContractType.ERC1155);
    }
}
