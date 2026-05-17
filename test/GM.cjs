const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GM", function () {
  async function deployContract() {
    const [owner, friend] = await ethers.getSigners();
    const GM = await ethers.getContractFactory("GM");
    const gm = await GM.deploy();
    await gm.waitForDeployment();

    return { gm, owner, friend };
  }

  it("starts with zero GMs", async function () {
    const { gm } = await deployContract();

    expect(await gm.totalGms()).to.equal(0n);
  });

  it("stores a GM message and updates counters", async function () {
    const { gm, owner } = await deployContract();

    await gm.sayGM("GM Arc builders");

    expect(await gm.totalGms()).to.equal(1n);
    expect(await gm.gmCountByAddress(owner.address)).to.equal(1n);

    const recent = await gm.getRecentGms(5);
    expect(recent).to.have.lengthOf(1);
    expect(recent[0].sender).to.equal(owner.address);
    expect(recent[0].message).to.equal("GM Arc builders");
  });

  it("uses a friendly default message", async function () {
    const { gm } = await deployContract();

    await gm.sayGM("");

    const recent = await gm.getRecentGms(1);
    expect(recent[0].message).to.equal("GM Arc");
  });

  it("returns newest GMs first", async function () {
    const { gm, friend } = await deployContract();

    await gm.sayGM("first");
    await gm.connect(friend).sayGM("second");

    const recent = await gm.getRecentGms(2);
    expect(recent[0].message).to.equal("second");
    expect(recent[1].message).to.equal("first");
  });

  it("rejects messages over 120 characters", async function () {
    const { gm } = await deployContract();
    const longMessage = "x".repeat(121);

    await expectRevert(gm.sayGM(longMessage), "GM message too long");
  });
});

async function expectRevert(action, message) {
  try {
    await action;
  } catch (error) {
    expect(error.message).to.include(message);
    return;
  }

  throw new Error(`Expected transaction to revert with: ${message}`);
}
