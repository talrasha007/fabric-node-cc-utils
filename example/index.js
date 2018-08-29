const { shim, Chaincode, parseCreator, CouchDbQueryResult } = require('fabric-node-cc-utils');

class Example extends Chaincode {
  static async getId(stub) {
    return parseCreator(stub).subjectId;
  }

  static async getIssuerId(stub) {
    return parseCreator(stub).issuerId;
  }

  async query(stub, args) {
    const q = args[0];
    const res = new CouchDbQueryResult(await stub.getQueryResult(q));
    return await res.toArray();
  }
}

shim.start(new Example());
