/**
 * WebAssembly wrapper for libplist
 * Supports parsing and converting plists between XML, JSON, OpenStep, and binary formats
 */

import createPlistModule from "./plist_wasm.mjs";

export const Format = {
  NONE: 0,
  XML: 1,
  BINARY: 2,
  JSON: 3,
  OPENSTEP: 4,
};

export const ErrorCode = {
  SUCCESS: 0,
  INVALID_ARG: -1,
  FORMAT: -2,
  PARSE: -3,
  NO_MEM: -4,
  IO: -5,
  CIRCULAR_REF: -6,
  MAX_NESTING: -7,
  UNKNOWN: -255,
};

const ErrorMessages = {
  [ErrorCode.SUCCESS]: "Success",
  [ErrorCode.INVALID_ARG]: "Invalid argument",
  [ErrorCode.FORMAT]: "Format error - nodes not compatible with output format",
  [ErrorCode.PARSE]: "Parse error",
  [ErrorCode.NO_MEM]: "Out of memory",
  [ErrorCode.IO]: "I/O error",
  [ErrorCode.CIRCULAR_REF]: "Circular reference detected",
  [ErrorCode.MAX_NESTING]: "Maximum nesting depth exceeded",
  [ErrorCode.UNKNOWN]: "Unknown error",
};

export class PlistError extends Error {
  constructor(code) {
    super(ErrorMessages[code] || `Unknown error code: ${code}`);
    this.name = "PlistError";
    this.code = code;
  }
}

export class Plist {
  constructor(wasm, handle, format) {
    this._wasm = wasm;
    this._handle = handle;
    this._format = format;
  }

  get format() {
    return this._format;
  }

  get formatName() {
    switch (this._format) {
      case Format.XML:
        return "xml";
      case Format.BINARY:
        return "binary";
      case Format.JSON:
        return "json";
      case Format.OPENSTEP:
        return "openstep";
      default:
        return "unknown";
    }
  }

  _withResult(fn) {
    const res = this._wasm._result_alloc();
    try {
      fn(res);
      const error = this._wasm._result_get_error(res);
      if (error !== 0) {
        throw new PlistError(error);
      }
      const dataPtr = this._wasm._result_get_data(res);
      const length = this._wasm._result_get_length(res);
      return { dataPtr, length };
    } finally {
      this._wasm._result_free(res);
    }
  }

  toXML() {
    const { dataPtr, length } = this._withResult((res) =>
      this._wasm._plist_to_xml_wrapper(res, this._handle)
    );
    return new TextDecoder().decode(
      new Uint8Array(this._wasm.HEAPU8.buffer, dataPtr, length)
    );
  }

  toBinary() {
    const { dataPtr, length } = this._withResult((res) =>
      this._wasm._plist_to_bin_wrapper(res, this._handle)
    );
    const result = new Uint8Array(length);
    result.set(new Uint8Array(this._wasm.HEAPU8.buffer, dataPtr, length));
    return result;
  }

  toJSON(prettify = true) {
    const { dataPtr, length } = this._withResult((res) =>
      this._wasm._plist_to_json_wrapper(res, this._handle, prettify ? 1 : 0)
    );
    return new TextDecoder().decode(
      new Uint8Array(this._wasm.HEAPU8.buffer, dataPtr, length)
    );
  }

  toOpenStep(prettify = true) {
    const { dataPtr, length } = this._withResult((res) =>
      this._wasm._plist_to_openstep_wrapper(res, this._handle, prettify ? 1 : 0)
    );
    return new TextDecoder().decode(
      new Uint8Array(this._wasm.HEAPU8.buffer, dataPtr, length)
    );
  }

  free() {
    if (this._handle) {
      this._wasm._plist_free_handle(this._handle);
      this._handle = null;
    }
  }
}

let wasmModule;

export async function init() {
  if (!wasmModule) {
    wasmModule = await createPlistModule();
  }
}

function toBuffer(data) {
  let bytes;
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data);
  } else if (data instanceof Uint8Array) {
    bytes = data;
  } else {
    throw new TypeError("Input must be a string or Uint8Array");
  }

  const ptr = wasmModule._alloc_buffer(bytes.length);
  if (!ptr) {
    throw new PlistError(ErrorCode.NO_MEM);
  }

  wasmModule.HEAPU8.set(bytes, ptr);
  return { ptr, length: bytes.length };
}

export function parse(data) {
  if (!wasmModule) {
    throw new Error("Module not initialized. Call init() first.");
  }

  const { ptr, length } = toBuffer(data);
  const res = wasmModule._result_alloc();

  try {
    const handle = wasmModule._plist_parse(res, ptr, length);
    const error = wasmModule._result_get_error(res);
    if (error !== 0) {
      throw new PlistError(error);
    }
    const format = wasmModule._result_get_format(res);
    return new Plist(wasmModule, handle, format);
  } finally {
    wasmModule._result_free(res);
    wasmModule._free_buffer(ptr);
  }
}

export function version() {
  if (!wasmModule) {
    throw new Error("Module not initialized. Call init() first.");
  }
  const ptr = wasmModule._get_version();
  return wasmModule.UTF8ToString(ptr);
}
