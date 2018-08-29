const shim = require('fabric-shim');
const x509 = require('x509');

function parseCreator(stub) {
  const creator = stub.getCreator();
  const pem = creator.id_bytes.toBuffer().toString();
  const cert = x509.parseCert(pem);

  const subjectId = cert.fingerPrint.replace(/:/g, '');
  const issuerId = cert.extensions.authorityKeyIdentifier.replace(/(keyid)|:/g, '');

  return {
    mspId: creator.mspid,
    pem,
    subjectId,
    issuerId,
    cert
  };
}

async function callChaincodeFn(fn, context, stub, args, fcn) {
  try {
    let payload = await fn.call(context, stub, args, fcn);

    if (typeof payload === 'string') {
      payload = Buffer.from(payload);
    } else if (payload && !payload.toBuffer && !Buffer.isBuffer(payload)) {
      payload = Buffer.from(JSON.stringify(payload));
    }

    return shim.success(payload);
  } catch (err) {
    console.error(err);
    return shim.error(err);
  }
}

class Chaincode {
  Init() {
    return shim.success();
  }

  async Invoke(stub) {
    const { fcn, params } = stub.getFunctionAndParameters();

    if (this[fcn]) {
      return await callChaincodeFn(this[fcn], this, stub, params, fcn);
    }

    if (this.constructor[fcn]) {
      return await callChaincodeFn(this.constructor[fcn], null, stub, params, fcn);
    }

    return shim.error('No function of name:' + fcn + ' found');
  }
}

module.exports = {
  shim,
  parseCreator,
  Chaincode
};