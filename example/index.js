const shim = require('fabric-shim');
const { shim, Chaincode, parseCreator } = require('fabric-node-cc-utils');

class Example {
  static async getId(stub) {
    return parseCreator(stub).subjectId;
  }

  static async getIssuerId(stub) {
    return parseCreator(stub).issuerId;
  }
}

shim.start(new Example());
