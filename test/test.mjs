import { init, toXml, toBinary, toJson, toOpenStep, detectFormat, formatName, version, Format } from '../dist/plist.mjs';

const xmlPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Name</key>
    <string>Test</string>
    <key>Count</key>
    <integer>42</integer>
    <key>Enabled</key>
    <true/>
    <key>Items</key>
    <array>
        <string>one</string>
        <string>two</string>
        <string>three</string>
    </array>
</dict>
</plist>`;

// OpenStep-compatible plist (no booleans, dates, or data)
const xmlPlistOpenStepCompat = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Name</key>
    <string>Test</string>
    <key>Count</key>
    <integer>42</integer>
    <key>Items</key>
    <array>
        <string>one</string>
        <string>two</string>
        <string>three</string>
    </array>
</dict>
</plist>`;

const jsonPlist = `{
    "Name": "Test",
    "Count": 42,
    "Enabled": true,
    "Items": ["one", "two", "three"]
}`;

const openStepPlist = `{
    Name = Test;
    Count = 42;
    Items = (one, two, three);
}`;

async function test() {
    console.log('Initializing WASM module...');
    await init();

    console.log('libplist version:', version());
    console.log('');

    // Test XML parsing
    console.log('=== Test XML input ===');
    console.log('Input format:', formatName(detectFormat(xmlPlist)));

    console.log('\nConverting to JSON:');
    console.log(toJson(xmlPlist));

    console.log('\nConverting to OpenStep (note: booleans not supported in OpenStep format):');
    console.log(toOpenStep(xmlPlistOpenStepCompat));

    console.log('\nConverting to Binary (hex):');
    const binary = toBinary(xmlPlist);
    console.log(binary);
    console.log('Length:', binary.length, 'bytes');
    console.log('Header:', Array.from(binary.slice(0, 8)).map(b => String.fromCharCode(b)).join(''));

    // Test JSON parsing
    console.log('\n=== Test JSON input ===');
    console.log('Input format:', formatName(detectFormat(jsonPlist)));

    console.log('\nConverting to XML:');
    console.log(toXml(jsonPlist));

    // Test OpenStep parsing
    console.log('\n=== Test OpenStep input ===');
    console.log('Input format:', formatName(detectFormat(openStepPlist)));

    console.log('\nConverting to JSON:');
    console.log(toJson(openStepPlist));

    // Test binary parsing
    console.log('\n=== Test Binary input ===');
    console.log('Input format:', formatName(detectFormat(binary)));

    console.log('\nConverting binary back to XML:');
    console.log(toXml(binary));

    console.log('\n=== All tests passed! ===');
}

test().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
