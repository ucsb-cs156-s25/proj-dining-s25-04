import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import Moderate from "main/pages/Moderate";
import aliasFixtures from "fixtures/aliasFixtures";
import { ReviewFixtures } from "fixtures/reviewFixtures";
import { useBackend, useBackendMutation } from "main/utils/useBackend";

// Mock toast(...) and toast.error(...)
jest.mock("react-toastify", () => {
  const mockToast = jest.fn();
  mockToast.error = jest.fn();
  return { toast: mockToast };
});

jest.mock("main/utils/useBackend");

describe("ModeratePage persistence tests", () => {
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

    // Default: both list APIs return fixtures, all mutations trigger onError
    useBackend.mockImplementation((key) => {
      if (key[0] === "/api/admin/usersWithProposedAlias") {
        return { data: aliasFixtures.threeAlias, isLoading: false };
      }
      if (key[0] === "/api/reviews/all") {
        return { data: ReviewFixtures.threeReviews, isLoading: false };
      }
      return { data: [], isLoading: false };
    });
    useBackendMutation.mockImplementation((_, { onError }) => ({
      mutate: () => onError(new Error("Request failed with status code 500")),
    }));
  });

  const setupAdmin = () => {
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { id: 1, email: "admin@ucsb.edu", admin: true },
      roles: [{ authority: "ROLE_ADMIN" }],
    });
    axiosMock.onGet("/api/systemInfo").reply(200, {
      springH2ConsoleEnabled: false,
    });
  };

  test("renders Alias & Review table headers", async () => {
    setupAdmin();
    renderPage();

    await screen.findByRole("heading", {
      level: 2,
      name: "Moderation Page",
    });

    // Alias headers
    expect(
      screen.getByTestId("AliasTable-header-proposedAlias"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("AliasTable-header-approve")).toBeInTheDocument();
    expect(screen.getByTestId("AliasTable-header-reject")).toBeInTheDocument();

    // Review headers
    expect(
      screen.getByTestId("ReviewTable-header-Approve"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ReviewTable-header-Reject")).toBeInTheDocument();
  });

  test("displays alias rows correctly", async () => {
    setupAdmin();
    renderPage();
    const rows = await screen.findAllByTestId(/AliasTable-row-/);
    expect(rows).toHaveLength(aliasFixtures.threeAlias.length);
    aliasFixtures.threeAlias.forEach((p, idx) => {
      expect(within(rows[idx]).getByText(p.proposedAlias)).toBeInTheDocument();
    });
  });

  test("calls useBackend with correct alias API args", () => {
    setupAdmin();
    renderPage();
    expect(useBackend).toHaveBeenCalledWith(
      ["/api/admin/usersWithProposedAlias"],
      { method: "GET", url: "/api/admin/usersWithProposedAlias" },
      [],
    );
  });

  test("calls useBackend with correct review API args", () => {
    setupAdmin();
    renderPage();
    expect(useBackend).toHaveBeenCalledWith(
      ["/api/reviews/all"],
      { method: "GET", url: "/api/reviews/all" },
      [],
    );
  });

  // -----------------------------
  // Alias onError
  test("shows toast.error when alias reject fails", async () => {
    setupAdmin();
    renderPage();
    const cell = await screen.findByTestId("AliasTable-cell-row-0-col-reject");
    fireEvent.click(within(cell).getByRole("button", { name: "Reject" }));
    expect(require("react-toastify").toast.error).toHaveBeenCalledWith(
      "Error rejecting alias: Request failed with status code 500",
    );
  });

  // Alias onSuccess
  test("shows toast when alias approve succeeds", async () => {
    setupAdmin();
    // Wrap propAlias string into { proposedAlias: ... }
    useBackendMutation.mockImplementation((_, { onSuccess }) => ({
      mutate: (user, propAliasString) =>
        onSuccess(user, { proposedAlias: propAliasString }),
    }));

    renderPage();
    const cell = await screen.findByTestId("AliasTable-cell-row-0-col-approve");
    fireEvent.click(within(cell).getByRole("button", { name: "Approve" }));

    const first = aliasFixtures.threeAlias[0];
    expect(require("react-toastify").toast).toHaveBeenCalledWith(
      `Alias ${first.proposedAlias} for id ${first.id} approved!`,
    );
  });

  // -----------------------------
  // Review onError: Reject
  test("shows toast.error when review reject fails", async () => {
    setupAdmin();
    renderPage();
    const cell = await screen.findByTestId("ReviewTable-cell-row-0-col-Reject");
    fireEvent.click(within(cell).getByRole("button", { name: "Reject" }));
    expect(require("react-toastify").toast.error).toHaveBeenCalledWith(
      "Error: Request failed with status code 500",
    );
  });

  // Review onError: Approve
  test("shows toast.error when review approve fails", async () => {
    setupAdmin();
    renderPage();
    const cell = await screen.findByTestId(
      "ReviewTable-cell-row-0-col-Approve",
    );
    fireEvent.click(within(cell).getByRole("button", { name: "Approve" }));
    expect(require("react-toastify").toast.error).toHaveBeenCalledWith(
      "Error: Request failed with status code 500",
    );
  });

  // Review onSuccess: Approve
  test("shows toast when review approve succeeds", async () => {
    setupAdmin();
    useBackendMutation.mockImplementation((_, { onSuccess }) => ({
      mutate: () => onSuccess(),
    }));

    renderPage();
    const cell = await screen.findByTestId(
      "ReviewTable-cell-row-0-col-Approve",
    );
    fireEvent.click(within(cell).getByRole("button", { name: "Approve" }));
    expect(require("react-toastify").toast).toHaveBeenCalledWith(
      "Review approved!",
    );
  });

  // Review onSuccess: Reject
  test("shows toast when review reject succeeds", async () => {
    setupAdmin();
    useBackendMutation.mockImplementation((_, { onSuccess }) => ({
      mutate: () => onSuccess(),
    }));

    renderPage();
    const cell = await screen.findByTestId("ReviewTable-cell-row-0-col-Reject");
    fireEvent.click(within(cell).getByRole("button", { name: "Reject" }));
    expect(require("react-toastify").toast).toHaveBeenCalledWith(
      "Review rejected!",
    );
  });
});
