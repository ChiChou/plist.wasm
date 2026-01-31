/**
 * WebAssembly wrapper for libplist
 * Supports parsing and converting plists between XML, JSON, OpenStep, and binary formats
 */

import createPlistModule from './plist_wasm.mjs';

let wasmModule = null;
let wasmReady = false;

const Format = {
    NONE: 0,
    XML: 1,
    BINARY: 2,
    JSON: 3,
    OPENSTEP: 4,
};

const ErrorCode = {
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
    [ErrorCode.SUCCESS]: 'Success',
    [ErrorCode.INVALID_ARG]: 'Invalid argument',
    [ErrorCode.FORMAT]: 'Format error - nodes not compatible with output format',
    [ErrorCode.PARSE]: 'Parse error',
    [ErrorCode.NO_MEM]: 'Out of memory',
    [ErrorCode.IO]: 'I/O error',
    [ErrorCode.CIRCULAR_REF]: 'Circular reference detected',
    [ErrorCode.MAX_NESTING]: 'Maximum nesting depth exceeded',
    [ErrorCode.UNKNOWN]: 'Unknown error',
};

class PlistError extends Error {
    constructor(code) {
        super(ErrorMessages[code] || `Unknown error code: ${code}`);
        this.name = 'PlistError';
        this.code = code;
    }
}

/**
 * Initialize the WASM module
 * @returns {Promise<void>}
 */
async function init() {
    if (wasmReady) return;
    wasmModule = await createPlistModule();
    wasmReady = true;
}

/**
 * Ensure module is initialized
 */
function ensureReady() {
    if (!wasmReady) {
        throw new Error('WASM module not initialized. Call init() first.');
    }
}

/**
 * Convert input to buffer pointer
 * @param {string | Uint8Array} data
 * @returns {{ptr: number, length: number}}
 */
function toBuffer(data) {
    let bytes;
    if (typeof data === 'string') {
        bytes = new TextEncoder().encode(data);
    } else if (data instanceof Uint8Array) {
        bytes = data;
    } else {
        throw new TypeError('Input must be a string or Uint8Array');
    }

    const ptr = wasmModule._alloc_buffer(bytes.length);
    if (!ptr) {
        throw new PlistError(ErrorCode.NO_MEM);
    }

    wasmModule.HEAPU8.set(bytes, ptr);
    return { ptr, length: bytes.length };
}

/**
 * Get result string from WASM
 * @returns {string}
 */
function getResultString() {
    const error = wasmModule._get_error();
    if (error !== 0) {
        throw new PlistError(error);
    }

    const dataPtr = wasmModule._get_data();
    const length = wasmModule._get_length();

    if (!dataPtr || length === 0) {
        return '';
    }

    const bytes = new Uint8Array(wasmModule.HEAPU8.buffer, dataPtr, length);
    return new TextDecoder().decode(bytes);
}

/**
 * Get result binary from WASM
 * @returns {Uint8Array}
 */
function getResultBinary() {
    const error = wasmModule._get_error();
    if (error !== 0) {
        throw new PlistError(error);
    }

    const dataPtr = wasmModule._get_data();
    const length = wasmModule._get_length();

    if (!dataPtr || length === 0) {
        return new Uint8Array(0);
    }

    // Copy the data to a new Uint8Array
    const result = new Uint8Array(length);
    result.set(new Uint8Array(wasmModule.HEAPU8.buffer, dataPtr, length));
    return result;
}

/**
 * Convert plist to XML format
 * @param {string | Uint8Array} data - Input plist data (any supported format)
 * @returns {string} XML string
 */
function toXml(data) {
    ensureReady();
    const { ptr, length } = toBffer(data);

    try {
        wasmModule._plist_to_xml_wrapper(ptr, length);
        return getResultString();
    } finally {
        wasmModule._free_buffer(ptr);
    }
}

/**
 * Convert plist to binary format
 * @param {string | Uint8Array} data - Input plist data (any supported format)
 * @returns {Uint8Array} Binary plist data
 */
function toBinary(data) {
    ensureReady();
    const { ptr, length } = toBuffer(data);

    try {
        wasmModule._plist_to_bin_wrapper(ptr, length);
        return getResultBinary();
    } finally {
        wasmModule._free_buffer(ptr);
    }
}

/**
 * Convert plist to JSON format
 * @param {string | Uint8Array} data - Input plist data (any supported format)
 * @param {boolean} [prettify=true] - Whether to prettify the output
 * @returns {string} JSON string
 */
function toJson(data, prettify = true) {
    ensureReady();
    const { ptr, length } = toBuffer(data);

    try {
        wasmModule._plist_to_json_wrapper(ptr, length, prettify ? 1 : 0);
        return getResultString();
    } finally {
        wasmModule._free_buffer(ptr);
    }
}

/**
 * Convert plist to OpenStep (NeXTSTEP) format
 * @param {string | Uint8Array} data - Input plist data (any supported format)
 * @param {boolean} [prettify=true] - Whether to prettify the output
 * @returns {string} OpenStep string
 */
function toOpenStep(data, prettify = true) {
    ensureReady();
    const { ptr, length } = toBuffer(data);

    try {
        wasmModule._plist_to_openstep_wrapper(ptr, length, prettify ? 1 : 0);
        return getResultString();
    } finally {
        wasmModule._free_buffer(ptr);
    }
}

/**
 * Detect the format of plist data
 * @param {string | Uint8Array} data - Input plist data
 * @returns {number} Format constant (see Format enum)
 */
function detectFormat(data) {
    ensureReady();
    const { ptr, length } = toBuffer(data);

    try {
        wasmModule._plist_detect_format(ptr, length);
        const error = wasmModule._get_error();
        if (error !== 0) {
            throw new PlistError(error);
        }
        return wasmModule._get_format();
    } finally {
        wasmModule._free_buffer(ptr);
    }
}

/**
 * Get the format name from format constant
 * @param {number} format - Format constant
 * @returns {string} Format name
 */
function formatName(format) {
    switch (format) {
        case Format.XML: return 'xml';
        case Format.BINARY: return 'binary';
        case Format.JSON: return 'json';
        case Format.OPENSTEP: return 'openstep';
        default: return 'unknown';
    }
}

/**
 * Get libplist version
 * @returns {string}
 */
function version() {
    ensureReady();
    const ptr = wasmModule._get_version();
    return wasmModule.UTF8ToString(ptr);
}

export {
    init,
    toXml,
    toBinary,
    toJson,
    toOpenStep,
    detectFormat,
    formatName,
    version,
    Format,
    ErrorCode,
    PlistError,
};
