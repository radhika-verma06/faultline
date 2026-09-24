// @vitest-environment jsdom
/**
 * The flow suite.
 *
 * `docs/verification.md` listed the absence of this as the largest known gap: the
 * unit tests prove the engine, and nothing proved that the engine is wired to a
 * page. This drives the real component in a real DOM — type a name, answer the
 * questions, read the report — because the defects it catches live exactly where
 * unit tests cannot see them: a handler that never fires, a stage that never
 * advances, a screen that renders nothing.
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import Page from "./page";

/** React needs this to allow act() outside its own test utilities. */
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container);
    root.render(<Page />);
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function text(): string {
  return container.textContent ?? "";
}

function all(selector: string): Element[] {
  return [...container.querySelectorAll(selector)];
}

function button(match: string): HTMLButtonElement {
  const found = all("button").filter(
    (node) => (node.textContent ?? "").trim().toLowerCase().includes(match.toLowerCase()),
  );
  if (found.length === 0) {
    throw new Error(
      `No button matching "${match}". Buttons on screen: ${all("button")
        .map((node) => JSON.stringify((node.textContent ?? "").trim()))
        .join(", ")}`,
    );
  }
  return found[0] as HTMLButtonElement;
}

/** React tracks the input's value itself, so setting it directly is ignored. */
function type(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

function click(node: HTMLElement): void {
  act(() => {
    node.click();
  });
}

/** Lets the async handlers (`begin`, `submit`, `finish`) settle. */
async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

/** Starting a diagnosis is an async handler, so the click alone is not enough. */
async function beginDiagnosis(name: string, how: "click" | "return" = "click"): Promise<void> {
  const field = container.querySelector("#learner") as HTMLInputElement | null;
  expect(field, "the start screen has no name field").not.toBeNull();
  if (field === null) return;
  type(field, name);

  if (how === "return") {
    // What a student actually does: type a name, press Return. Without a form
    // around the field the browser has nothing to submit, nothing happens, and the
    // app looks broken.
    const form = field.closest("form");
    expect(form, "the name field is not inside a form, so Return cannot submit").not.toBeNull();
    act(() => {
      form?.dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      );
    });
  } else {
    click(button("Begin the diagnosis"));
  }

  await settle();
  // The start screen disappears only once setStage("asking") has committed.
  await settle();
}

describe("the flow", () => {
  it("renders the start screen", () => {
    expect(text()).toContain("Faultline");
    expect(text()).toContain("Begin the diagnosis");
    expect(container.querySelector("#learner")).not.toBeNull();
  });

  it("starts the diagnosis when the name is entered and Begin is pressed", async () => {
    await beginDiagnosis("Sam");
    expect(text()).toContain("Question 01");
    expect(text()).not.toContain("Begin the diagnosis");
  });

  it("starts the diagnosis when Return is pressed in the name field", async () => {
    await beginDiagnosis("Sam", "return");
    expect(text()).toContain("Question 01");
  });

  it("asks a question with options and a confidence control", async () => {
    await beginDiagnosis("Sam");
    const options = all("fieldset button");
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(text()).toContain("How sure are you?");
  });

  it("will not accept an answer before an option is chosen", async () => {
    await beginDiagnosis("Sam");
    expect(button("Send this answer").disabled).toBe(true);
    click(all("fieldset button")[0] as HTMLButtonElement);
    expect(button("Send this answer").disabled).toBe(false);
  });

  it("advances to the next question after an answer", async () => {
    await beginDiagnosis("Sam");
    const before = text().match(/Question (\d+)/)?.[1];
    click(all("fieldset button")[0] as HTMLButtonElement);
    click(button("Send this answer"));
    await settle();
    await settle();
    const after = text().match(/Question (\d+)/)?.[1];
    expect(after).not.toBe(before);
  });

  it("reaches the report and shows a map", async () => {
    await beginDiagnosis("Sam");
    for (let step = 0; step < 12; step += 1) {
      const options = all("fieldset button");
      if (options.length === 0) break;
      click(options[0] as HTMLButtonElement);
      const send = all("button").filter(
        (node) => (node.textContent ?? "").includes("Send this answer"),
      )[0] as HTMLButtonElement | undefined;
      if (!send || send.disabled) break;
      click(send);
      await settle();
      await settle();
    }
    expect(text()).toContain("The diagnosis");
    expect(text()).toContain("The map");
  });
});
