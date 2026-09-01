import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach } from "vitest";

if (typeof HTMLElement.prototype.scrollIntoView !== "function") {
  HTMLElement.prototype.scrollIntoView = function scrollIntoView() {
    // jsdom does not implement layout scrolling.
  };
}

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
