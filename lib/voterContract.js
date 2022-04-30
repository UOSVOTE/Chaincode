/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class VoteContract extends Contract {
    async init(ctx){
      console.log(`init chaincode`);
      return;
    }

    async createElection(ctx, electionId, electionName, startDate, endDate){
      const asset = {
        electionId: electionId,
        electionName: electionName,
        startDate: startDate,
        endDate: endDate,
      };

      await ctx.stub.putState(electionId, JSON.stringify(asset));
    }

    async getElection(ctx, electionId){
      const res = await ctx.stub.getState(electionId);

      return JSON.parse(res);
    }

    async createCandidates(ctx, electionId, candidateName, candidateNum){
      let candidateKey = ctx.stub.createCompositeKey("candidate", [electionId, candidateNum]);
      if(!candidateKey){
        throw new Error(`error with create candidateKey`);
      }

      const checkCandidate = await ctx.stub.getState(candidateKey);
      if(checkCandidate.length != 0){
        throw new Error(`Already registered candidateNum`);
      }
      let putKey = await ctx.stub.putState(candidateKey, candidateName);
      if(!putKey){
        throw new Error(`error with putState for candidateName`);
      }
    }

    async candidateList(ctx, electionId){
      const list = [];

      let candidateIter = ctx.stub.getStateByPartialCompositeKeyWithPagination("candidate",[electionId]);
      if(!candidateIter){
        throw new Error(`error with getting candidateList`);
      }

      for await (const candidateKV of candidateIter){
        const {attributes} = await ctx.stub.splitCompositeKey(candidateKV.key);
        let candidateJSON = candidateKV.value;
        let candidateName = candidateJSON.toString();

        const candidate = {
          ElectionId: attributes[0],
          CandidateName: candidateName,
          CandidateNum: attributes[1],
        };
        
        list.push(candidate);
      }

      return list;
    }

    async voter(ctx, electionId, voterId){
      let voterKey = ctx.stub.createCompositeKey("voter", [electionId, voterId]);
      if(!voterKey){
        throw new Error(`error with create candidateKey`);
      }

      const checkVoter = await ctx.stub.getState(voterKey);
      if(checkVoter.length != 0){
        throw new Error(`Already registered voterId`);
      }

      const asset = {
        isBalloted: false,
        ballotHash: null,
      };

      let putKey = await ctx.stub.putState(voterKey, JSON.stringify(asset));
      if(!putKey){
        throw new Error(`error with putState for Voter asset`);
      }
    }

    async getVoter(ctx, electionId, voterId){
      let voterKey = ctx.stub.createCompositeKey("voter", [electionId, voterId]);

      const checkVoter = await ctx.stub.getState(voterKey);

      return checkVoter.toString();
    }

    async voterList(ctx, electionId){
      const list = [];

      let voterIter = ctx.stub.getStateByPartialCompositeKeyWithPagination("voter",[electionId]);
      if(!voterIter){
        throw new Error(`error with getting voterList`);
      }

      for await (const voterKV of voterIter){
        const {attributes} = await ctx.stub.splitCompositeKey(voterKV.key);

        let voterAssetJSON = voterKV.value;
        let voterAsset = JSON.parse(voterAssetJSON);

        const voter = {
          ElectionId: attributes[0],
          VoterId: attributes[1],
          IsBalloted: voterAsset.isBalloted,
          BallotHash: voterAsset.ballotHash
        };
        
        list.push(voter);
      }

      return list;
    }

    async vote(ctx, electionId, voterId, ballotHash){
      const election = await this.getElection(ctx, electionId);
      const cur = new Date();
      if(cur < new Date(election.startDate)){
        throw new Error(`Not started election`);
      }
      if(cur > new Date(election.endDate)){
        throw new Error(`Already ended election`);
      }

      let voterKey = ctx.stub.createCompositeKey("voter", [electionId, voterId]);

      const asset={
        isBalloted: true,
        ballotHash: ballotHash,
      }

      await ctx.stub.putState(voterKey, JSON.stringify(asset));
    }
}

module.exports = VoteContract;
