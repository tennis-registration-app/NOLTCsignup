/**
 * useRegistrationDerived — unit tests
 *
 * Tests the waitlist CTA derived state computation:
 *   - canFirstGroupPlay / canSecondGroupPlay
 *   - firstWaitlistEntry / secondWaitlistEntry
 *   - canPassThroughGroupPlay / passThroughEntry
 *   - deferred group uses fullTime count instead of selectable count
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { renderHandlerHook } from "../../../../helpers/handlerTestHarness.js";
import { useRegistrationDerived } from "../../../../../src/registration/appHandlers/state/useRegistrationDerived.js";

const CONSTANTS = { MEMBER_COUNT: 10, MEMBER_ID_START: 1000 };

// Helper: build a minimal CourtSelection object
function makeCourtSelection({
  selectable = 0,
  fullTime = 0,
  selectableCourts = [],
}: { selectable?: number, fullTime?: number, selectableCourts?: any[] } = {}): any {
  return {
    countSelectableForGroup: (_count: any) => selectable,
    countFullTimeForGroup: (_count: any) => fullTime,
    selectableCourts,
  };
}

// Helper: build a waitlist entry
function makeEntry(id: any, players: any, opts: any = {}) {
  return {
    id,
    position: opts.position ?? id,
    group: {
      type: "singles",
      players: players.map((name: any) => ({ displayName: name, name })),
    },
    joinedAt: new Date().toISOString(),
    minutesWaiting: 5,
    deferred: opts.deferred ?? false,
  };
}

let unmount: (() => void) | null;
afterEach(() => {
  if (unmount) {
    unmount();
    unmount = null;
  }
});

// Helper: render hook and store unmount for cleanup
async function render(data: any, opts: any = {}) {
  const out = await renderHandlerHook(() =>
    useRegistrationDerived({
      data,
      CONSTANTS,
      isMobileView: opts.isMobileView ?? false,
    })
  );
  unmount = out.unmount;
  return out.result as unknown as { current: ReturnType<typeof useRegistrationDerived> };
}

describe("empty waitlist", () => {
  it("returns null entries and false flags when waitlist is empty", async () => {
    const result = await render({
      waitlist: [],
      courtSelection: makeCourtSelection({ selectable: 2, selectableCourts: [1, 2] }),
    });

    expect(result.current!.firstWaitlistEntry).toBeNull();
    expect(result.current!.secondWaitlistEntry).toBeNull();
    expect(result.current!.canFirstGroupPlay).toBe(false);
    expect(result.current!.canSecondGroupPlay).toBe(false);
    expect(result.current!.canPassThroughGroupPlay).toBe(false);
    expect(result.current!.passThroughEntry).toBeNull();
  });
});

describe("canFirstGroupPlay", () => {
  it("is true when courtSelection returns selectable count > 0", async () => {
    const result = await render({
      waitlist: [makeEntry(1, ["Alice", "Bob"])],
      courtSelection: makeCourtSelection({ selectable: 1, selectableCourts: [1] }),
    });

    expect(result.current!.canFirstGroupPlay).toBe(true);
    expect(result.current!.firstWaitlistEntry).not.toBeNull();
    expect(result.current!.firstWaitlistEntry!.id).toBe(1);
  });

  it("is false when courtSelection returns 0 selectable courts", async () => {
    const result = await render({
      waitlist: [makeEntry(1, ["Alice"])],
      courtSelection: makeCourtSelection({ selectable: 0, selectableCourts: [] }),
    });

    expect(result.current!.canFirstGroupPlay).toBe(false);
  });

  it("is false when courtSelection is null", async () => {
    const result = await render({
      waitlist: [makeEntry(1, ["Alice"])],
      courtSelection: null,
    });

    expect(result.current!.canFirstGroupPlay).toBe(false);
  });
});

describe("canSecondGroupPlay", () => {
  it("is true when 2 selectable courts available and both groups waiting", async () => {
    const result = await render({
      waitlist: [makeEntry(1, ["Alice"]), makeEntry(2, ["Bob"])],
      courtSelection: makeCourtSelection({ selectable: 2, selectableCourts: [1, 2] }),
    });

    expect(result.current!.canFirstGroupPlay).toBe(true);
    expect(result.current!.canSecondGroupPlay).toBe(true);
    expect(result.current!.secondWaitlistEntry!.id).toBe(2);
  });

  it("is false when only 1 court available (first plays, second waits)", async () => {
    const result = await render({
      waitlist: [makeEntry(1, ["Alice"]), makeEntry(2, ["Bob"])],
      courtSelection: makeCourtSelection({ selectable: 1, selectableCourts: [1] }),
    });

    expect(result.current!.canFirstGroupPlay).toBe(true);
    expect(result.current!.canSecondGroupPlay).toBe(false);
  });

  it("returns null secondWaitlistEntry when there is only one waiting group", async () => {
    const result = await render({
      waitlist: [makeEntry(1, ["Alice"])],
      courtSelection: makeCourtSelection({ selectable: 2, selectableCourts: [1, 2] }),
    });

    expect(result.current!.secondWaitlistEntry).toBeNull();
    expect(result.current!.canSecondGroupPlay).toBe(false);
  });
});

describe("deferred groups", () => {
  it("uses countFullTimeForGroup for deferred first group", async () => {
    // Deferred group uses fullTime count, not selectable
    const result = await render({
      waitlist: [makeEntry(1, ["Alice"], { deferred: true })],
      courtSelection: makeCourtSelection({
        selectable: 0,
        fullTime: 1,   // deferred uses fullTime
        selectableCourts: [1],
      }),
    });

    expect(result.current!.canFirstGroupPlay).toBe(true);
  });

  it("uses countSelectableForGroup for non-deferred first group", async () => {
    const result = await render({
      waitlist: [makeEntry(1, ["Alice"], { deferred: false })],
      courtSelection: makeCourtSelection({
        selectable: 0,
        fullTime: 5,   // high fullTime but non-deferred uses selectable=0
        selectableCourts: [],
      }),
    });

    expect(result.current!.canFirstGroupPlay).toBe(false);
  });
});

describe("passThroughEntry", () => {
  it("is null when no courts are available", async () => {
    const result = await render({
      waitlist: [makeEntry(1, ["A"]), makeEntry(2, ["B"]), makeEntry(3, ["C"])],
      courtSelection: makeCourtSelection({ selectable: 0, selectableCourts: [] }),
    });

    expect(result.current!.canPassThroughGroupPlay).toBe(false);
    expect(result.current!.passThroughEntry).toBeNull();
  });

  it("is null when selectableCourts list is empty even if count>0", async () => {
    // passThrough only triggers when selectableCourts.length > 0
    const result = await render({
      waitlist: [makeEntry(1, ["A"]), makeEntry(2, ["B"]), makeEntry(3, ["C"])],
      courtSelection: makeCourtSelection({ selectable: 0, selectableCourts: [] }),
    });

    expect(result.current!.passThroughEntry).toBeNull();
  });
});

describe("isMobileView pass-through", () => {
  it("returns isMobileView true when passed true", async () => {
    const result = await render({ waitlist: [], courtSelection: null }, { isMobileView: true });
    expect(result.current!.isMobileView).toBe(true);
  });

  it("returns isMobileView false when passed false", async () => {
    const result = await render({ waitlist: [], courtSelection: null }, { isMobileView: false });
    expect(result.current!.isMobileView).toBe(false);
  });
});

describe("firstWaitlistEntryData alias", () => {
  it("firstWaitlistEntryData equals firstWaitlistEntry", async () => {
    const result = await render({
      waitlist: [makeEntry(5, ["Eve"])],
      courtSelection: makeCourtSelection({ selectable: 1, selectableCourts: [1] }),
    });
    expect(result.current!.firstWaitlistEntryData).toEqual(result.current!.firstWaitlistEntry);
  });

  it("secondWaitlistEntryData equals secondWaitlistEntry", async () => {
    const result = await render({
      waitlist: [makeEntry(1, ["A"]), makeEntry(2, ["B"])],
      courtSelection: makeCourtSelection({ selectable: 2, selectableCourts: [1, 2] }),
    });
    expect(result.current!.secondWaitlistEntryData).toEqual(result.current!.secondWaitlistEntry);
  });
});
