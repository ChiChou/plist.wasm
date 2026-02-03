/**
 * WebAssembly wrapper for libplist
 * Supports parsing and converting plists between XML, JSON, OpenStep, and binary formats
 * @module plist.wasm
 */

import createPlistModule from "./plist_wasm.mjs";

/**
 * Plist format types
 * @readonly
 * @enum {number}
 */
export const Format = {
  /** No format detected */
  NONE: 0,
  /** XML plist format */
  XML: 1,
  /** Binary plist format */
  BINARY: 2,
  /** JSON format */
  JSON: 3,
  /** OpenStep/GNUstep format */
  OPENSTEP: 4,
};

/**
 * Error codes returned by libplist operations
 * @readonly
 * @enum {number}
 */
export const ErrorCode = {
  /** Operation completed successfully */
  SUCCESS: 0,
  /** Invalid argument passed to function */
  INVALID_ARG: -1,
  /** Format error - nodes not compatible with output format */
  FORMAT: -2,
  /** Failed to parse input data */
  PARSE: -3,
  /** Out of memory */
  NO_MEM: -4,
  /** I/O error */
  IO: -5,
  /** Circular reference detected in plist structure */
  CIRCULAR_REF: -6,
  /** Maximum nesting depth exceeded */
  MAX_NESTING: -7,
  /** Unknown error */
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

/**
 * Error thrown when a plist operation fails
 * @extends Error
 */
export class PlistError extends Error {
  /**
   * @param {number} code - Error code from {@link ErrorCode}
   */
  constructor(code) {
    super(ErrorMessages[code] || `Unknown error code: ${code}`);
    this.name = "PlistError";
    /** @type {number} */
    this.code = code;
  }
}

/**
 * Represents a parsed plist that can be converted to different formats
 */
export class Plist {
  /**
   * @param {object} wasm - The WebAssembly module instance
   * @param {number} handle - Pointer to the native plist handle
   * @param {number} format - The detected format from {@link Format}
   * @private
   */
  constructor(wasm, handle, format) {
    this._wasm = wasm;
    this._handle = handle;
    this._format = format;
  }

  /**
   * The detected input format as a numeric value
   * @type {number}
   * @see Format
   */
  get format() {
    return this._format;
  }

  /**
   * The detected input format as a human-readable string
   * @type {string}
   */
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

  /**
   * @param {function(number): void} fn
   * @returns {{dataPtr: number, length: number}}
   * @private
   */
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

  /**
   * Converts the plist to XML format
   * @returns {string} XML representation of the plist
   * @throws {PlistError} If conversion fails
   */
  toXML() {
    const { dataPtr, length } = this._withResult((res) =>
      this._wasm._plist_to_xml_wrapper(res, this._handle),
    );
    return new TextDecoder().decode(
      new Uint8Array(this._wasm.HEAPU8.buffer, dataPtr, length),
    );
  }

  /**
   * Converts the plist to binary format
   * @returns {Uint8Array} Binary representation of the plist
   * @throws {PlistError} If conversion fails
   */
  toBinary() {
    const { dataPtr, length } = this._withResult((res) =>
      this._wasm._plist_to_bin_wrapper(res, this._handle),
    );
    const result = new Uint8Array(length);
    result.set(new Uint8Array(this._wasm.HEAPU8.buffer, dataPtr, length));
    return result;
  }

  /**
   * Converts the plist to JSON format
   * @param {boolean} [prettify=true] - Whether to format the output with indentation
   * @returns {string} JSON representation of the plist
   * @throws {PlistError} If conversion fails
   */
  toJSON(prettify = true) {
    const { dataPtr, length } = this._withResult((res) =>
      this._wasm._plist_to_json_wrapper(res, this._handle, prettify ? 1 : 0),
    );
    return new TextDecoder().decode(
      new Uint8Array(this._wasm.HEAPU8.buffer, dataPtr, length),
    );
  }

  /**
   * Converts the plist to OpenStep format
   * @param {boolean} [prettify=true] - Whether to format the output with indentation
   * @returns {string} OpenStep representation of the plist
   * @throws {PlistError} If conversion fails (e.g., booleans are not supported in OpenStep)
   */
  toOpenStep(prettify = true) {
    const { dataPtr, length } = this._withResult((res) =>
      this._wasm._plist_to_openstep_wrapper(
        res,
        this._handle,
        prettify ? 1 : 0,
      ),
    );
    return new TextDecoder().decode(
      new Uint8Array(this._wasm.HEAPU8.buffer, dataPtr, length),
    );
  }

  /**
   * Frees the native plist handle. Must be called when done with the plist
   * to prevent memory leaks.
   */
  free() {
    if (this._handle) {
      this._wasm._plist_free_handle(this._handle);
      this._handle = null;
    }
  }
}

/** @type {object|undefined} */
let wasmModule;

/**
 * Initializes the WebAssembly module. Must be called before using {@link parse} or {@link version}.
 * @returns {Promise<void>}
 */
export async function init() {
  if (!wasmModule) {
    wasmModule = await createPlistModule();
  }
}

/**
 * @param {string|Uint8Array} data
 * @returns {{ptr: number, length: number}}
 * @private
 */
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

/**
 * Parses plist data and returns a Plist object for format conversion.
 * The input format is automatically detected.
 * @param {string|Uint8Array} data - The plist data to parse (XML, JSON, OpenStep, or binary)
 * @returns {Plist} A Plist object that can be converted to different formats
 * @throws {Error} If the module is not initialized
 * @throws {PlistError} If parsing fails
 * @example
 * await init();
 * const plist = parse('<plist version="1.0"><string>Hello</string></plist>');
 * console.log(plist.formatName); // 'xml'
 * console.log(plist.toJSON());
 * plist.free();
 */
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

/**
 * Returns the libplist version string
 * @returns {string} Version string (e.g., "2.3.0")
 * @throws {Error} If the module is not initialized
 */
export function version() {
  if (!wasmModule) {
    throw new Error("Module not initialized. Call init() first.");
  }
  const ptr = wasmModule._get_version();
  return wasmModule.UTF8ToString(ptr);
}

/**
 * Converts plist data to binary format.
 * This is a convenience function that parses and converts in one step.
 * @param {string|Uint8Array} data - The plist data to convert
 * @returns {Uint8Array} Binary representation of the plist
 * @throws {Error} If the module is not initialized
 * @throws {PlistError} If parsing or conversion fails
 */
export function toBinary(data) {
  const plist = parse(data);
  try {
    return plist.toBinary();
  } finally {
    plist.free();
  }
}

/**
 * Converts plist data to XML format.
 * This is a convenience function that parses and converts in one step.
 * @param {string|Uint8Array} data - The plist data to convert
 * @returns {string} XML representation of the plist
 * @throws {Error} If the module is not initialized
 * @throws {PlistError} If parsing or conversion fails
 */
export function toXML(data) {
  const plist = parse(data);
  try {
    return plist.toXML();
  } finally {
    plist.free();
  }
}

/**
 * Converts plist data to JSON format.
 * This is a convenience function that parses and converts in one step.
 * @param {string|Uint8Array} data - The plist data to convert
 * @param {boolean} [prettify=true] - Whether to format the output with indentation
 * @returns {string} JSON representation of the plist
 * @throws {Error} If the module is not initialized
 * @throws {PlistError} If parsing or conversion fails
 */
export function toJSON(data, prettify = true) {
  const plist = parse(data);
  try {
    return plist.toJSON(prettify);
  } finally {
    plist.free();
  }
}

/**
 * Converts plist data to OpenStep format.
 * This is a convenience function that parses and converts in one step.
 * @param {string|Uint8Array} data - The plist data to convert
 * @param {boolean} [prettify=true] - Whether to format the output with indentation
 * @returns {string} OpenStep representation of the plist
 * @throws {Error} If the module is not initialized
 * @throws {PlistError} If parsing or conversion fails (e.g., booleans are not supported in OpenStep)
 */
export function toOpenStep(data, prettify = true) {
  const plist = parse(data);
  try {
    return plist.toOpenStep(prettify);
  } finally {
    plist.free();
  }
}
