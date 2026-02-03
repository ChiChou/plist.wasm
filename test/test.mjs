import { init, parse, version } from "../dist/plist.mjs";

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
  console.log("Creating parser instance...");
  await init();

  console.log("libplist version:", version());
  console.log("");

  console.log("=== Test XML input ===");
  const xmlParsed = parse(xmlPlist);
  console.log("Input format:", xmlParsed.formatName);

  console.log("\nConverting to JSON:");
  console.log(xmlParsed.toJSON());

  console.log("\nConverting to Binary (hex):");
  const binary = xmlParsed.toBinary();
  console.log(binary);
  console.log("Length:", binary.length, "bytes");
  console.log(
    "Header:",
    Array.from(binary.slice(0, 8))
      .map((b) => String.fromCharCode(b))
      .join(""),
  );
  xmlParsed.free();

  console.log(
    "\nConverting to OpenStep (note: booleans not supported in OpenStep format):",
  );
  const xmlOpenStepParsed = parse(xmlPlistOpenStepCompat);
  console.log(xmlOpenStepParsed.toOpenStep());
  xmlOpenStepParsed.free();

  console.log("\n=== Test JSON input ===");
  const jsonParsed = parse(jsonPlist);
  console.log("Input format:", jsonParsed.formatName);

  console.log("\nConverting to XML:");
  console.log(jsonParsed.toXML());
  jsonParsed.free();

  console.log("\n=== Test OpenStep input ===");
  const openStepParsed = parse(openStepPlist);
  console.log("Input format:", openStepParsed.formatName);

  console.log("\nConverting to JSON:");
  console.log(openStepParsed.toJSON());
  openStepParsed.free();

  console.log("\n=== Test Binary input ===");
  const binaryParsed = parse(binary);
  console.log("Input format:", binaryParsed.formatName);

  console.log("\nConverting binary back to XML:");
  console.log(binaryParsed.toXML());
  binaryParsed.free();

  console.log("\n=== All tests passed! ===");
}

test().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
