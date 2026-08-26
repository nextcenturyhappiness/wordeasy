import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
