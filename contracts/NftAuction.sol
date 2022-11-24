// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AuctionItemStorage/DLLStack.sol";

contract NftAuction is ReentrancyGuard, Ownable, DLLStack {
    address public auctionOwner;
    uint256 public listingFee;

    enum AuctionState {
        INACTIVE,
        ACTIVE
    }

    AuctionState public auctionState;

    constructor(address _auctionOwner, uint256 _listingFee) {
        auctionOwner = _auctionOwner;
        listingFee = _listingFee;
    }

    function listNft(
        address tokenFactAddr,
        uint256 tokenId,
        uint256 startingPrice
    ) external payable nonReentrant {
        require(msg.value == listingFee, "listNft: Wrong amount");
        DLLStack._pushToStack(tokenFactAddr, tokenId, startingPrice);
        IERC721(tokenFactAddr).transferFrom(msg.sender, address(this), tokenId);

    }

    function delistNft(address tokenFactAddr, bytes32 key) external {
        require(
            msg.sender == DLLStack._nodes[key].nftListing.seller,
            "delistNft: Not lister"
        );
        uint256 tokenId = DLLStack._nodes[key].nftListing.tokenId;
        DLLStack._removeStackItem(key);
        IERC721(tokenFactAddr).transferFrom(address(this), msg.sender, tokenId);
    }

    function auctionNextNft() external {
        DLLStack._popFromStack();
    }

    function changeListingFee(uint256 newFee) external onlyOwner {
        listingFee = newFee;
    }

    function getCurrentNft() external view returns (DLLStack.Node memory) {
        return DLLStack._getTopOfStack();
    }

    function getAllListings() external view returns (DLLStack.Node[] memory) {
        return DLLStack._getStackItems();
    }
}
