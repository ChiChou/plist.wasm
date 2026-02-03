# plist.wasm

WebAssembly wrapper for [libplist](https://github.com/libimobiledevice/libplist). Parse and convert Apple Property Lists between XML, JSON, OpenStep, and binary formats in JavaScript.

## Dependencies

- [Emscripten SDK (emsdk)](https://emscripten.org/docs/getting_started/downloads.html) - for compiling to WebAssembly
- libplist - included as a git submodule

## Build

```bash
# Clone with submodules
git clone --recursive https://github.com/chichou/plist.wasm.git
cd plist.wasm

# Install and activate emsdk (if not already done)
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk && ./emsdk install latest && ./emsdk activate latest && cd ..

# Build
npm run build
```

## Usage

```javascript
import { init, parse, version, Format } from 'plist.wasm';

// Initialize WASM module (call once before parsing)
await init();

// Parse plist data (string or Uint8Array)
const plist = parse(xmlPlistString);

// Check detected format
console.log(plist.format);     // Format.XML, Format.BINARY, Format.JSON, or Format.OPENSTEP
console.log(plist.formatName); // "xml", "binary", "json", or "openstep"

// Convert to different formats
const json = plist.toJSON();
const binary = plist.toBinary();
const xml = plist.toXML();
const openstep = plist.toOpenStep();

// Free memory when done
plist.free();

// Get libplist version
console.log(version());
```

## API

### Module Functions

- `init()` - Initialize the WASM module (async, call once before parsing)
- `parse(data)` - Parse plist data, returns a `Plist` instance
- `version()` - Get libplist version string

### Plist

- `plist.format` - Detected format constant (Format.XML, Format.BINARY, etc.)
- `plist.formatName` - Detected format as string ("xml", "binary", etc.)
- `plist.toXML()` - Convert to XML format
- `plist.toBinary()` - Convert to binary format
- `plist.toJSON(prettify?)` - Convert to JSON format
- `plist.toOpenStep(prettify?)` - Convert to OpenStep format
- `plist.free()` - Free memory (call when done with this instance, unfortunately necessary due to WASM)

Input `data` can be a `string` or `Uint8Array`.

## License

LGPL-2.1
