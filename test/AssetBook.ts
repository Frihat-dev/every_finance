import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Assets", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployeFixture() {
    // Contracts are deployed using the first signer/account by default
    const accounts = await ethers.getSigners();
    const owner = accounts[0];
    const admin = accounts[1];
    const manager = accounts[2];

    const Assets = await ethers.getContractFactory("AssetBook");
    const assets = await Assets.deploy(admin.address, manager.address);

    return { assets, accounts, owner, admin, manager };
  }

  describe("Deployment", function () {
    it("Should set the Role DEFAULT_ADMIN_ROLE to owner  ", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const ADMIN = await assets.DEFAULT_ADMIN_ROLE();
      expect(await assets.hasRole(ADMIN, admin.address)).to.equal(true);
    });
    it("Should set the Role MANAGER to manager  ", async function () {
      const { assets, accounts, owner, manager } = await deployeFixture();
      const MANAGER = await assets.MANAGER();
      expect(await assets.hasRole(MANAGER, manager.address)).to.equal(true);
    });
  });

  describe("updateAsset", function () {
    it("Should update the storage with a new asset's address different from 0", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const asset = accounts[2].address;
      const oracle = accounts[3].address;
      const price = 0;
      await expect(assets.connect(admin).updateAsset(asset, oracle, price))
        .to.emit(assets, "UpdateAsset")
        .withArgs(asset, oracle, price);
      const new_asset = await assets.assets(asset);
      expect(new_asset[0]).to.equal(oracle);
      expect(new_asset[1]).to.equal(price);
      expect(new_asset[2]).to.equal(true);
    });

    it("Should update the storage with a new asset's address equal to 0", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const asset = "0x0000000000000000000000000000000000000000";
      const oracle = accounts[3].address;
      const price = 0;
      await expect(assets.connect(admin).updateAsset(asset, oracle, price))
        .to.emit(assets, "UpdateAsset")
        .withArgs(asset, oracle, price);
      const new_asset = await assets.assets(asset);
      expect(new_asset[0]).to.equal(oracle);
      expect(new_asset[1]).to.equal(price);
      expect(new_asset[2]).to.equal(true);
    });

    it("Should update the storage when many assets are added ", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const asset1 = accounts[2].address;
      const oracle1 = accounts[3].address;
      const price1 = 0;
      const asset2 = accounts[4].address;
      const oracle2 = "0x0000000000000000000000000000000000000000";
      const price2 = 200000000n;
      const asset3 = "0x0000000000000000000000000000000000000000";
      const oracle3 = accounts[5].address;
      const price3 = 0;
      const asset4 = accounts[6].address;
      const oracle4 = "0x0000000000000000000000000000000000000000";
      const price4 = 300000000n;
      await assets.connect(admin).updateAsset(asset1, oracle1, price1);
      await assets.connect(admin).updateAsset(asset2, oracle2, price2);
      await assets.connect(admin).updateAsset(asset3, oracle3, price3);
      await assets.connect(admin).updateAsset(asset4, oracle4, price4);
      const new_asset1 = await assets.assets(asset1);
      expect(new_asset1[0]).to.equal(oracle1);
      expect(new_asset1[1]).to.equal(price1);
      expect(new_asset1[2]).to.equal(true);
      const new_asset2 = await assets.assets(asset2);
      expect(new_asset2[0]).to.equal(oracle2);
      expect(new_asset2[1]).to.equal(price2);
      expect(new_asset2[2]).to.equal(true);
      const new_asset3 = await assets.assets(asset3);
      expect(new_asset3[0]).to.equal(oracle3);
      expect(new_asset3[1]).to.equal(price3);
      expect(new_asset3[2]).to.equal(true);
      const new_asset4 = await assets.assets(asset4);
      expect(new_asset4[0]).to.equal(oracle4);
      expect(new_asset4[1]).to.equal(price4);
      expect(new_asset4[2]).to.equal(true);
    });

    it("Should emit an event UpdateAsset", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const asset = accounts[2].address;
      const oracle = accounts[3].address;
      const price = 0;
      await expect(assets.connect(admin).updateAsset(asset, oracle, price))
        .to.emit(assets, "UpdateAsset")
        .withArgs(asset, oracle, price);
    });

    it("Should revert when the caller is not the admin  ", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const asset = accounts[2].address;
      const oracle = accounts[3].address;
      const price = 0;
      await expect(assets.connect(manager).updateAsset(asset, oracle, price)).to
        .be.revertedWith;
    });

    it("Should revert when oracle exists and price is not zero  ", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const asset = accounts[2].address;
      const oracle = accounts[3].address;
      const price = 100000000n;
      await expect(
        assets.connect(admin).updateAsset(asset, oracle, price)
      ).to.be.revertedWith("Every.finance: not zero price");
    });

    it("Should revert when no oracle exists and price is zero  ", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const asset = accounts[2].address;
      const oracle = "0x0000000000000000000000000000000000000000";
      const price = 0;
      await expect(
        assets.connect(admin).updateAsset(asset, oracle, price)
      ).to.be.revertedWith("Every.finance: zero price");
    });
  });

  describe("removeAsset", function () {
    it("Should update the storage", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const asset = accounts[2].address;
      const oracle = accounts[3].address;
      const price = 0;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await assets.connect(manager).removeAsset(asset);
      expect((await assets.assets(asset))[2]).to.equal(false);
    });

    it("Should emit the event RemoveAsset", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const asset = accounts[2].address;
      const oracle = accounts[3].address;
      const price = 0;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await expect(assets.connect(manager).removeAsset(asset))
        .to.emit(assets, "RemoveAsset")
        .withArgs(asset);
    });

    it("Should should remove the asset when it is the only asset ", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const asset = accounts[2].address;
      const oracle = accounts[3].address;
      const price = 0;
      await assets.connect(admin).updateAsset(asset, oracle, price);
      await assets.connect(manager).removeAsset(asset);
      expect((await assets.assets(asset))[2]).to.equal(false);
    });

    it("Should update the storage when an asset is removed", async function () {
      const { assets, accounts, owner, admin, manager } =
        await deployeFixture();
      const asset1 = accounts[2].address;
      const oracle1 = accounts[3].address;
      const price1 = 0;
      const asset2 = accounts[4].address;
      const oracle2 = "0x0000000000000000000000000000000000000000";
      const price2 = 200000000n;
      const asset3 = "0x0000000000000000000000000000000000000000";
      const oracle3 = accounts[5].address;
      const price3 = 0;
      const asset4 = accounts[6].address;
      const oracle4 = "0x0000000000000000000000000000000000000000";
      const price4 = 300000000n;
      await assets.connect(admin).updateAsset(asset1, oracle1, price1);
      await assets.connect(admin).updateAsset(asset2, oracle2, price2);
      await assets.connect(admin).updateAsset(asset3, oracle3, price3);
      await assets.connect(admin).updateAsset(asset4, oracle4, price4);
      await assets.connect(manager).removeAsset(asset3);
      const new_asset1 = await assets.assets(asset1);
      expect(new_asset1[0]).to.equal(oracle1);
      expect(new_asset1[1]).to.equal(price1);
      expect(new_asset1[2]).to.equal(true);
      const new_asset2 = await assets.assets(asset2);
      expect(new_asset2[0]).to.equal(oracle2);
      expect(new_asset2[1]).to.equal(price2);
      expect(new_asset2[2]).to.equal(true);
      const new_asset3 = await assets.assets(asset3);
      expect(new_asset3[0]).to.equal(
        "0x0000000000000000000000000000000000000000"
      );
      expect(new_asset3[1]).to.equal(0);
      expect(new_asset3[2]).to.equal(false);
    });
  });
});
