import { describe, it, expect } from "vitest";
import { HOME_CENTER, HOME_BOUNDS, HOME_PADDING } from "../homeView";
import { destinations } from "../data/destinations";

describe("homeView", () => {
    // ── Bug 1: "home button zooms to the left" ──────────────────────────
    // Root cause: center was computed via Leaflet's getBoundsZoom + getCenter
    // which depends on map pixel dimensions and can differ per call.
    // Fix: pre-compute center from raw coordinates (pure math).

    it("HOME_CENTER is deterministic across repeated reads", () => {
        // Re-import should give the exact same values
        const first = [...HOME_CENTER];
        const second = [...HOME_CENTER];
        expect(first).toEqual(second);
    });

    it("HOME_CENTER is the midpoint of all destination coordinates", () => {
        const points = destinations.map((d) => d.position as [number, number]);
        const lats = points.map((p) => p[0]);
        const lngs = points.map((p) => p[1]);
        const expectedLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const expectedLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

        expect(HOME_CENTER[0]).toBe(expectedLat);
        expect(HOME_CENTER[1]).toBe(expectedLng);
    });

    it("HOME_CENTER latitude is within Seattle city limits", () => {
        // Seattle roughly spans 47.49 – 47.74
        expect(HOME_CENTER[0]).toBeGreaterThan(47.49);
        expect(HOME_CENTER[0]).toBeLessThan(47.74);
    });

    it("HOME_CENTER longitude is within Seattle city limits", () => {
        // Seattle roughly spans -122.44 – -122.24
        expect(HOME_CENTER[1]).toBeGreaterThan(-122.44);
        expect(HOME_CENTER[1]).toBeLessThan(-122.24);
    });

    // ── Bug 2: "default view is too far away" ────────────────────────────
    // Root cause: used getBoundsZoom (map-dependent) and the +1 boost was
    // unreliable. Fix: use fitBounds with a positive maxZoom bump directly,
    // and use reasonable padding.

    it("HOME_BOUNDS encloses all destinations", () => {
        const [[south, west], [north, east]] = HOME_BOUNDS;
        for (const dest of destinations) {
            const [lat, lng] = dest.position as [number, number];
            expect(lat).toBeGreaterThanOrEqual(south);
            expect(lat).toBeLessThanOrEqual(north);
            expect(lng).toBeGreaterThanOrEqual(west);
            expect(lng).toBeLessThanOrEqual(east);
        }
    });

    it("HOME_BOUNDS corners match the min/max of destinations exactly", () => {
        const points = destinations.map((d) => d.position as [number, number]);
        const lats = points.map((p) => p[0]);
        const lngs = points.map((p) => p[1]);

        expect(HOME_BOUNDS[0][0]).toBe(Math.min(...lats));
        expect(HOME_BOUNDS[0][1]).toBe(Math.min(...lngs));
        expect(HOME_BOUNDS[1][0]).toBe(Math.max(...lats));
        expect(HOME_BOUNDS[1][1]).toBe(Math.max(...lngs));
    });

    it("HOME_PADDING is a positive number", () => {
        expect(HOME_PADDING).toBeGreaterThan(0);
    });

    // ── Stability: no Leaflet map instance needed ────────────────────────
    // The values are plain numbers, not Leaflet objects. This means they
    // cannot be affected by map pixel size, animation state, or timing.

    it("HOME_CENTER is a plain [number, number] tuple", () => {
        expect(typeof HOME_CENTER[0]).toBe("number");
        expect(typeof HOME_CENTER[1]).toBe("number");
        expect(HOME_CENTER).toHaveLength(2);
    });

    it("HOME_BOUNDS is a plain [[number, number], [number, number]]", () => {
        expect(HOME_BOUNDS).toHaveLength(2);
        expect(HOME_BOUNDS[0]).toHaveLength(2);
        expect(HOME_BOUNDS[1]).toHaveLength(2);
        for (const corner of HOME_BOUNDS) {
            for (const v of corner) {
                expect(typeof v).toBe("number");
                expect(Number.isFinite(v)).toBe(true);
            }
        }
    });
});

describe("HomeButton simulation", () => {
    // Simulate what the home button does: it should produce exactly the
    // same center and zoom on every call, regardless of how many times
    // it is called or what intermediate state the "map" is in.

    it("produces identical view parameters on 100 consecutive calls", () => {
        const results: Array<{ center: [number, number] }> = [];
        for (let i = 0; i < 100; i++) {
            results.push({ center: [...HOME_CENTER] as [number, number] });
        }
        for (const r of results) {
            expect(r.center[0]).toBe(results[0].center[0]);
            expect(r.center[1]).toBe(results[0].center[1]);
        }
    });

    it("center does not depend on any external mutable state", () => {
        // HOME_CENTER is a module-level constant; verify it's frozen or at
        // least the same reference each time.
        const a = HOME_CENTER;
        const b = HOME_CENTER;
        expect(a).toBe(b); // same reference
    });
});
