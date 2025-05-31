import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import Moderate from "main/pages/Moderate";

// hooks to mock
import { useBackend } from "main/utils/useBackend";
import { useCurrentUser, hasRole, useLogout } from "main/utils/currentUser";
import { useSystemInfo } from "main/utils/systemInfo";

import { toast } from "react-toastify";
import usersFixtures from "fixtures/usersFixtures";
import { ReviewFixtures } from "fixtures/reviewFixtures";
import ReviewTable from "main/components/Reviews/ReviewTable";

// 1) Mock currentUser (including useLogout)
jest.mock("main/utils/currentUser", () => ({
  useCurrentUser: jest.fn(),
  hasRole: jest.fn(),
  useLogout: jest.fn(),
}));

// 2) Mock systemInfo
jest.mock("main/utils/systemInfo", () => ({
  useSystemInfo: jest.fn(),
}));

// 3) Mock useBackend
jest.mock("main/utils/useBackend", () => ({
  useBackend: jest.fn(),
}));

// 4) Mock toast
jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ModeratePage enhanced tests", () => {
  const axiosMock = new AxiosMockAdapter(axios);
  const queryClient = new QueryClient();

  const renderPage = () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Moderate />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    axiosMock.reset();
    axiosMock.resetHistory();
    queryClient.clear();

    // default: alias table returns threeUsers
    useBackend.mockReturnValue({
      data: usersFixtures.threeUsers,
      error: null,
      status: "success",
    });

    // default: currentUser is logged-in admin with root.user.email
    useCurrentUser.mockReturnValue({
      data: {
        loggedIn: true,
        admin: true,
        id: 1,
        root: { user: { email: "admin@ucsb.edu" } },
      },
      error: null,
      status: "success",
    });
    hasRole.mockReturnValue(true);

    // default: logout hook
    useLogout.mockReturnValue({ mutate: jest.fn() });

    // default: systemInfo hook
    useSystemInfo.mockReturnValue({
      data: { springH2ConsoleEnabled: false },
      error: null,
      status: "success",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders correctly for admin user", async () => {
    renderPage();

    await screen.findByText("Moderation Page");
    expect(
      screen.getByText(
        "This page is accessible only to admins and moderators. (Placeholder)",
      ),
    ).toBeInTheDocument();
  });

  test("triggers toast.success when clicking approve & reject", async () => {
    axiosMock.onPut("/api/currentUser/updateAliasModeration").reply(200);

    renderPage();

    // Approve
    const approveCell = await screen.findByTestId(
      "AliasTable-cell-row-0-col-Approve",
    );
    fireEvent.click(
      within(approveCell).getByRole("button", { name: "Approve" }),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining(
          `Alias "${usersFixtures.threeUsers[0].proposedAlias}"`,
        ),
      ),
    );

    // Reject
    const rejectCell = screen.getByTestId("AliasTable-cell-row-0-col-Reject");
    fireEvent.click(within(rejectCell).getByRole("button", { name: "Reject" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining(
          `Alias "${usersFixtures.threeUsers[0].proposedAlias}"`,
        ),
      ),
    );
  });

  test("shows toast.error when approve fails", async () => {
    const errMsg = "Approve failed";
    jest.spyOn(axios, "put").mockRejectedValueOnce(new Error(errMsg));

    renderPage();

    const approveCell = await screen.findByTestId(
      "AliasTable-cell-row-0-col-Approve",
    );
    fireEvent.click(
      within(approveCell).getByRole("button", { name: "Approve" }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining(`Error approving alias: ${errMsg}`),
      ),
    );
  });

  test("shows toast.error when reject fails", async () => {
    const errMsg = "Reject failed";
    jest.spyOn(axios, "put").mockRejectedValueOnce(new Error(errMsg));

    renderPage();

    const rejectCell = await screen.findByTestId(
      "AliasTable-cell-row-0-col-Reject",
    );
    fireEvent.click(within(rejectCell).getByRole("button", { name: "Reject" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining(`Error rejecting alias: ${errMsg}`),
      ),
    );
  });

  test("redirects non-admin/non-moderator user", async () => {
    // override to non-admin user
    useCurrentUser.mockReturnValueOnce({
      data: {
        loggedIn: true,
        admin: false,
        moderator: false,
        root: { user: { email: "user@ucsb.edu" } },
      },
      error: null,
      status: "success",
    });
    hasRole.mockReturnValue(false);

    renderPage();
    await waitFor(() =>
      expect(screen.queryByText("Moderation Page")).not.toBeInTheDocument(),
    );
  });

  test("approve calls axios.put with correct params and toast.success with full message", async () => {
    const putSpy = jest.spyOn(axios, "put").mockResolvedValueOnce({});

    renderPage();

    const cell = await screen.findByTestId("AliasTable-cell-row-0-col-Approve");
    fireEvent.click(within(cell).getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(putSpy).toHaveBeenCalledWith(
        "/api/currentUser/updateAliasModeration",
        null,
        { params: { id: usersFixtures.threeUsers[0].id, approved: true } },
      ),
    );
    expect(toast.success).toHaveBeenCalledWith(
      `Alias "${usersFixtures.threeUsers[0].proposedAlias}" for ID ${usersFixtures.threeUsers[0].id} approved!`,
    );
    putSpy.mockRestore();
  });

  test("reject calls axios.put with correct params and toast.success with full message", async () => {
    const putSpy = jest.spyOn(axios, "put").mockResolvedValueOnce({});

    renderPage();

    const cell = await screen.findByTestId("AliasTable-cell-row-0-col-Reject");
    fireEvent.click(within(cell).getByRole("button", { name: "Reject" }));
    await waitFor(() =>
      expect(putSpy).toHaveBeenCalledWith(
        "/api/currentUser/updateAliasModeration",
        null,
        { params: { id: usersFixtures.threeUsers[0].id, approved: false } },
      ),
    );
    expect(toast.success).toHaveBeenCalledWith(
      `Alias "${usersFixtures.threeUsers[0].proposedAlias}" for ID ${usersFixtures.threeUsers[0].id} rejected!`,
    );
    putSpy.mockRestore();
  });

  test("fallback error path shows `Unknown error` when err.message is falsy", async () => {
    jest.spyOn(axios, "put").mockRejectedValueOnce(new Error());

    renderPage();

    const cell = await screen.findByTestId("AliasTable-cell-row-0-col-Approve");
    fireEvent.click(within(cell).getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Error approving alias: Unknown error",
      ),
    );
  });

  test("fallback reject shows `Unknown error` when err.message is empty", async () => {
    jest.spyOn(axios, "put").mockRejectedValueOnce(new Error());

    renderPage();

    const cell = await screen.findByTestId("AliasTable-cell-row-0-col-Reject");
    fireEvent.click(within(cell).getByRole("button", { name: "Reject" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Error rejecting alias: Unknown error",
      ),
    );
  });
  test("renders no alias rows when backend returns null data", async () => {
    useBackend.mockReturnValueOnce({
      data: null,
      error: null,
      status: "success",
    });

    renderPage();
    await waitFor(() =>
      expect(screen.queryByTestId("AliasTable-row-0")).not.toBeInTheDocument(),
    );
  });

  test("hooks into backend with the correct endpoint and options", async () => {
    renderPage();
    await screen.findByText("Moderation Page");
    expect(useBackend).toHaveBeenCalledWith(
      ["/api/admin/usersWithProposedAlias"],
      { method: "GET", url: "/api/admin/usersWithProposedAlias" },
    );
  });

  test("renders page for moderator user", async () => {
    useCurrentUser.mockReturnValueOnce({
      data: {
        loggedIn: true,
        admin: false,
        moderator: true,
        root: { user: { email: "mod@ucsb.edu" } },
      },
      error: null,
      status: "success",
    });
    hasRole.mockReturnValueOnce(true);

    renderPage();
    await screen.findByText("Moderation Page");
  });

  test("aliases fallback to empty list when backend data is undefined", async () => {
    useBackend.mockImplementation((endpoint) => {
      if (endpoint[0] === "/api/admin/usersWithProposedAlias") {
        return { data: undefined, error: null, status: "success" };
      }
      // other endpoints (currentUser etc.) still return normal data
      return {
        data: usersFixtures.threeUsers,
        error: null,
        status: "success",
      };
    });

    renderPage();
    await screen.findByText("Moderation Page");
    expect(screen.queryByTestId("AliasTable-row-0")).not.toBeInTheDocument();
  });
  test("admin-only user still sees page (kills the &&->|| mutant)", async () => {
    // Stub currentUser as logged in admin (but NOT moderator)
    useCurrentUser.mockReturnValueOnce({
      data: {
        loggedIn: true,
        admin: true,
        id: 1,
        root: { user: { email: "admin@ucsb.edu" } },
      },
      error: null,
      status: "success",
    });
    // hasRole should only be true for ROLE_ADMIN
    hasRole.mockImplementation((u, role) => role === "ROLE_ADMIN");

    renderPage();
    await screen.findByText("Moderation Page");
  });

  test("moderator-only user still sees page (kills the literal ROLE_* mutant)", async () => {
    useCurrentUser.mockReturnValueOnce({
      data: {
        loggedIn: true,
        admin: false,
        moderator: true,
        id: 2,
        root: { user: { email: "mod@ucsb.edu" } },
      },
      error: null,
      status: "success",
    });
    // now only ROLE_MODERATOR is true
    hasRole.mockImplementation((u, role) => role === "ROLE_MODERATOR");

    renderPage();
    await screen.findByText("Moderation Page");
  });
  test("admin-only user still sees page when only admin (covers &&→||)", async () => {
    //currentUser is Admin，not Moderator
    useCurrentUser.mockReturnValueOnce({
      data: {
        loggedIn: true,
        admin: true,
        moderator: false,
        id: 1,
        root: { user: { email: "admin@ucsb.edu" } },
      },
      error: null,
      status: "success",
    });
    hasRole.mockImplementation((u, role) => role === "ROLE_ADMIN");

    renderPage();
    //  ( !admin && !mod ) => false，
    // ( !admin || !mod ) => true，
    await screen.findByText("Moderation Page");
  });

  test("moderator-only user still sees page (kills the ROLE_* literal mutants)", async () => {
    useCurrentUser.mockReturnValueOnce({
      data: {
        loggedIn: true,
        admin: false,
        moderator: true,
        id: 2,
        root: { user: { email: "mod@ucsb.edu" } },
      },
      error: null,
      status: "success",
    });
    // only ROLE_MODERATOR return true
    hasRole.mockImplementation((u, role) => role === "ROLE_MODERATOR");

    renderPage();
    await screen.findByText("Moderation Page");
  });
  test("useBackend called with correct URL and method for reviews", async () => {
    renderPage();
    await screen.findByText("Moderation Page");
    expect(useBackend).toHaveBeenCalledWith(["/api/reviews/needsmoderation"], {
      method: "GET",
      url: "/api/reviews/needsmoderation",
    });
  });

  test("renders ReviewTable with reviews data from fixtures (mocked)", async () => {
    useBackend.mockImplementation((endpoint) => {
      if (endpoint[0] === "/api/reviews/needsmoderation") {
        return {
          data: ReviewFixtures.threeReviews,
          error: null,
          status: "success",
        };
      }
      if (endpoint[0] === "/api/admin/usersWithProposedAlias") {
        return {
          data: usersFixtures.threeUsers,
          error: null,
          status: "success",
        };
      }
      return { data: null, error: null, status: "success" };
    });

    renderPage();

    await screen.findByText("Item ID");
    ReviewFixtures.threeReviews.forEach((review) => {
      expect(screen.getByText(review.itemId.toString())).toBeInTheDocument();
      expect(screen.getByText(review.reviewerComments)).toBeInTheDocument();
    });
    expect(screen.queryByText("Stryker was here")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Approve" }).length,
    ).toBeGreaterThan(3);
    expect(
      screen.getAllByRole("button", { name: "Reject" }).length,
    ).toBeGreaterThan(3);
  });

  test("renders empty ReviewTable when backend returns null (covers ArrayDeclaration)", async () => {
    useBackend.mockImplementation(() => ({
      data: null,
      error: null,
      status: "success",
    }));
    renderPage();

    expect(screen.queryByText("Stryker was here")).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Approve" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reject" }),
    ).not.toBeInTheDocument();
  });

  test("ReviewTable renders without Approve/Reject buttons when moderatorOptions=false", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ReviewTable
            data={ReviewFixtures.threeReviews}
            moderatorOptions={false}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      screen.queryByRole("button", { name: "Approve" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reject" }),
    ).not.toBeInTheDocument();
  });
});
