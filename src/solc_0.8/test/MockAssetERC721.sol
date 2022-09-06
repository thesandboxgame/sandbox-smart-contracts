//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {AssetERC721} from "../polygon/root/asset/AssetERC721.sol";
import {BaseERC721} from "../assetERC721/BaseERC721.sol";
import {IOperatorFilterRegistry} from "../OperatorFilterer/interfaces/IOperatorFilterRegistry.sol";

contract MockAssetERC721 is AssetERC721 {
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

    /// @notice Mint without the minter check for test.
    /// @param to Address that will receive the token.
    /// @param id ERC721 id to be used.
    function mintWithOutMinterCheck(address to, uint256 id) external {
        BaseERC721.mint(to, id);
    }
}
