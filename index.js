const assert = require('assert');
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

function isNoneEmptyString(v) {
  return v && typeof v === 'string';
}

const StubExt = {
  createCompositeKey(objectType, attributes) {
    assert(Array.isArray(attributes), 'attributes must be an array');
    assert(
      isNoneEmptyString(objectType) && attributes.every(isNoneEmptyString),
      'object type or attribute not a non-zero length string'
    );

    return ['', objectType, ...attributes, ''].join('\x00');
  },

  async invokeStringChaincode(chaincodeName, args, channel) {
    const resp = await this.invokeChaincode(chaincodeName, args, channel);
    return resp.payload.toBuffer().toString();
  },

  async invokeJsonChaincode(chaincodeName, args, channel) {
    return JSON.parse(await this.invokeStringChaincode(chaincodeName, args, channel));
  },

  async putStringState(key, value) {
    return await this.putState(key, Buffer.from(value));
  },

  async putJsonState(key, obj) {
    return await this.putStringState(key, JSON.stringify(obj));
  },

  async getStringState(key) {
    const resp = await this.getState(key);
    return resp.toString();
  },

  async getJsonState(key) {
    const resp = await this.getStringState(key);
    return resp && JSON.parse(resp);
  }
};

class Chaincode {
  Init() {
    return shim.success();
  }

  async Invoke(stub) {
    Object.assign(stub, StubExt);

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

class CouchDbQuery {
  constructor(res) {
    this._res = res;
  }

  get done() {
    return this._done;
  }

  async next() {
    if (this._done) return ;

    const item = await this._res.next();
    this._done = item.done;
    return item.value && {
      namespace: item.value.namespace,
      key: item.value.key,
      value: JSON.parse(item.value.value.toBuffer().toString())
    };
  }

  async toArray() {
    const ret = [];
    while (!this.done) {
      const record = await this.next();
      record && ret.push(record);
    }
    return ret;
  }

  static async count(stub, query) {
    query = typeof query === 'string' ? query : JSON.stringify(query);
    const res = await stub.getQueryResult(query);
    let cnt = 0;
    let item;

    do {
      item = await res.next();
      item.value && cnt++;
    } while (!item.done);

    return cnt;
  }

  static async toArray(stub, query) {
    query = typeof query === 'string' ? query : JSON.stringify(query);
    const res = await stub.getQueryResult(query);
    const r = new CouchDbQuery(res);
    return await r.toArray();
  }
}

module.exports = {
  shim,
  parseCreator,
  Chaincode,
  CouchDbQuery
};