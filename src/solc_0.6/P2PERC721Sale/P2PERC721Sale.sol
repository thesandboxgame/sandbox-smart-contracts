pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "../common/BaseWithStorage/Admin.sol";
import "../common/Libraries/SigUtil.sol";
import "../common/Libraries/PriceUtil.sol";
import "../common/BaseWithStorage/MetaTransactionReceiver.sol";
import "../common/Interfaces/ERC721.sol";
import "../common/Interfaces/ERC20.sol";
import "../common/Interfaces/ERC1271.sol";
import "../common/Interfaces/ERC1271Constants.sol";
import "../common/Interfaces/ERC1654.sol";
import "../common/Interfaces/ERC1654Constants.sol";
import "../common/Libraries/SafeMathWithRequire.sol";

import "../Base/TheSandbox712.sol";


contract P2PERC721Sale is Admin, ERC1654Constants, ERC1271Constants, TheSandbox712, MetaTransactionReceiver {
    using SafeMathWithRequire for uint256;

    enum SignatureType {DIRECT, EIP1654, EIP1271}

    mapping(address => mapping(uint256 => uint256)) public claimed;

    uint256 private constant MAX_UINT256 = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    ERC20 internal _sand;
    uint256 internal _fee;
    address internal _feeCollector;

    struct Auction {
        uint256 id;
        address tokenAddress; // TODO support bundle : tokenAddress and tokenId should be arrays
        uint256 tokenId;
        address seller;
        uint256 startingPrice; // TODO support any ERC20 or ethereum as payment
        uint256 endingPrice;
        uint256 startedAt;
        uint256 duration;
    }

    event OfferClaimed(
        address indexed seller,
        address indexed buyer,
        uint256 indexed offerId,
        address tokenAddress,
        uint256 tokenId,
        uint256 pricePaid,
        uint256 feePaid
    );

    event OfferCancelled(address indexed seller, uint256 indexed offerId);

    event FeeSetup(address feeCollector, uint256 fee10000th);

    constructor(
        address sand,
        address admin,
        address feeCollector,
        uint256 fee,
        address initialMetaTx
    ) public {
        _sand = ERC20(sand);
        _admin = admin;

        _fee = fee;
        _feeCollector = feeCollector;
        emit FeeSetup(feeCollector, fee);

        _setMetaTransactionProcessor(initialMetaTx, true);
    }

    function setFee(address feeCollector, uint256 fee) external {
        require(msg.sender == _admin, "Sender not admin");
        _feeCollector = feeCollector;
        _fee = fee;
        emit FeeSetup(feeCollector, fee);
    }

    function _verifyParameters(address buyer, Auction memory auction) internal view {
        require(buyer == msg.sender || _metaTransactionContracts[msg.sender], "not authorized"); // if support any ERC20 :(token != address(0) &&

        require(claimed[auction.seller][auction.id] != MAX_UINT256, "Auction canceled");

        require(auction.startedAt <= now, "Auction has not started yet");

        require(auction.startedAt.add(auction.duration) > now, "Auction finished");
    }

    function claimSellerOffer(
        address buyer,
        address to,
        Auction calldata auction,
        bytes calldata signature,
        SignatureType signatureType,
        bool eip712
    ) external {
        _verifyParameters(buyer, auction);
        _ensureCorrectSigner(auction, signature, signatureType, eip712);
        _executeDeal(auction, buyer, to);
    }

    function _executeDeal(
        Auction memory auction,
        address buyer,
        address to
    ) internal {
        uint256 offer = PriceUtil.calculateCurrentPrice(
            auction.startingPrice,
            auction.endingPrice,
            auction.duration,
            now.sub(auction.startedAt)
        );

        claimed[auction.seller][auction.id] = offer;

        uint256 fee = 0;

        if (_fee > 0) {
            fee = PriceUtil.calculateFee(offer, _fee);
        }

        require(_sand.transferFrom(buyer, auction.seller, offer.sub(fee)), "Funds transfer failed"); // TODO feeCollector

        ERC721 token = ERC721(auction.tokenAddress);

        token.safeTransferFrom(auction.seller, to, auction.tokenId); // TODO test safeTransferFrom fail
    }

    function cancelSellerOffer(uint256 id) external {
        claimed[msg.sender][id] = MAX_UINT256;
        emit OfferCancelled(msg.sender, id);
    }

    function _ensureCorrectSigner(
        Auction memory auction,
        bytes memory signature,
        SignatureType signatureType,
        bool eip712
    ) internal view returns (address) {
        bytes memory dataToHash;

        if (eip712) {
            dataToHash = abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, _hashAuction(auction));
        } else {
            dataToHash = _encodeBasicSignatureHash(auction);
        }

        if (signatureType == SignatureType.EIP1271) {
            require(
                ERC1271(auction.seller).isValidSignature(dataToHash, signature) == ERC1271_MAGICVALUE,
                "Invalid 1271 sig"
            );
        } else if (signatureType == SignatureType.EIP1654) {
            require(
                ERC1654(auction.seller).isValidSignature(keccak256(dataToHash), signature) == ERC1654_MAGICVALUE,
                "Invalid 1654 sig"
            );
        } else {
            address signer = SigUtil.recover(keccak256(dataToHash), signature);
            require(signer == auction.seller, "Invalid sig");
        }
    }

    function _encodeBasicSignatureHash(Auction memory auction) internal view returns (bytes memory) {
        return
            SigUtil.prefixed(
                keccak256(
                    abi.encodePacked(
                        address(this),
                        auction.id,
                        auction.tokenAddress,
                        auction.tokenId,
                        auction.seller,
                        auction.startingPrice,
                        auction.endingPrice,
                        auction.startedAt,
                        auction.duration
                    )
                )
            );
    }

    function _hashAuction(Auction memory auction) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    auction.id,
                    auction.tokenAddress,
                    auction.tokenId,
                    auction.seller,
                    auction.startingPrice,
                    auction.endingPrice,
                    auction.startedAt,
                    auction.duration
                )
            );
    }
}
