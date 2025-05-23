import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import Moderate from "main/pages/Moderate";
import aliasFixtures from "fixtures/aliasFixtures";
import { ReviewFixtures } from "fixtures/reviewFixtures";
import { useBackend, useBackendMutation } from "main/utils/useBackend";
import * as currentUserModule from "main/utils/currentUser";
import { toast } from "react-toastify";

jest.mock("react-toastify", () => {
  const toast = jest.fn();
  toast.success = jest.fn();
  toast.error = jest.fn();
  return { toast };
});

jest.mock("main/utils/useBackend");

describe("ModeratePage tests", () => {
  let queryClient;
  let axiosMock;

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
    axiosMock = new AxiosMockAdapter(axios);
    axiosMock.reset();

    queryClient = new QueryClient();

    jest.spyOn(currentUserModule, "useCurrentUser").mockReturnValue({
      data: {
        root: {
          user: { id: 1, email: "admin@ucsb.edu" },
          loggedIn: true,
          roles: [{ authority: "ROLE_ADMIN" }],
        },
        loggedIn: true,
        roles: [{ authority: "ROLE_ADMIN" }],
      },
    });

    jest
      .spyOn(currentUserModule, "hasRole")
      .mockImplementation((_u, r) => r === "ROLE_ADMIN");

    useBackend.mockImplementation((key) => {
      if (key[0] === "/api/admin/usersWithProposedAlias") {
        return { data: aliasFixtures.threeAlias, isLoading: false };
      }
      if (key[0] === "/api/reviews/all") {
        return { data: ReviewFixtures.threeReviews, isLoading: false };
      }
      return { data: [], isLoading: false };
    });

    useBackendMutation.mockImplementation(
      (_, { onSuccess: _onSuccess, onError }) => ({
        mutate: () => onError(new Error("Request failed with status code 500")),
      }),
    );
  });

  test("renders correctly for admin user", async () => {
    axiosMock.onGet("/api/currentUser").reply(200, {});
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    renderPage();
    await screen.findByRole("heading", { level: 2, name: "Moderation Page" });

    expect(
      screen.getByTestId("AliasTable-header-proposedAlias"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("AliasTable-header-approve")).toBeInTheDocument();
    expect(screen.getByTestId("AliasTable-header-reject")).toBeInTheDocument();
  });

  test("redirects non-admin user to homepage", async () => {
    currentUserModule.useCurrentUser.mockReturnValue({
      data: {
        loggedIn: true,
        roles: [{ authority: "ROLE_USER" }],
      },
    });
    currentUserModule.hasRole.mockReturnValue(false);

    renderPage();

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { level: 2, name: "Moderation Page" }),
      ).not.toBeInTheDocument();
    });
  });

  test("redirects if currentUser is not logged in", async () => {
    currentUserModule.useCurrentUser.mockReturnValue({
      data: {
        loggedIn: false,
        roles: [],
      },
    });
    currentUserModule.hasRole.mockReturnValue(false);

    renderPage();

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { level: 2, name: "Moderation Page" }),
      ).not.toBeInTheDocument();
    });
  });

  test("fetches and displays alias proposals", async () => {
    axiosMock.onGet("/api/currentUser").reply(200, {});
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    renderPage();
    const rows = await screen.findAllByTestId(/AliasTable-row-/);
    expect(rows).toHaveLength(aliasFixtures.threeAlias.length);

    aliasFixtures.threeAlias.forEach((p, idx) => {
      expect(within(rows[idx]).getByText(p.proposedAlias)).toBeInTheDocument();
    });
  });

  test("useBackend called with correct args", () => {
    axiosMock.onGet("/api/currentUser").reply(200, {});
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    renderPage();
    expect(useBackend).toHaveBeenCalledWith(
      ["/api/admin/usersWithProposedAlias"],
      { method: "GET", url: "/api/admin/usersWithProposedAlias" },
      [],
    );
  });

  test("shows error toast when rejecting alias fails", async () => {
    axiosMock.onGet("/api/currentUser").reply(200, {});
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    renderPage();

    const cell = await screen.findByTestId("AliasTable-cell-row-0-col-reject");
    const button = within(cell).getByRole("button", { name: "Reject" });
    fireEvent.click(button);

    expect(toast.error).toHaveBeenCalledWith(
      "Error rejecting alias: Request failed with status code 500",
    );
  });

  test("renders reviews in ReviewTable", async () => {
    renderPage();
    const reviewHeader = await screen.findByTestId("ReviewTable-header-itemId");
    expect(reviewHeader).toBeInTheDocument();

    ReviewFixtures.threeReviews.forEach((r) => {
      expect(screen.getByText(r.reviewerComments)).toBeInTheDocument();
    });
  });

  test("review approve and reject buttons exist", async () => {
    renderPage();

    const approveBtn = await screen.findByTestId(
      "ReviewTable-cell-row-0-col-Approve-button",
    );
    const rejectBtn = await screen.findByTestId(
      "ReviewTable-cell-row-0-col-Reject-button",
    );

    expect(approveBtn).toBeInTheDocument();
    expect(rejectBtn).toBeInTheDocument();
  });
});
