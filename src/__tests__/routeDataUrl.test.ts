import { describe, expect, it } from "vitest";
import { resolveRouteDataUrl } from "../utils/routeDataUrl";

describe("resolveRouteDataUrl", () => {
    it("returns undefined when the env var is missing", () => {
        expect(resolveRouteDataUrl(undefined, "/transit/")).toBeUndefined();
        expect(resolveRouteDataUrl("   ", "/transit/")).toBeUndefined();
    });

    it("leaves absolute URLs unchanged", () => {
        expect(
            resolveRouteDataUrl(
                "https://cdn.example.com/routes.feed.json",
                "/transit/",
            ),
        ).toBe("https://cdn.example.com/routes.feed.json");
    });

    it("resolves base-relative paths for GitHub Pages", () => {
        expect(resolveRouteDataUrl("data/routes.feed.json", "/transit/")).toBe(
            "/transit/data/routes.feed.json",
        );
        expect(resolveRouteDataUrl("/data/routes.feed.json", "/transit/")).toBe(
            "/transit/data/routes.feed.json",
        );
        expect(
            resolveRouteDataUrl("./transit/data/routes.feed.json", "/transit/"),
        ).toBe("/transit/data/routes.feed.json");
        expect(
            resolveRouteDataUrl("/transit/data/routes.feed.json", "/transit/"),
        ).toBe("/transit/data/routes.feed.json");
    });

    it("keeps local dev paths rooted at slash when base is slash", () => {
        expect(resolveRouteDataUrl("data/routes.feed.json", "/")).toBe(
            "/data/routes.feed.json",
        );
        expect(resolveRouteDataUrl("/data/routes.feed.json", "/")).toBe(
            "/data/routes.feed.json",
        );
    });
});
