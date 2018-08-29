# fabric-node-cc-utils
Utils for fabric nodejs chaincode.

```js
const { shim, Chaincode, parseCreator, CouchDbQueryResult } = require('fabric-node-cc-utils');

/*
  Extends your class from Chaincode.
  Override Init if you want do something in Init.
  Every function in the class can be called by queryByChaincode/sendTransactionProposal.
  Return value of function will be sent to client by shim.success, string/Buffer/Object type is acceptable.
  Exceptions will be sent to client by shim.error.
*/
class Example extends Chaincode {
  static async getId(stub) {
    return parseCreator(stub).subjectId;
  }

  async getIssuerId(stub) {
    return parseCreator(stub).issuerId;
  }

  async query(stub, args) {
    const q = args[0];
    const res = new CouchDbQueryResult(await stub.getQueryResult(q));
    return await res.toArray();
  }  
}

shim.start(new Example());
```