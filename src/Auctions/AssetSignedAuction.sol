pragma solidity 0.5.9;

import "../../../contracts_common/src/Libraries/SigUtil.sol";
import "../../../contracts_common/src/Libraries/PriceUtil.sol";
import "../Sand.sol";
import "../Asset.sol";
import "../../../contracts_common/src/Interfaces/ERC20.sol";
import "../TheSandbox712.sol";
import "../../../contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";

contract AssetSignedAuction is TheSandbox712, MetaTransactionReceiver {
    bytes32 constant AUCTION_TYPEHASH = keccak256(
        "Auction(address token,uint256 offerId,uint256 startingPrice,uint256 endingPrice,uint256 startedAt,uint256 duration,uint256 packs,bytes ids,bytes amounts)"
    );

    event OfferClaimed(
        address indexed seller,
        address indexed buyer,
        uint256 indexed offerId,
        uint256 amount
    );
    event OfferCancelled(address indexed seller, uint256 indexed offerId);

    uint256 constant MAX_UINT256 = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    // Stack too deep, grouping parameters
    // AuctionData:
    uint256 constant AuctionData_OfferId = 0;
    uint256 constant AuctionData_StartingPrice = 1;
    uint256 constant AuctionData_EndingPrice = 2;
    uint256 constant AuctionData_StartedAt = 3;
    uint256 constant AuctionData_Duration = 4;
    uint256 constant AuctionData_Packs = 5;

    mapping(address => mapping(uint256 => uint256)) claimed;

    Asset _asset;
    uint256 _tax10000th = 0;
    address payable _taxCollector;

    event TaxSetup(address taxCollector, uint256 tax10000th);

    constructor(Asset asset, address admin, address initialMetaTx, address payable taxCollector, uint256 tax10000th) public {
        _asset = asset;
        _taxCollector = taxCollector;
        _tax10000th = tax10000th;
        emit TaxSetup(taxCollector, tax10000th);
        _admin = admin;
        _setMetaTransactionProcessor(initialMetaTx, true);
        init712();
    }

    function setTax(address payable taxCollector, uint256 tax10000th) external {
        require(msg.sender == _admin, "only admin can change tax");
        _taxCollector = taxCollector;
        _tax10000th = tax10000th;
        emit TaxSetup(taxCollector, tax10000th);
    }

    function _verifyParameters(
        address buyer,
        address payable seller,
        address token,
        uint256 buyAmount,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory signature
    ) internal {
        require(buyer == msg.sender || (token != address(0) && _metaTransactionContracts[msg.sender]), "not authorized");
        require(
            // TODO: do we remove seller from the argument list? and recover it ?
            seller == recover(token, auctionData, ids, amounts, signature),
            "Signature mismatches"
        );
        uint256 amountAlreadyClaimed = claimed[seller][auctionData[AuctionData_OfferId]];
        require(amountAlreadyClaimed != MAX_UINT256, "Auction cancelled");

        uint256 total = amountAlreadyClaimed + buyAmount;
        require(total >= amountAlreadyClaimed, "overflow");
        require(total <= auctionData[AuctionData_Packs], "Buy amount exceeds sell amount");

        require(
            auctionData[AuctionData_StartedAt] <= block.timestamp,
            "Auction didn't start yet"
        );
        require(
            auctionData[AuctionData_StartedAt] + auctionData[AuctionData_Duration] > block.timestamp,
            "Auction finished"
        );

    }

    function claimSellerOffer(
        address buyer,
        address payable seller,
        address token,
        uint256[] calldata purchase, // buyAmount, maxTokenAmount
        uint256[] calldata auctionData,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata signature
    ) external payable {
        _verifyParameters(
            buyer,
            seller,
            token,
            purchase[0],
            auctionData,
            ids,
            amounts,
            signature
        );
        _executeDeal(
            token,
            purchase,
            buyer,
            seller,
            auctionData,
            ids,
            amounts
        );
    }

    function _executeDeal(
        address token,
        uint256[] memory purchase,
        address buyer,
        address payable seller,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal {
        uint256 offer = PriceUtil.calculateCurrentPrice(
                auctionData[AuctionData_StartingPrice],
                auctionData[AuctionData_EndingPrice],
                auctionData[AuctionData_Duration],
                block.timestamp - auctionData[AuctionData_StartedAt]
            ) * purchase[0];
        claimed[seller][auctionData[AuctionData_OfferId]] += purchase[0];

        uint256 tax = 0;
        if(_tax10000th > 0) {
            tax = PriceUtil.calculateTax(offer, _tax10000th);
        }

        require(offer+tax <= purchase[1], "offer exceeds nax amount to spend");

        if (token != address(0)) {
            require(ERC20(token).transferFrom(buyer, seller, offer), "failed to transfer token price");
            if(tax > 0) {
                require(ERC20(token).transferFrom(buyer, _taxCollector, tax), "failed to collect tax");
            }
        } else {
            require(msg.value >= offer + tax, "ETH < offer+tax");
            if(msg.value > offer+tax) {
                msg.sender.transfer(msg.value - (offer+tax));
            }
            seller.transfer(offer);
            if(tax > 0) {
                _taxCollector.transfer(tax);
            }
        }

        uint256[] memory packAmounts = new uint256[](amounts.length);
        for (uint256 i = 0; i < packAmounts.length; i++) {
            packAmounts[i] = amounts[i] * purchase[0];
        }
        _asset.safeBatchTransferFrom(seller, buyer, ids, packAmounts, "");
        emit OfferClaimed(
            seller,
            buyer,
            auctionData[AuctionData_OfferId],
            purchase[0]
        );
    }

    function cancelSellerOffer(uint256 offerId) external {
        claimed[msg.sender][offerId] = MAX_UINT256;
        emit OfferCancelled(msg.sender, offerId);
    }

    // TODO support basic signature

    function recover(
        address token,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory signature
    ) internal view returns (address) {
        return
            SigUtil.recover(
                // This recreates the message that was signed on the client.
                keccak256(
                    abi.encodePacked(
                        "\x19\x01",
                        domainSeparator(),
                        hashAuction(token, auctionData, ids, amounts)
                    )
                ),
                signature
            );
    }

    function hashAuction(
        address token,
        uint256[] memory auctionData,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    AUCTION_TYPEHASH,
                    token,
                    auctionData[AuctionData_OfferId],
                    auctionData[AuctionData_StartingPrice],
                    auctionData[AuctionData_EndingPrice],
                    auctionData[AuctionData_StartedAt],
                    auctionData[AuctionData_Duration],
                    auctionData[AuctionData_Packs],
                    keccak256(abi.encodePacked(ids)),
                    keccak256(abi.encodePacked(amounts))
                )
            );
    }
}
