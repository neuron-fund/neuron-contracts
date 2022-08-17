import { ethers, deployments, network } from 'hardhat'
import { Signer } from 'ethers'
import { AirDrop, AirDrop__factory, NeuronToken, NeuronToken__factory } from '../typechain-types'
import { expectRevert } from '@openzeppelin/test-helpers'
import { generateMerkleTree, getMerkleProof, getMerkleRoot, IAirDropLeaf } from '../scripts/air_drop'
import MerkleTree from 'merkletreejs'
import { assert } from 'console'

describe('AirDrop', () => {
  let neuronToken: NeuronToken
  let airDrop: AirDrop
  let transferAllower: Signer
  let airDropClaimers: Signer[]
  let deployer: Signer
  let user1: Signer
  let user2: Signer
  let initSnapshot: string
  let merkleTree: MerkleTree
  let leafs: IAirDropLeaf[]

  before(async () => {
    const accounts = await ethers.getSigners()
    deployer = accounts[0]
    user1 = accounts[1]
    user2 = accounts[2]
    transferAllower = accounts[10]

    airDropClaimers = accounts.slice(15, 20)

    await deployments.fixture(['NeuronToken', 'AirDrop'])

    const NeuronTokenDeployment = await deployments.get('NeuronToken')
    const AirDropDeployment = await deployments.get('AirDrop')

    neuronToken = NeuronToken__factory.connect(NeuronTokenDeployment.address, deployer)
    airDrop = AirDrop__factory.connect(AirDropDeployment.address, deployer)

    await neuronToken.connect(transferAllower).allowTranfers()

    leafs = []
    for (let i = 0; i < airDropClaimers.length; i++) {
      const airDropClaimer = airDropClaimers[i]
      leafs.push({
        recipient: await airDropClaimer.getAddress(),
        amount: ethers.utils.parseEther(`${0.1 + 0.1 * i}`),
      })
    }

    merkleTree = generateMerkleTree(leafs)

    const week = 7 * 24 * 60 * 60

    await airDrop.connect(deployer).initialize(await deployer.getAddress(), neuronToken.address, getMerkleRoot(merkleTree), week)

    initSnapshot = await ethers.provider.send('evm_snapshot', [])
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [initSnapshot])
    initSnapshot = await ethers.provider.send('evm_snapshot', [])
  })

  it('Regular claim', async () => {
    for (let i = 0; i < airDropClaimers.length; i++) {
      const claimer = airDropClaimers[i]
      const claimerAddress = await claimer.getAddress()
      const claimedAmout = leafs[i].amount
      const initialBalance = await neuronToken.balanceOf(claimerAddress)

      await airDrop
        .connect(claimer)
        .claimAirDrop(claimedAmout, getMerkleProof(merkleTree, claimerAddress, claimedAmout))

      const resultBalance = await neuronToken.balanceOf(claimerAddress)

      assert(
        resultBalance.sub(initialBalance).eq(claimedAmout),
        `resultBalance - initialBalance != claimedAmout | {${resultBalance}} - {${initialBalance}} != {${claimedAmout}} | claimer №${i}`
      )
    }
  })

  it('Claim with fail amount', async () => {
    const claimer = airDropClaimers[0]
    const claimerAddress = await claimer.getAddress()
    const claimedAmout = leafs[0].amount.mul(2)

    await expectRevert(
      airDrop.connect(claimer).claimAirDrop(claimedAmout, getMerkleProof(merkleTree, claimerAddress, claimedAmout)),
      'Access denied'
    )
  })

  it('Claim with fail proof and true amount', async () => {
    const claimer = airDropClaimers[0]
    const claimerAddress = await claimer.getAddress()
    const claimedAmout = leafs[0].amount

    await expectRevert(
      airDrop.connect(claimer).claimAirDrop(claimedAmout, getMerkleProof(merkleTree, claimerAddress, claimedAmout.div(2))),
      'Access denied'
    )
  })

  it('Claim with fail amount and true proof', async () => {
    const claimer = airDropClaimers[0]
    const claimerAddress = await claimer.getAddress()
    const claimedAmout = leafs[0].amount

    await expectRevert(
      airDrop.connect(claimer).claimAirDrop(claimedAmout.mul(2), getMerkleProof(merkleTree, claimerAddress, claimedAmout)),
      'Access denied'
    )
  })

  it('Claim with fail recipient', async () => {
    const claimer = user1
    const claimerAddress = await claimer.getAddress()
    const claimedAmout = leafs[0].amount

    await expectRevert(
      airDrop.connect(claimer).claimAirDrop(claimedAmout, getMerkleProof(merkleTree, claimerAddress, claimedAmout)),
      'Access denied'
    )
  })

  it('Double claim', async () => {
    const claimer = airDropClaimers[0]
    const claimerAddress = await claimer.getAddress()
    const claimedAmout = leafs[0].amount
    const initialBalance = await neuronToken.balanceOf(claimerAddress)

    await airDrop.connect(claimer).claimAirDrop(claimedAmout, getMerkleProof(merkleTree, claimerAddress, claimedAmout))

    const resultBalance = await neuronToken.balanceOf(claimerAddress)

    assert(
      resultBalance.sub(initialBalance).eq(claimedAmout),
      `resultBalance - initialBalance != claimedAmout | {${resultBalance}} - {${initialBalance}} != {${claimedAmout}}`
    )

    await expectRevert(
      airDrop.connect(claimer).claimAirDrop(claimedAmout, getMerkleProof(merkleTree, claimerAddress, claimedAmout)),
      'Access denied'
    )
  })

  it('Claim after expiry', async () => {
    await network.provider.send('evm_increaseTime', [
      parseFloat(`${(await airDrop.dateOfExpiry()).sub(Math.ceil(Date.now() / 1000)).mul(2)}`),
    ])
    await network.provider.send('evm_mine')
    const claimer = airDropClaimers[0]
    const claimerAddress = await claimer.getAddress()
    const claimedAmout = leafs[0].amount

    await expectRevert(
      airDrop.connect(claimer).claimAirDrop(claimedAmout, getMerkleProof(merkleTree, claimerAddress, claimedAmout)),
      'Cannot be claimed after the end of the distribution'
    )
  })

  it('Withdraw', async () => {
    await network.provider.send('evm_increaseTime', [
      parseFloat(`${(await airDrop.dateOfExpiry()).sub(Math.ceil(Date.now() / 1000)).mul(2)}`),
    ])
    await network.provider.send('evm_mine')

    const deployerAddress = await deployer.getAddress()
    const airDropBalance = await neuronToken.balanceOf(airDrop.address)
    const initialBalance = await neuronToken.balanceOf(deployerAddress)

    await airDrop.connect(deployer).withdrawAfterExipired(deployerAddress)

    const resultBalance = await neuronToken.balanceOf(deployerAddress)

    assert(
      resultBalance.sub(initialBalance).eq(airDropBalance),
      `resultBalance - initialBalance != airDropBalance | {${resultBalance}} - {${initialBalance}} != {${airDropBalance}}`
    )
  })

  it('Withdraw before expiry', async () => {
    const deployerAddress = await deployer.getAddress()

    await expectRevert(
      airDrop.connect(deployer).withdrawAfterExipired(deployerAddress),
      'Cannot be withdrawn until the end of the distribution'
    )
  })
})
