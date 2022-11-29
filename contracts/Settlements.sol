// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AuctionItems/AuctionItemStorage.sol";

contract Settlements is AuctionItemStorage, ReentrancyGuard {
    mapping(address => uint256) _balances;

    function settleItem(bytes32 itemKey) external payable {
        (
            uint256 price,
            uint256 tokenId,
            address keeper,
            address tokenFactAddr,
            address seller
        ) = _getNodeProperties(itemKey);
        require(msg.sender == keeper, "settleItem: Wrong addr");
        require(msg.value == price, "settleItem: Wrong amount");
        IERC721(tokenFactAddr).transferFrom(address(this), keeper, tokenId);
        _balances[seller] += price;
        _removePostBidItemKeys(itemKey);
        delete _nodes[itemKey];
    }

    function withdrawEth() external nonReentrant {
        uint256 amount = _balances[msg.sender];
        delete _balances[msg.sender];
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "withdrawEth: TX failed");
    }

    function getBalance() external view returns (uint256) {
        return _balances[msg.sender];
    }

    function _getNodeProperties(bytes32 nodeKey)
        private
        view
        returns (
            uint256,
            uint256,
            address,
            address,
            address
        )
    {
        Node memory item = _nodes[nodeKey];
        uint256 price = item.nftListing.price;
        uint256 tokenId = item.nftListing.tokenId;
        address keeper = item.nftListing.keeper;
        address tokenFactAddr = item.nftListing.tokenFactAddr;
        address seller = item.nftListing.seller;
        return (price, tokenId, keeper, tokenFactAddr, seller);
    }
}
