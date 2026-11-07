import { describe, expect, it } from "vitest";
import { taskPatchFor } from "@/lib/ai/approvals";

describe("taskPatchFor", () => {
  it("re-queues the task and allows only the approved tool", () => {
    expect(taskPatchFor("approve", [], "change_quote_price")).toEqual({ status: "queued", approved_tools: ["change_quote_price"] });
  });

  it("keeps earlier approvals and does not duplicate a tool", () => {
    expect(taskPatchFor("approve", ["a", "b"], "b")).toEqual({ status: "queued", approved_tools: ["a", "b"] });
  });

  it("fails the task on rejection and grants nothing", () => {
    expect(taskPatchFor("reject", ["a"], "change_quote_price")).toEqual({ status: "failed" });
  });
});
