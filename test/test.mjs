import { describe, it, before } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  init,
  parse,
  version,
  Format,
  toXML,
  toBinary,
  toJSON,
  toOpenStep,
} from "../dist/plist.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const corpusDir = join(__dirname, "corpus");

const readCorpus = (name) => readFileSync(join(corpusDir, name), "utf-8");

describe("plist.wasm", () => {
  before(async () => {
    await init();
  });

  it("should report libplist version", () => {
    const ver = version();
    assert.ok(typeof ver === "string");
    assert.ok(ver.length > 0);
  });

  describe("XML plist", () => {
    it("should parse XML and detect format", () => {
      const xmlPlist = readCorpus("sample.xml");
      const plist = parse(xmlPlist);
      assert.strictEqual(plist.format, Format.XML);
      plist.free();
    });

    it("should convert XML to JSON", () => {
      const xmlPlist = readCorpus("sample.xml");
      const plist = parse(xmlPlist);
      const json = plist.toJSON();
      const obj = JSON.parse(json);
      assert.strictEqual(obj.Name, "Test");
      assert.strictEqual(obj.Count, 42);
      assert.strictEqual(obj.Enabled, true);
      assert.deepStrictEqual(obj.Items, ["one", "two", "three"]);
      plist.free();
    });

    it("should convert XML to binary", () => {
      const xmlPlist = readCorpus("sample.xml");
      const plist = parse(xmlPlist);
      const binary = plist.toBinary();
      assert.ok(binary instanceof Uint8Array);
      assert.ok(binary.length > 0);
      const header = Array.from(binary.slice(0, 6))
        .map((b) => String.fromCharCode(b))
        .join("");
      assert.strictEqual(header, "bplist");
      plist.free();
    });

    it("should convert XML to OpenStep (without booleans)", () => {
      const xmlPlist = readCorpus("sample-openstep-compat.xml");
      const plist = parse(xmlPlist);
      const openstep = plist.toOpenStep();
      assert.ok(typeof openstep === "string");
      assert.ok(openstep.includes("Name"));
      assert.ok(openstep.includes("Test"));
      plist.free();
    });
  });

  describe("JSON plist", () => {
    it("should parse JSON and detect format", () => {
      const jsonPlist = readCorpus("sample.json");
      const plist = parse(jsonPlist);
      assert.strictEqual(plist.format, Format.JSON);
      plist.free();
    });

    it("should convert JSON to XML", () => {
      const jsonPlist = readCorpus("sample.json");
      const plist = parse(jsonPlist);
      const xml = plist.toXML();
      assert.ok(xml.includes('<?xml version="1.0"'));
      assert.ok(xml.includes("<plist"));
      assert.ok(xml.includes("<key>Name</key>"));
      assert.ok(xml.includes("<string>Test</string>"));
      plist.free();
    });
  });

  describe("OpenStep plist", () => {
    it("should parse OpenStep and detect format", () => {
      const openStepPlist = readCorpus("sample.openstep");
      const plist = parse(openStepPlist);
      assert.strictEqual(plist.format, Format.OPENSTEP);
      plist.free();
    });

    it("should convert OpenStep to JSON", () => {
      const openStepPlist = readCorpus("sample.openstep");
      const plist = parse(openStepPlist);
      const json = plist.toJSON();
      const obj = JSON.parse(json);
      assert.strictEqual(obj.Name, "Test");
      assert.strictEqual(obj.Count, "42");
      assert.deepStrictEqual(obj.Items, ["one", "two", "three"]);
      plist.free();
    });
  });

  describe("Binary plist", () => {
    it("should parse binary and convert back to XML", () => {
      const xmlPlist = readCorpus("sample.xml");
      const plist = parse(xmlPlist);
      const binary = plist.toBinary();
      plist.free();

      const binaryPlist = parse(binary);
      assert.strictEqual(binaryPlist.format, Format.BINARY);

      const xml = binaryPlist.toXML();
      assert.ok(xml.includes('<?xml version="1.0"'));
      assert.ok(xml.includes("<key>Name</key>"));
      binaryPlist.free();
    });
  });

  describe("Convenience functions", () => {
    it("toJSON should convert XML to JSON", () => {
      const xmlPlist = readCorpus("sample.xml");
      const json = toJSON(xmlPlist);
      const obj = JSON.parse(json);
      assert.strictEqual(obj.Name, "Test");
      assert.strictEqual(obj.Count, 42);
    });

    it("toBinary should convert XML to binary", () => {
      const xmlPlist = readCorpus("sample.xml");
      const binary = toBinary(xmlPlist);
      assert.ok(binary instanceof Uint8Array);
      const header = Array.from(binary.slice(0, 6))
        .map((b) => String.fromCharCode(b))
        .join("");
      assert.strictEqual(header, "bplist");
    });

    it("toXML should convert JSON to XML", () => {
      const jsonPlist = readCorpus("sample.json");
      const xml = toXML(jsonPlist);
      assert.ok(xml.includes('<?xml version="1.0"'));
      assert.ok(xml.includes("<key>Name</key>"));
    });

    it("toOpenStep should convert XML to OpenStep", () => {
      const xmlPlist = readCorpus("sample-openstep-compat.xml");
      const openstep = toOpenStep(xmlPlist);
      assert.ok(openstep.includes("Name"));
      assert.ok(openstep.includes("Test"));
    });
  });
});
