import { QueryClient, QueryClientProvider } from "react-query";
import { useCurrentUser, useLogout, hasRole } from "main/utils/currentUser";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  apiCurrentUserFixtures,
  currentUserFixtures,
} from "fixtures/currentUserFixtures";
import mockConsole from "jest-mock-console";
import { useNavigate } from "react-router";
import { systemInfoFixtures } from "fixtures/systemInfoFixtures";

import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

jest.mock("react-router");
const { MemoryRouter } = jest.requireActual("react-router");

describe("utils/currentUser tests", () => {
  describe("useCurrentUser tests", () => {
    test("useCurrentUser retrieves initial data", async () => {
      const queryClient = new QueryClient();
      const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const axiosMock = new AxiosMockAdapter(axios);
      axiosMock.onGet("/api/currentUser").timeoutOnce();
      axiosMock
        .onGet("/api/systemInfo")
        .reply(200, systemInfoFixtures.showingNeither);

      const restoreConsole = mockConsole();

      const { result } = renderHook(() => useCurrentUser(), { wrapper });
      await waitFor(() => result.current.isSuccess);

      expect(result.current.data).toEqual({
        loggedIn: false,
        root: null,
        initialData: true,
      });

      const queryState = queryClient.getQueryState("current user");
      expect(queryState).toBeDefined();

      queryClient.clear();

      await waitFor(() => expect(console.error).toHaveBeenCalled());
      const errorMessage = console.error.mock.calls[0][0];
      expect(errorMessage).toMatch(/Error invoking axios.get:/);
      restoreConsole();
    });

    test("useCurrentUser retrieves data from API", async () => {
      const queryClient = new QueryClient();
      const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const axiosMock = new AxiosMockAdapter(axios);
      axiosMock
        .onGet("/api/currentUser")
        .reply(200, apiCurrentUserFixtures.userOnly);
      axiosMock
        .onGet("/api/systemInfo")
        .reply(200, systemInfoFixtures.showingNeither);

      const { result } = renderHook(() => useCurrentUser(), { wrapper });

      await waitFor(() => result.current.isFetched);

      expect(result.current.data).toEqual(currentUserFixtures.userOnly);
      queryClient.clear();
    });

    test("useCurrentUser when API unreachable", async () => {
      const queryClient = new QueryClient();
      const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const axiosMock = new AxiosMockAdapter(axios);
      axiosMock.onGet("/api/currentUser").reply(404);

      const restoreConsole = mockConsole();
      const { result } = renderHook(() => useCurrentUser(), { wrapper });

      await waitFor(() => result.current.isFetched);
      expect(console.error).toHaveBeenCalled();
      const errorMessage = console.error.mock.calls[0][0];
      expect(errorMessage).toMatch(/Error invoking axios.get:/);
      restoreConsole();

      expect(result.current.data).toEqual({
        initialData: true,
        loggedIn: false,
        root: null,
      });
      queryClient.clear();
    });

    test("useCurrentUser handles missing roles correctly", async () => {
      const queryClient = new QueryClient();
      const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );

      const apiResult = apiCurrentUserFixtures.missingRolesToTestErrorHandling;
      const axiosMock = new AxiosMockAdapter(axios);
      axiosMock.onGet("/api/currentUser").reply(200, apiResult);

      const restoreConsole = mockConsole();
      const { result } = renderHook(() => useCurrentUser(), { wrapper });

      await waitFor(() => result.current.isFetched);
      expect(console.error).toHaveBeenCalled();
      const errorMessage = console.error.mock.calls[0][0];
      expect(errorMessage).toMatch(/Error getting roles: /);
      restoreConsole();

      let expectedResult = {
        loggedIn: true,
        root: { ...apiResult, rolesList: ["ERROR_GETTING_ROLES"] },
      };
      expect(result.current.data).toEqual(expectedResult);
      queryClient.clear();
    });
  });
  describe("useLogout tests", () => {
    test("useLogout", async () => {
      const queryClient = new QueryClient();
      const wrapper = ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      );

      const axiosMock = new AxiosMockAdapter(axios);
      axiosMock.onPost("/logout").reply(200);

      const navigateSpy = jest.fn();
      useNavigate.mockImplementation(() => navigateSpy);

      const resetQueriesSpy = jest.spyOn(queryClient, "resetQueries");

      const { result } = renderHook(() => useLogout(), { wrapper });

      act(() => {
        expect(useNavigate).toHaveBeenCalled();
        result.current.mutate();
      });
      await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith("/"));

      await waitFor(() =>
        expect(resetQueriesSpy).toHaveBeenCalledWith("current user", {
          exact: true,
        }),
      );

      queryClient.clear();
    });
  });
  describe("hasRole tests", () => {
    test('hasRole(x,"ROLE_ADMIN") return falsy when currentUser ill-defined', async () => {
      expect(hasRole(null, "ROLE_ADMIN")).toBeFalsy();
      expect(hasRole({}, "ROLE_ADMIN")).toBeFalsy();
      expect(hasRole({ loggedIn: null }, "ROLE_ADMIN")).toBeFalsy();
      expect(hasRole({ loggedIn: true }, "ROLE_ADMIN")).toBeFalsy();
      expect(hasRole({ loggedIn: true, root: null }, "ROLE_ADMIN")).toBeFalsy();
      expect(hasRole({ loggedIn: true, root: {} }, "ROLE_ADMIN")).toBeFalsy();
      expect(
        hasRole({ loggedIn: true, root: { rolesList: null } }, "ROLE_ADMIN"),
      ).toBeFalsy();
    });

    test('hasRole(x,"ROLE_ADMIN") returns correct values when currentUser properly defined', async () => {
      expect(
        hasRole({ loggedIn: true, root: { rolesList: [] } }, "ROLE_ADMIN"),
      ).toBeFalsy();
      expect(
        hasRole(
          { loggedIn: true, root: { rolesList: ["ROLE_USER"] } },
          "ROLE_ADMIN",
        ),
      ).toBeFalsy();
      expect(
        hasRole(
          { loggedIn: true, root: { rolesList: ["ROLE_USER", "ROLE_ADMIN"] } },
          "ROLE_ADMIN",
        ),
      ).toBeTruthy();
    });

    test('hasRole(x,"ROLE_USER") returns correct values when currentUser properly defined', async () => {
      expect(
        hasRole({ loggedIn: true, root: { rolesList: [] } }, "ROLE_USER"),
      ).toBeFalsy();
      expect(
        hasRole(
          { loggedIn: true, root: { rolesList: ["ROLE_USER"] } },
          "ROLE_USER",
        ),
      ).toBeTruthy();
      expect(
        hasRole(
          { loggedIn: true, root: { rolesList: ["ROLE_USER", "ROLE_ADMIN"] } },
          "ROLE_USER",
        ),
      ).toBeTruthy();
    });

    test("hasRole returns correct values when data is in currentUser", async () => {
      const currentUser = { data: { root: { rolesList: ["ROLE_USER"] } } };
      expect(hasRole(currentUser, "ROLE_USER")).toBeTruthy();
      expect(hasRole(currentUser, "ROLE_ADMIN")).toBeFalsy();
    });

    test("hasRole falls back correctly with various data missing", async () => {
      expect(hasRole(null, "ROLE_USER")).toBeFalsy();
      expect(hasRole({}, "ROLE_USER")).toBeFalsy();
      expect(hasRole({ data: null }, "ROLE_USER")).toBeFalsy();
      expect(hasRole({ data: { root: null } }, "ROLE_USER")).toBeFalsy();
      expect(
        hasRole({ data: { root: { rolesList: null } } }, "ROLE_USER"),
      ).toBeFalsy();
      expect(
        hasRole({ data: { root: { rolesList: [] } } }, "ROLE_USER"),
      ).toBeFalsy();
    });
    expect(hasRole({ root: { rolesList: null } })).toBeFalsy();
  });
});
