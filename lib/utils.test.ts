import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateId, sampleTopicPool } from "./utils";

const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("generateId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("sampleTopicPool", () => {
    const topics = [{ slug: "one", name: "One" }, { slug: "two", name: "Two" }];

    it("builds forty real decoys, the chosen topic, and one trailing decoy", () => {
      const result = sampleTopicPool(topics);
      expect(result.decoys).toHaveLength(42);
      expect(result.chosenIndex).toBe(40);
      expect(topics.map((topic) => topic.name)).toContain(result.decoys[40]);
      for (const name of result.decoys) expect(["One", "Two"]).toContain(name);
      expect(result.decoys.slice(0, 40)).not.toContain(result.decoys[40]);
      expect(result.decoys[41]).not.toBe(result.decoys[40]);
    });

    it("handles a single eligible topic without invented placeholder names", () => {
      const result = sampleTopicPool(topics.slice(0, 1));
      expect(result.decoys).toEqual(Array(42).fill("One"));
      expect(result.chosenIndex).toBe(40);
    });

    it("rejects empty pools and invalid strip sizes explicitly", () => {
      expect(() => sampleTopicPool([])).toThrow("No topics available");
      expect(() => sampleTopicPool(topics, 1)).toThrow("A reel needs");
      expect(() => sampleTopicPool(topics, 1.5)).toThrow("A reel needs");
    });
  });

  it("uses the global Web Crypto API rather than a Node-only import", () => {
    const id = "00112233-4455-4677-8899-aabbccddeeff";
    const crypto = { randomUUID: vi.fn(() => id) };
    vi.stubGlobal("crypto", crypto);

    expect(generateId()).toBe(id);
    expect(crypto.randomUUID).toHaveBeenCalledOnce();
  });

  it.each(["randomUUID", "getRandomValues"])(
    "generates unique version-4 UUIDs using %s",
    (method) => {
      vi.stubGlobal(
        "crypto",
        method === "randomUUID"
          ? webcrypto
          : { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) }
      );

      const ids = Array.from({ length: 1000 }, () => generateId());

      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(id).toMatch(uuidV4Pattern);
      }
    }
  );

  it.each([
    { fill: 0, expected: "00000000-0000-4000-8000-000000000000" },
    { fill: 255, expected: "ffffffff-ffff-4fff-bfff-ffffffffffff" },
  ])("sets version and variant bits for bytes filled with $fill", ({ fill, expected }) => {
    const crypto = {
      getRandomValues: vi.fn((bytes: Uint8Array) => bytes.fill(fill)),
    };
    vi.stubGlobal("crypto", crypto);

    expect(generateId()).toBe(expected);
    expect(crypto.getRandomValues).toHaveBeenCalledOnce();
    expect(crypto.getRandomValues.mock.calls[0][0]).toHaveLength(16);
  });

  it.each([undefined, {}])(
    "fails explicitly when secure randomness is unavailable (%j)",
    (crypto) => {
      vi.stubGlobal("crypto", crypto);

      expect(() => generateId()).toThrow(
        "Secure random number generation is unavailable."
      );
    }
  );

  it("does not hide errors from the random number generator", () => {
    const error = new Error("Random number generator failed");
    vi.stubGlobal("crypto", {
      getRandomValues: () => {
        throw error;
      },
    });

    expect(() => generateId()).toThrow(error);
  });
});
