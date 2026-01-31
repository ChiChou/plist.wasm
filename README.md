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
import { init, toXml, toBinary, toJson, toOpenStep, detectFormat, Format } from 'plist.wasm';

// Initialize the WASM module (required before any operations)
await init();

// Convert XML plist to JSON
const json = toJson(xmlPlistString);

// Convert any plist format to binary
const binary = toBinary(plistData);

// Convert binary plist to XML
const xml = toXml(binaryData);

// Convert to OpenStep format
const openstep = toOpenStep(plistData);

// Detect input format
const format = detectFormat(plistData);
// Returns: Format.XML, Format.BINARY, Format.JSON, or Format.OPENSTEP
```

## API

- `init()` - Initialize the WASM module (must be called first)
- `toXml(data)` - Convert plist to XML format
- `toBinary(data)` - Convert plist to binary format
- `toJson(data, prettify?)` - Convert plist to JSON format
- `toOpenStep(data, prettify?)` - Convert plist to OpenStep format
- `detectFormat(data)` - Detect input plist format
- `version()` - Get libplist version

Input `data` can be a `string` or `Uint8Array`.

## License

LGPL-2.1
