import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import keccak256 from 'keccak256'
import { default as MerkleTree } from 'merkletreejs'

export interface IAirDropLeaf {
  recipient: string
  amount: BigNumber
}

export function generateMerkleTree(leafs: IAirDropLeaf[]) {
  return new MerkleTree(
    leafs.map(i => ethers.utils.solidityPack(['address', 'uint256'], [i.recipient, i.amount])),
    keccak256,
    { hashLeaves: true, sortPairs: true }
  )
}

export function getMerkleProof(merkleTree: MerkleTree, recipient: string, amount: BigNumber) {
  return merkleTree.getHexProof(ethers.utils.solidityKeccak256(['address', 'uint256'], [recipient, amount]))
}

export function getMerkleRoot(merkleTree: MerkleTree) {
  return merkleTree.getHexRoot()
}
