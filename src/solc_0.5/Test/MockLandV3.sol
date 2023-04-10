/* solhint-disable no-empty-blocks */

pragma solidity 0.5.9;

import {LandV3} from "../LandV3.sol";
import {IOperatorFilterRegistry} from "../OperatorFilterer/interfaces/IOperatorFilterRegistry.sol";

contract MockLandV3 is LandV3 {
    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    function setOperatorRegistry(address registry) external {
        operatorFilterRegistry = IOperatorFilterRegistry(registry);
    }

    /// @notice sets Approvals with operator filterer check in case to test the transfer.
    /// @param operator address of the operator to be approved
    /// @param approved bool value denoting approved (true) or not Approved(false)
    function setApprovalForAllWithOutFilter(address operator, bool approved) external {
        super._setApprovalForAll(msg.sender, operator, approved);
    }

      /**
     * @notice Mint a new quad (aligned to a quad tree with size 1, 3, 6, 12 or 24 only)
     * @param to The recipient of the new quad
     * @param size The size of the new quad
     * @param x The top left x coordinate of the new quad
     * @param y The top left y coordinate of the new quad
     * @param data extra data to pass to the transfer
     */
    function mintQuadWithOutMinterCheck(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external {
        require(to != address(0), "to is zero address");
        require(x % size == 0 && y % size == 0, "Invalid coordinates");
        require(x <= GRID_SIZE - size && y <= GRID_SIZE - size, "Out of bounds");

        (uint256 layer, , ) = _getQuadLayer(size);
        uint256 quadId = _getQuadId(layer, x, y);

        _checkOwner(size, x, y, 24);
        for (uint256 i = 0; i < size * size; i++) {
            uint256 _id = _idInPath(i, size, x, y);
            require(_owners[_id] == 0, "Already minted");
            emit Transfer(address(0), to, _id);
        }

        _owners[quadId] = uint256(to);
        _numNFTPerAddress[to] += size * size;

        _checkBatchReceiverAcceptQuad(msg.sender, address(0), to, size, x, y, data);
    }

    /// @notice This function is used to register Land contract on the Operator Filterer Registry of Opensea.can only be called by admin.
    /// @dev used to register contract and subscribe to the subscriptionOrRegistrantToCopy's black list.
    /// @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
    /// @param subscribe bool to signify subscription "true"" or to copy the list "false".
    function registerFilterer(address subscriptionOrRegistrantToCopy, bool subscribe) external {
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }
}