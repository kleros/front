import React, { Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import Web3 from 'web3'
import { getDisputeForContract } from '../../../redux/disputes/action-creators'
import SearchBar from '../../../Components/SearchBar'
import Banner from './Banner'
import Parties from './Parties'
import Information from './Information'
import Evidence from './Evidence'
import Decision from './Decision'
import './DisputeResolution.css'

class DisputeResolution extends Component {
  componentWillMount () {
    // fetch dispute
    this.props.getDisputeForContract(this.props.match.params.address)
  }

  render () {
    if (this.props.isFetching) return false

    const dispute = this.props.caseData
    // FIXME show dispute not found message or a loading indicator
    if (!dispute) return false

    // FIXME only applies to twoParty contract. Generalize
    const parties = [{address: dispute.partyA}, {address: dispute.partyB}]

    // arbitration fee
    const web3 = new Web3()
    const arbitrationFee = web3.fromWei(dispute.fee)

    // time remaining TODO use momentjs to calculate time difference between now and end time
    return (
      <div className='dispute-resolution'>
        <SearchBar />
        <Banner title={dispute.title} />
        <div className='divider' />
        <Parties parties={parties} />
        <div className='divider' />
        <Information text={dispute.description} truncatedCharacters={50} arbitrationFee={arbitrationFee} timeRemaining={dispute.deadline} />
        <div className='divider' />
        <Evidence evidence={dispute.evidence} />
        <div className='divider' />
        <Decision
          resolutionOptions={dispute.resolutionOptions}
          disputeId={dispute.disputeId}
          votes={dispute.votes}
          hash={dispute.hash}
        />
      </div>
    )
  }
}

const mapStateToProps = state => {
  return {
    caseData: state.disputes.caseData,
    hasErrored: state.disputes.failureCaseData,
    isFetching: state.disputes.requestCaseData
  }
}

const mapDispatchToProps = dispatch => {
  return {
    getDisputeForContract: contractAddress => dispatch(getDisputeForContract(contractAddress))
  }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(DisputeResolution))
