// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { OAppRead } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppRead.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { AddressCast } from "@layerzerolabs/lz-evm-protocol-v2/contracts/libs/AddressCast.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { ReadCodecV1, EVMCallRequestV1 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/ReadCodecV1.sol";

/**
 * @title ShadowLAND
 * @notice ERC721 contract for shadow-minting LAND tokens using LayerZero V2 read functionality.
 * @dev Inherits ERC721, Ownable, OAppRead, and OAppOptionsType3. Uses LayerZero for cross-chain read operations.
 */
contract ShadowLAND is ERC721, Ownable, OAppRead, OAppOptionsType3 {
    // Custom errors
    error InvalidContract();
    error InsufficientFee(uint256 required, uint256 provided);
    error UnknownRequest();
    error NotOwnerOnOriginChain(address expected, address actual);
    error TokenAlreadyMinted(uint256 tokenId);

    /// @notice Address of the root LAND contract (e.g. Ethereum LAND)
    address public rootLAND;
    /// @notice Address of the child LAND contract (e.g. Polygon LAND)
    address public childLAND;
    /// @notice Chain ID for the root chain (e.g. 1 for Ethereum mainnet)
    uint256 public rootChainId;
    /// @notice Chain ID for the child chain (e.g. 137 for Polygon)
    uint256 public childChainId;

    struct Pending {
        address user;
        uint256 tokenId;
        uint256 originChainId;
        address originContract;
    }
    /// @notice Mapping of LayerZero request nonces to pending shadow mint requests
    mapping(uint64 => Pending) public pendingRequests;

    /// @notice Emitted when a shadow token is minted
    /// @param shadowId The tokenId of the shadow-minted LAND
    /// @param originChainId The chain ID of the origin LAND
    /// @param originContract The contract address of the origin LAND
    /// @param owner The owner of the shadow-minted LAND
    event ShadowMinted(uint256 shadowId, uint256 originChainId, address originContract, address indexed owner);

    /// @notice LayerZero read channel ID - set to the appropriate channel for your deployment
    uint32 public READ_CHANNEL;
    /// @notice LayerZero read type constant
    uint16 public constant READ_TYPE = 1;

    /**
     * @notice Deploy the ShadowLAND contract
     * @param _endpoint The LayerZero endpoint address for this chain
     * @param _rootLand The address of the root LAND contract 
     * @param _childLand The address of the child LAND contract
     * @param _readChannel The LayerZero read channel ID
     * @param _rootChainId The chain ID for the root chain 
     * @param _childChainId The chain ID for the child chain 
     */
    constructor(
        address _endpoint, 
        address _rootLand, 
        address _childLand,
        uint32 _readChannel,
        uint256 _rootChainId,
        uint256 _childChainId
    ) ERC721("Shadow LAND", "sLAND") Ownable(msg.sender) OAppRead(_endpoint, msg.sender) {
        rootLAND = _rootLand;
        childLAND = _childLand;
        rootChainId = _rootChainId;
        childChainId = _childChainId;
        READ_CHANNEL = _readChannel;
        _setPeer(_readChannel, AddressCast.toBytes32(address(this)));
    }

    /**
     * @notice Initiate a shadow mint for a LAND token from the origin chain
     * @dev Sends a LayerZero read request to verify ownership on the origin chain
     * @param tokenId The tokenId of the LAND to shadow-mint
     * @param originChainId The chain ID of the origin LAND
     * @param originContract The contract address of the origin LAND
     */
    function mintShadow(uint256 tokenId, uint256 originChainId, address originContract) external payable {
        if (!((originChainId == rootChainId && originContract == rootLAND) ||
            (originChainId == childChainId && originContract == childLAND))) {
            revert InvalidContract();
        }
        // Create the read request to query the owner of the token on the origin chain
        bytes memory readRequest = _getReadRequest(originContract, uint32(originChainId), tokenId);
        // Get the messaging fee for the read operation
        MessagingFee memory fee = _quote(
            READ_CHANNEL,
            readRequest,
            bytes(""),
            false
        );
        if (msg.value < fee.nativeFee) {
            revert InsufficientFee(fee.nativeFee, msg.value);
        }
        // Send the read request
        MessagingReceipt memory receipt = _lzSend(
            READ_CHANNEL,
            readRequest,
            bytes(""),
            fee,
            msg.sender
        );
        // Store the pending request with the nonce from the receipt
        pendingRequests[receipt.nonce] = Pending(msg.sender, tokenId, originChainId, originContract);
    }

    /**
     * @notice LayerZero receive handler for read responses
     * @dev Decodes the response and mints the shadow token if ownership is verified
     * @param _origin The LayerZero origin struct
     * @param _message The LayerZero message payload
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /* _guid */,
        bytes calldata _message,
        address /* _executor */,
        bytes calldata /* _extraData */
    ) internal override {
        // Decode the request (simulate: only one request, appRequestLabel = 0)
        ReadCodecV1.decodeEVMCallRequestV1(_message, 0, 0);

        // Find the pending request using the nonce from the origin
        Pending memory p = pendingRequests[_origin.nonce];
        if (p.user == address(0)) revert UnknownRequest();

        // Decode the owner address from the response
        // (simulate: last 32 bytes of message is the address)
        address owner;
        assembly {
            owner := shr(96, calldataload(sub(add(_message.offset, _message.length), 32)))
        }
        delete pendingRequests[_origin.nonce];

        // Ensure the owner is the same as the user on the origin chain
        if (owner != p.user) revert NotOwnerOnOriginChain(p.user, owner);

        // Ensure that only one shadow token is minted for each LAND tokenId
        // We can do this since tokenIds are kept when bridging between root and child chains
        // It is possible that LAND tokenIds exist on root and child at the same time,
        // however the owner will be the tunnel contract address on one side and the user on the other side at any given time
        if (_exists(p.tokenId)) revert TokenAlreadyMinted(p.tokenId);

        // Mint the shadow token id with the user as the owner
        // We retain the origin tokenId for the shadowId
        _safeMint(p.user, p.tokenId);
        emit ShadowMinted(p.tokenId, p.originChainId, p.originContract, p.user);
    }

    /**
     * @notice Internal helper to build a LayerZero read request for ERC721.ownerOf
     * @param targetContract The contract address to query
     * @param targetEid The chain ID to query
     * @param tokenId The tokenId to query
     * @return The encoded LayerZero read request
     */
    function _getReadRequest(address targetContract, uint32 targetEid, uint256 tokenId) internal view returns (bytes memory) {
        // EVMCallRequestV1 has 8 fields, so we must provide all
        EVMCallRequestV1 memory request = EVMCallRequestV1({
            appRequestLabel: 0,
            targetEid: targetEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: targetContract,
            callData: abi.encodeWithSelector(ERC721.ownerOf.selector, tokenId)
        });
        EVMCallRequestV1[] memory requests = new EVMCallRequestV1[](1);
        requests[0] = request;
        // Use the encode function for a single request, appCmdLabel = 0
        return ReadCodecV1.encode(0, requests);
    }

    /**
     * @notice Quotes the LayerZero read fee for a shadow mint request
     * @param tokenId The tokenId of the LAND to shadow-mint
     * @param originChainId The chain ID of the origin LAND
     * @param originContract The contract address of the origin LAND
     * @return The LayerZero MessagingFee struct
     */
    function quoteReadFee(uint256 tokenId, uint256 originChainId, address originContract) external view returns (MessagingFee memory) {
        if (!((originChainId == rootChainId && originContract == rootLAND) ||
            (originChainId == childChainId && originContract == childLAND))) {
            revert InvalidContract();
        }
        bytes memory readRequest = _getReadRequest(originContract, uint32(originChainId), tokenId);
        return _quote(
            READ_CHANNEL,
            readRequest,
            bytes(""),
            false
        );
    }

    /**
     * @notice Returns whether the specified token exists
     * @param tokenId The tokenId to query
     * @return bool True if the token exists, false otherwise
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
}
