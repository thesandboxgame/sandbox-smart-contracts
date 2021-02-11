//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "../../common/Interfaces/IERC721Extended.sol";
import "../../common/Libraries/Verify.sol";

contract ClaimERC1155ERC721ERC20 {
    using SafeERC20 for IERC20;

    struct Claim {
        address to;
        ERC1155Claim[] erc1155;
        ERC721Claim[] erc721;
        ERC20Claim erc20;
        bytes32 salt;
    }

    struct ERC1155Claim {
        uint256[] ids;
        uint256[] values;
        address contractAddress;
    }

    struct ERC721Claim {
        uint256[] ids;
        address contractAddress;
    }

    struct ERC20Claim {
        uint256[] amounts;
        address[] contractAddresses;
    }

    event ClaimedMultipleTokens(address to, ERC1155Claim[] erc1155, ERC721Claim[] erc721, ERC20Claim erc20);

    /// @dev TODO docs.
    function _claimERC1155ERC721ERC20(
        bytes32 merkleRoot,
        Claim memory claim,
        bytes32[] calldata proof
    ) internal {
        _checkValidity(merkleRoot, claim, proof);
        for (uint256 i = 0; i < claim.erc1155.length; i++) {
            require(claim.erc1155[i].ids.length == claim.erc1155[i].values.length, "INVALID_INPUT");
            _transferERC1155(claim.to, claim.erc1155[i].ids, claim.erc1155[i].values, claim.erc1155[i].contractAddress);
        }
        for (uint256 i = 0; i < claim.erc721.length; i++) {
            _transferERC721(claim.to, claim.erc721[i].ids, claim.erc721[i].contractAddress);
        }
        if (claim.erc20.amounts.length != 0) {
            require(claim.erc20.amounts.length == claim.erc20.contractAddresses.length, "INVALID_INPUT");
            _transferERC20(claim.to, claim.erc20.amounts, claim.erc20.contractAddresses);
        }
        emit ClaimedMultipleTokens(claim.to, claim.erc1155, claim.erc721, claim.erc20);
    }

    function _checkValidity(
        bytes32 merkleRoot,
        Claim memory claim,
        bytes32[] memory proof
    ) private pure {
        bytes32 leaf = _generateClaimHash(claim);
        require(Verify.doesComputedHashMatchMerkleRootHash(merkleRoot, proof, leaf), "INVALID_CLAIM");
    }

    function _generateClaimHash(Claim memory claim) private pure returns (bytes32) {
        return keccak256(abi.encode(claim));
    }

    function _transferERC1155(
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        address contractAddress
    ) private {
        require(contractAddress != address(0), "INVALID_CONTRACT_ZERO_ADDRESS");
        IERC1155(contractAddress).safeBatchTransferFrom(address(this), to, ids, values, "");
    }

    function _transferERC721(
        address to,
        uint256[] memory ids,
        address contractAddress
    ) private {
        require(contractAddress != address(0), "INVALID_CONTRACT_ZERO_ADDRESS");
        IERC721Extended(contractAddress).safeBatchTransferFrom(address(this), to, ids, "");
    }

    function _transferERC20(
        address to,
        uint256[] memory amounts,
        address[] memory contractAddresses
    ) private {
        for (uint256 i = 0; i < amounts.length; i++) {
            address erc20ContractAddress = contractAddresses[i];
            uint256 erc20Amount = amounts[i];
            require(erc20ContractAddress != address(0), "INVALID_CONTRACT_ZERO_ADDRESS");
            IERC20(erc20ContractAddress).safeTransferFrom(address(this), to, erc20Amount);
        }
    }
}
