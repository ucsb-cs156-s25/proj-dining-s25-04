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
import aliasFixtures from "fixtures/aliasFixtures"; // threeAlias 数据 :contentReference[oaicite:0]{index=0}
import { ReviewFixtures } from "fixtures/reviewFixtures"; // threeReviews 数据 :contentReference[oaicite:1]{index=1}
import { useBackend, useBackendMutation } from "main/utils/useBackend"; // hook 模拟 :contentReference[oaicite:2]{index=2}
import { toast } from "react-toastify";

jest.mock("main/utils/useBackend");
jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
  },
}));

describe("ModeratePage tests", () => {
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

    // 根据接口路径返回不同的假数据
    useBackend.mockImplementation((key) => {
      if (key[0] === "/api/admin/usersWithProposedAlias") {
        return { data: aliasFixtures.threeAlias, isLoading: false };
      }
      if (key[0] === "/api/reviews/all") {
        return { data: ReviewFixtures.threeReviews, isLoading: false };
      }
      return { data: [], isLoading: false };
    });

    // 所有 mutation 都直接调用 onError 回调，模拟失败场景
    useBackendMutation.mockImplementation((_, { onError }) => ({
      mutate: () => onError(new Error("Request failed with status code 500")),
    }));
  });

  test("renders correctly for admin user", async () => {
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { id: 1, email: "admin@ucsb.edu", admin: true },
      roles: [{ authority: "ROLE_ADMIN" }],
    });
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    renderPage();

    // 等待页面标题出现
    await screen.findByRole("heading", {
      level: 2,
      name: "Moderation Page",
    });

    // Alias 表格列头
    expect(
      screen.getByTestId("AliasTable-header-proposedAlias"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("AliasTable-header-approve")).toBeInTheDocument();
    expect(screen.getByTestId("AliasTable-header-reject")).toBeInTheDocument();

    // Review 表格列头
    expect(
      screen.getByTestId("ReviewTable-header-Approve"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ReviewTable-header-Reject")).toBeInTheDocument();
  });

  test("redirects non-admin user to homepage", async () => {
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { id: 2, email: "user@ucsb.edu", admin: false },
      roles: [{ authority: "ROLE_USER" }],
    });
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    renderPage();
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          level: 2,
          name: "Moderation Page",
        }),
      ).not.toBeInTheDocument();
    });
  });

  test("redirects if currentUser data is missing or not logged in", async () => {
    axiosMock.onGet("/api/currentUser").reply(200, { loggedIn: false });
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    renderPage();
    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          level: 2,
          name: "Moderation Page",
        }),
      ).not.toBeInTheDocument();
    });
  });

  test("fetches and displays alias proposals", async () => {
    const proposals = aliasFixtures.threeAlias;
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { id: 1, email: "admin@ucsb.edu", admin: true },
      roles: [{ authority: "ROLE_ADMIN" }],
    });
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    renderPage();

    const rows = await screen.findAllByTestId(/AliasTable-row-/);
    expect(rows).toHaveLength(proposals.length);
    proposals.forEach((p, idx) => {
      expect(within(rows[idx]).getByText(p.proposedAlias)).toBeInTheDocument();
    });
  });

  test("useBackend called with correct args for alias", () => {
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { id: 1, email: "admin@ucsb.edu", admin: true },
      roles: [{ authority: "ROLE_ADMIN" }],
    });
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

  test("useBackend called with correct args for reviews", () => {
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { id: 1, email: "admin@ucsb.edu", admin: true },
      roles: [{ authority: "ROLE_ADMIN" }],
    });
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    renderPage();

    expect(useBackend).toHaveBeenCalledWith(
      ["/api/reviews/all"],
      { method: "GET", url: "/api/reviews/all" },
      [],
    );
  });

  test("shows error toast when rejecting alias fails", async () => {
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { id: 1, email: "admin@ucsb.edu", admin: true },
      roles: [{ authority: "ROLE_ADMIN" }],
    });
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    renderPage();

    const aliasCell = await screen.findByTestId(
      "AliasTable-cell-row-0-col-reject",
    );
    fireEvent.click(within(aliasCell).getByRole("button", { name: "Reject" }));
    expect(toast.error).toHaveBeenCalledWith(
      "Error rejecting alias: Request failed with status code 500",
    );
  });

  test("shows error toast when rejecting review fails", async () => {
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { id: 1, email: "admin@ucsb.edu", admin: true },
      roles: [{ authority: "ROLE_ADMIN" }],
    });
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    renderPage();

    const reviewCell = await screen.findByTestId(
      "ReviewTable-cell-row-0-col-Reject",
    );
    fireEvent.click(within(reviewCell).getByRole("button", { name: "Reject" }));
    expect(toast.error).toHaveBeenCalledWith(
      "Error: Request failed with status code 500",
    );
  });
});
