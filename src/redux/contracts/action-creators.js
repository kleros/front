import { Kleros } from 'kleros-api'
import {
  fetchPostContract,
  failurePostContract,
  postSuccessContract,
  requestContract,
  failureContract,
  receiveContract,
  requestContracts,
  failureContracts,
  receiveContracts,
  raiseDisputeContract,
  requestRaiseDispute,
  failureRaiseDispute,
  addEvidenceContract,
  requestRulingOptions,
  receiveRulingOptions,
  failureRulingOptions
} from './actions'
import { getWeb3 } from '../../helpers/getWeb3'

export const deployContract = ({
  account = 0,
  value = undefined,
  hashContract,
  timeout = 100,
  partyB,
  arbitratorExtraData = '',
  email = '',
  description = ''
}) => async dispatch => {
  await dispatch(fetchPostContract(true))
  try {
    let web3 = await getWeb3()

    const provider = web3.currentProvider

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    let arbitrableContract = await KlerosInstance.arbitrableContract

    let contractArbitrable = await arbitrableContract.deployContract(
      web3.eth.accounts[account],
      web3.toWei(value, 'ether'),
      hashContract,
      process.env.REACT_APP_ARBITRATOR_ADDRESS,
      timeout,
      partyB.toLowerCase(),
      arbitratorExtraData,
      email,
      description
    )

    await dispatch(postSuccessContract(contractArbitrable.address))
    await dispatch(fetchPostContract(false))
  } catch (err) {
    dispatch(failurePostContract(true))
    // FIXME send an error user-friendly
    throw new Error(err)
  }
}

export const contractFetchData = (
  contractAddress,
  account = 0
) => async dispatch => {
  dispatch(requestContract(true))

  try {
    let web3 = await getWeb3()

    const provider = web3.currentProvider

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    const contractDataDeployed = await KlerosInstance.arbitrableContract.getData(
      contractAddress,
      web3.eth.accounts[account]
    )

    contractDataDeployed.partyAFeeEther = await web3.fromWei(
      contractDataDeployed.partyAFee,
      'ether'
    )
    contractDataDeployed.partyBFeeEther = await web3.fromWei(
      contractDataDeployed.partyBFee,
      'ether'
    )

    await dispatch(receiveContract(contractDataDeployed))
    await dispatch(requestContract(false))
  } catch (err) {
    dispatch(failureContract(true))
    throw new Error(err) // FIXME this error should not throw the execution
  }
}

export const contractRaiseDispute = (
  contract,
  address,
  account = 0
) => async dispatch => {
  dispatch(requestRaiseDispute(true))

  try {
    let web3 = await getWeb3()
    // fetch account to see if user is partyA or partyB
    const userAddress = web3.eth.accounts[account]

    const provider = web3.currentProvider

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    // TODO move all this logic to api
    let contractInstance = await KlerosInstance.arbitrableTransaction.load(
      address
    )

    let fee
    if (contract.partyA === userAddress) {
      fee = await contractInstance.partyAFee()
    }
    if (contract.partyB === userAddress) {
      fee = await contractInstance.partyBFee()
    }

    const extraDataContractInstance = await contractInstance.arbitratorExtraData()

    const courtInstance = await KlerosInstance.klerosPOC.load(
      process.env.REACT_APP_ARBITRATOR_ADDRESS
    )

    const arbitrationCost = await courtInstance.arbitrationCost(
      extraDataContractInstance
    )

    let raiseDisputeContractTx = 0x0
    const cost = web3.fromWei(
      arbitrationCost.toNumber() - fee.toNumber(),
      'ether'
    )

    if (userAddress === contract.partyA) {
      raiseDisputeContractTx = await KlerosInstance.disputes.raiseDisputePartyA(
        userAddress,
        address,
        cost
      )
    } else if (userAddress === contract.partyB) {
      raiseDisputeContractTx = await KlerosInstance.disputes.raiseDisputePartyB(
        userAddress,
        address,
        cost
      )
    } else {
      throw new Error(`${userAddress} is not a party in contract`)
    }

    await dispatch(raiseDisputeContract(raiseDisputeContractTx))
    await dispatch(requestRaiseDispute(false))
  } catch (err) {
    dispatch(failureRaiseDispute(true))
    throw new Error(err) // FIXME this error should not throw the execution
  }
}

export const addEvidence = ({
  account = 0,
  name,
  description,
  url,
  address
}) => async dispatch => {
  await dispatch(requestContract(true))

  try {
    let web3 = await getWeb3()

    const provider = web3.currentProvider

    const userAddress = web3.eth.accounts[account]

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    let arbitrableContract = await KlerosInstance.arbitrableContract

    const submitEvidenceTx = await arbitrableContract.submitEvidence(
      userAddress,
      address,
      name,
      description,
      url
    )

    await dispatch(addEvidenceContract(submitEvidenceTx))
    await dispatch(contractFetchData(address))
    await dispatch(fetchPostContract(false))
  } catch (err) {
    dispatch(failurePostContract(true))
    // FIXME send an error user-friendly
    throw new Error(err)
  }
}

export const deployRNG = () => async dispatch => {
  try {
    let web3 = await getWeb3()

    const provider = web3.currentProvider

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    let rng = await KlerosInstance.blockHashRng

    const rngInstance = await rng.deploy()
    await rng.getData(rngInstance.address)
  } catch (err) {
    throw new Error(err) // FIXME this error should not throw the execution
  }
}

export const deployPinakion = () => async dispatch => {
  try {
    let web3 = await getWeb3()

    const provider = web3.currentProvider

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    let pinakion = await KlerosInstance.pinakion

    await pinakion.deploy()
  } catch (err) {
    throw new Error(err) // FIXME this error should not throw the execution
  }
}

export const deployKleros = (PNKAddress, RNGAddress) => async dispatch => {
  try {
    let web3 = await getWeb3()

    const provider = web3.currentProvider

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    let kleros = await KlerosInstance.klerosPOC

    await kleros.deploy(RNGAddress, PNKAddress)
  } catch (err) {
    throw new Error(err) // FIXME this error should not throw the execution
  }
}

export const configureKleros = (
  klerosAddress,
  PNKAddress
) => async dispatch => {
  try {
    let web3 = await getWeb3()

    const provider = web3.currentProvider

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    let pnk = await KlerosInstance.pinakion
    await pnk.setKleros(PNKAddress, klerosAddress)
    await pnk.transferOwnership(PNKAddress, klerosAddress)
  } catch (err) {
    throw new Error(err) // FIXME this error should not throw the execution
  }
}

export const getArbitratorData = (
  klerosAddress = process.env.REACT_APP_ARBITRATOR_ADDRESS
) => async dispatch => {
  dispatch(requestContract(true))
  try {
    let web3 = await getWeb3()

    const provider = web3.currentProvider

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    const arbitrator = await KlerosInstance.arbitrator
    const data = await arbitrator.getData(klerosAddress)
    await dispatch(receiveContract(data))
    await dispatch(requestContract(false))
  } catch (e) {
    dispatch(failureContract(true))
    throw new Error(e) // FIXME this error should not throw the execution
  }
}

export const passPeriod = (
  klerosAddress = process.env.REACT_APP_ARBITRATOR_ADDRESS
) => async dispatch => {
  dispatch(requestContract(true))
  try {
    let web3 = await getWeb3()

    const provider = web3.currentProvider

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    const arbitrator = await KlerosInstance.arbitrator
    const data = await arbitrator.passPeriod(klerosAddress)
    await dispatch(receiveContract(data))
    await dispatch(requestContract(false))
  } catch (e) {
    dispatch(failureContract(true))
    throw new Error(e) // FIXME this error should not throw the execution
  }
}

export const getContracts = (account = 0) => async dispatch => {
  await dispatch(requestContracts(true))
  try {
    let web3 = await getWeb3()

    const provider = web3.currentProvider

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    const arbitrator = await KlerosInstance.arbitrator
    const data = await arbitrator.getContractsForUser(
      web3.eth.accounts[account]
    )

    await dispatch(receiveContracts(data))
    await dispatch(requestContracts(false))
  } catch (e) {
    dispatch(failureContracts(true))
    throw new Error(e)
  }
}

export const getRulingOptions = contractAddress => async dispatch => {
  await dispatch(requestRulingOptions(true))
  try {
    let web3 = await getWeb3()

    const provider = web3.currentProvider

    let KlerosInstance = new Kleros(
      provider,
      process.env.REACT_APP_STORE_PROVIDER
    )

    const rulingOptions = await KlerosInstance.arbitrableContract.getRulingOptions(
      contractAddress
    )

    await dispatch(receiveRulingOptions(rulingOptions))
    await dispatch(requestRulingOptions(false))
  } catch (e) {
    dispatch(failureRulingOptions(true))
    throw new Error(e)
  }
}
