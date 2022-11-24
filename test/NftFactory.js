const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { deployNftFactoryFixture } = require('./fixtures');
const { expect } = require('chai');

describe('NftFactory', () => {
  describe('Deployment', () => {
    it('Deploys NftFactory smart contract', async () => {
      const { nftFactory } = await loadFixture(deployNftFactoryFixture);
      expect(nftFactory.address.length).to.equal(42);
    });
    it('Sets the correct Nft collection name', async () => {
      const { nftFactory } = await loadFixture(deployNftFactoryFixture);
      expect(await nftFactory.name()).to.equal('TestToken');
    });
    it('Sets the correct Nft collection symbol', async () => {
      const { nftFactory } = await loadFixture(deployNftFactoryFixture);
      expect(await nftFactory.symbol()).to.equal('TT');
    });
  });
  describe('Minting', () => {
    it('Creates collectable', async () => {
      const tokenUri = 'https://testtokenuri.uri';
      const { nftFactory, nftFactoryDeployer } = await loadFixture(
        deployNftFactoryFixture
      );
      await nftFactory.createCollectable(tokenUri);
      expect(await nftFactory.balanceOf(nftFactoryDeployer.address)).to.equal(
        1
      );
      expect(await nftFactory.tokenURI(1)).to.equal(tokenUri);
    });
    it('Creates multiple collectables', async () => {
      let nftId = 1;
      const tokenUri = `https://testtokenuri.uri_${nftId}`;
      const { nftFactory, nftFactoryDeployer } = await loadFixture(
        deployNftFactoryFixture
      );
      for (let i = 0; i < 5; i++) {
        await nftFactory.createCollectable(tokenUri);
        expect(await nftFactory.balanceOf(nftFactoryDeployer.address)).to.equal(
          nftId
        );
        expect(await nftFactory.tokenURI(nftId)).to.equal(tokenUri);
        nftId++;
      }
    });
  });
});
