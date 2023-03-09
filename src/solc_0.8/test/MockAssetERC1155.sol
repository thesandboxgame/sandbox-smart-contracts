//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {AssetERC1155} from "../assetERC1155/AssetERC1155.sol";
import "../asset/libraries/ERC1155ERC721Helper.sol";
import {IOperatorFilterRegistry} from "../OperatorFilterer/interfaces/IOperatorFilterRegistry.sol";

contract MockAssetERC1155 is AssetERC1155 {
    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    function setOperatorRegistry(address registry) external {
        operatorFilterRegistry = IOperatorFilterRegistry(registry);
    }

    /// @notice registers and substribe to the subscription on the said deployed registry
    /// @param subscription the address to subcribe to
    function registerAndSubscribe(address subscription) external {
        operatorFilterRegistry.registerAndSubscribe(address(this), subscription);
    }

    /// @notice sets Approvals with operator filterer check in case to test the transfer.
    /// @param operator address of the operator to be approved
    /// @param approved bool value denoting approved (true) or not Approved(false)
    function setApprovalForAllWithOutFilter(address operator, bool approved) external {
        super._setApprovalForAll(_msgSender(), operator, approved);
    }

    /// @notice mint with out the bouncer check for the test
    /// @param creator address of the creator of the token.
    /// @param packId unique packId for that token.
    /// @param hash hash of an IPFS cidv1 folder that contains the metadata of the token type in the file 0.json.
    /// @param supply number of tokens minted for that token type.
    /// @param owner address that will receive the tokens.
    /// @param data extra data to accompany the minting call.
    /// @return id the id of the newly minted token type.
    function mintWithOutBouncerCheck(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint256 supply,
        address owner,
        bytes calldata data
    ) external returns (uint256 id) {
        require(hash != 0, "HASH==0");
        require(owner != address(0), "TO==0");
        id = _generateTokenId(creator, supply, packId, supply == 1 ? 0 : 1, 0);
        uint256 uriId = id & ERC1155ERC721Helper.URI_ID;
        require(uint256(_metadataHash[uriId]) == 0, "ID_TAKEN");
        _metadataHash[uriId] = hash;
        _mint(_msgSender(), owner, id, supply, data);
    }
}
