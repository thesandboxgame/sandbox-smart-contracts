//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../common/Interfaces/IERC721Extended.sol";
import "../../common/Libraries/Verify.sol";

contract ClaimERC1155ERC721ERC20 {
    mapping(uint256 => bytes32) internal _merkleRoots;

    struct Claim {
        uint256 giveawayNumber;
        address to;
        ERC1155Claim erc1155;
        ERC721Claim erc721;
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

    event ClaimedMultipleTokens(
        uint256 giveawayNumber,
        address to,
        uint256[] erc1155Ids,
        uint256[] erc1155Values,
        address erc1155ContractAddress,
        uint256[] erc721Ids,
        address erc721ContractAddress,
        uint256[] erc20Amounts,
        address[] erc20ContractAddresses
    );

    /// @dev TODO docs.
    function _claimMultipleTokens(Claim memory claim, bytes32[] calldata proof) internal {
        _checkValidity(claim, proof);
        if (claim.erc1155.ids.length != 0)
            _transferERC1155(claim.to, claim.erc1155.ids, claim.erc1155.values, claim.erc1155.contractAddress);
        if (claim.erc721.ids.length != 0) _transferERC721(claim.to, claim.erc721.ids, claim.erc721.contractAddress);
        if (claim.erc20.amounts.length != 0)
            _transferERC20(claim.to, claim.erc20.amounts, claim.erc20.contractAddresses);
        emit ClaimedMultipleTokens(
            claim.giveawayNumber,
            claim.to,
            claim.erc1155.ids,
            claim.erc1155.values,
            claim.erc1155.contractAddress,
            claim.erc721.ids,
            claim.erc721.contractAddress,
            claim.erc20.amounts,
            claim.erc20.contractAddresses
        );
    }

    function _checkValidity(Claim memory claim, bytes32[] memory proof) private view {
        require(claim.erc1155.ids.length == claim.erc1155.values.length, "INVALID_INPUT");
        require(claim.erc20.amounts.length == claim.erc20.contractAddresses.length, "INVALID_INPUT");
        bytes32 leaf = _generateClaimHash(claim);
        require(
            Verify.doesComputedHashMatchMerkleRootHash(_merkleRoots[claim.giveawayNumber], proof, leaf),
            "INVALID_CLAIM"
        );
    }

    function _generateClaimHash(Claim memory claim) private pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    claim.giveawayNumber,
                    claim.to,
                    claim.erc1155.ids,
                    claim.erc1155.values,
                    claim.erc1155.contractAddress,
                    claim.erc721.ids,
                    claim.erc721.contractAddress,
                    claim.erc20.amounts,
                    claim.erc20.contractAddresses,
                    claim.salt
                )
            );
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
            require(IERC20(erc20ContractAddress).transferFrom(address(this), to, erc20Amount), "ERC20_TRANSFER_FAILED");
        }
    }
}
