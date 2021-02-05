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
        uint256[] assetIds;
        uint256[] assetValues;
        address assetContractAddress;
        uint256[] landIds;
        address landContractAddress;
        uint256[] erc20Amounts;
        address[] erc20ContractAddresses;
        bytes32 salt;
    }

    event ClaimedMultipleTokens(
        uint256 giveawayNumber,
        address to,
        uint256[] assetIds,
        uint256[] assetValues,
        address assetContractAddress,
        uint256[] landIds,
        address landContractAddress,
        uint256[] erc20Amounts,
        address[] erc20ContractAddresses
    );

    /// @dev TODO docs.
    function _claimMultipleTokens(Claim memory claim, bytes32[] calldata proof) internal {
        _checkValidity(claim, proof);
        _transferERC1155(claim.to, claim.assetIds, claim.assetValues, claim.assetContractAddress);
        _transferERC721(claim.to, claim.landIds, claim.landContractAddress);
        _transferERC20(claim.to, claim.erc20Amounts, claim.erc20ContractAddresses);
        emit ClaimedMultipleTokens(
            claim.giveawayNumber,
            claim.to,
            claim.assetIds,
            claim.assetValues,
            claim.assetContractAddress,
            claim.landIds,
            claim.landContractAddress,
            claim.erc20Amounts,
            claim.erc20ContractAddresses
        );
    }

    function _checkValidity(Claim memory claim, bytes32[] memory proof) private view {
        require(claim.assetIds.length == claim.assetValues.length, "INVALID_INPUT");
        require(claim.erc20Amounts.length == claim.erc20ContractAddresses.length, "INVALID_INPUT");
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
                    claim.assetIds,
                    claim.assetValues,
                    claim.assetContractAddress,
                    claim.landIds,
                    claim.landContractAddress,
                    claim.erc20Amounts,
                    claim.erc20ContractAddresses,
                    claim.salt
                )
            );
    }

    function _transferERC1155(
        address to,
        uint256[] memory assetIds,
        uint256[] memory assetValues,
        address assetContractAddress
    ) private {
        IERC1155(assetContractAddress).safeBatchTransferFrom(address(this), to, assetIds, assetValues, "");
    }

    function _transferERC721(
        address to,
        uint256[] memory landIds,
        address landContractAddress
    ) private {
        IERC721Extended(landContractAddress).safeBatchTransferFrom(address(this), to, landIds, "");
    }

    function _transferERC20(
        address to,
        uint256[] memory erc20Amounts,
        address[] memory erc20ContractAddresses
    ) private {
        for (uint256 i = 0; i < erc20Amounts.length; i++) {
            address erc20ContractAddress = erc20ContractAddresses[i];
            uint256 erc20Amount = erc20Amounts[i];
            require(IERC20(erc20ContractAddress).transferFrom(address(this), to, erc20Amount), "ERC20_TRANSFER_FAILED");
        }
    }
}
