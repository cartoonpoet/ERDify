import { useAuthStore } from "./useAuthStore";

afterEach(() => {
  useAuthStore.setState({ isAuthenticated: null });
});

it("initial state: isAuthenticated is null", () => {
  expect(useAuthStore.getState().isAuthenticated).toBeNull();
});

it("setAuthenticated(true) sets isAuthenticated to true", () => {
  useAuthStore.getState().setAuthenticated(true);
  expect(useAuthStore.getState().isAuthenticated).toBe(true);
});

it("setAuthenticated(false) sets isAuthenticated to false", () => {
  useAuthStore.getState().setAuthenticated(false);
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});
