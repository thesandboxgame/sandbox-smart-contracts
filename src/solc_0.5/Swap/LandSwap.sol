// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.5.9;

import "../Land/erc721/LandBaseToken.sol";
import "../contracts_common/Interfaces/ERC721MandatoryTokenReceiver.sol";
import "../BaseWithStorage/ERC2771Handler.sol";
import "../contracts_common/BaseWithStorage/PausableWithAdmin.sol";

contract LandSwap is ERC721MandatoryTokenReceiver, ERC2771Handler, PausableWithAdmin {
    bytes4 internal constant _ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant _ERC721_BATCH_RECEIVED = 0x4b808c46;

    LandBaseToken public _oldLand;
    LandBaseToken public _newLand;

    bool internal _initialized;

    modifier initializer() {
        require(!_initialized, "LandSwap: Contract already initialized");
        _;
    }

    function initialize (address admin, address trustedForwarder, address oldLand, address newLand) public initializer {
        _admin = admin;
        __ERC2771Handler_initialize(trustedForwarder);
        _oldLand = LandBaseToken(oldLand);
        _newLand = LandBaseToken(newLand);
        _initialized = true;
    }

    function onERC721BatchReceived(address, address, uint256[] calldata, bytes calldata) external returns (bytes4) {
        require(msg.sender == address(_oldLand), "NOT_OLD_LAND");
        return _ERC721_BATCH_RECEIVED;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        require(msg.sender == address(_oldLand), "NOT_OLD_LAND");
        return _ERC721_RECEIVED;
    }

    function swap(uint256[] calldata sizes, uint256[] calldata xs, uint256[] calldata ys, bytes calldata data) external whenNotPaused {
        address from = _msgSender();
        _oldLand.batchTransferQuad(from, address(this), sizes, xs, ys, data);
        for (uint256 i = 0; i < sizes.length; i++) {
            _newLand.mintQuad(from, sizes[i], xs[i], ys[i], data);
        }
    }

    function burn(uint256[] calldata ids) external whenNotPaused {
        for (uint256 i = 0; i < ids.length; i++) {
            _oldLand.burn(ids[i]);
        }
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x01ffc9a7 || id == 0x5e8bf644;
    }

    // Empty storage space in contracts for future enhancements
    // ref: https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/issues/13)
    uint256[49] private __gap;
}
