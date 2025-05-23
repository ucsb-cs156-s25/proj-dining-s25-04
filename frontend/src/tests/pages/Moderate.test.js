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

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

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

    axiosMock.onGet("/api/currentUser").reply(200, {});
    axiosMock
      .onGet("/api/systemInfo")
      .reply(200, { springH2ConsoleEnabled: false });

    queryClient = new QueryClient();

    jest.spyOn(currentUserModule, "useCurrentUser").mockReturnValue({
      data: {
        root: {
          user: { id: 1, email: "admin@ucsb.edu" },
        },
        loggedIn: true,
        roles: [{ authority: "ROLE_ADMIN" }],
      },
    });

    jest
      .spyOn(currentUserModule, "hasRole")
      .mockImplementation((_u, role) => role === "ROLE_ADMIN");

    useBackend.mockImplementation((key) => {
      if (key[0] === "/api/admin/usersWithProposedAlias") {
        return { data: aliasFixtures.threeAlias, isLoading: false };
      }
      if (key[0] === "/api/reviews/all") {
        return { data: ReviewFixtures.threeReviews, isLoading: false };
      }
      return { data: [], isLoading: false };
    });

    useBackendMutation.mockImplementation((axiosParamsFn, { onSuccess }) => {
      if (axiosParamsFn.toString().includes("approved: true")) {
        return {
          mutate: () => onSuccess({ id: 1, proposedAlias: "Ali1" }),
        };
      } else if (axiosParamsFn.toString().includes("approved: false")) {
        return {
          mutate: () => onSuccess({ id: 1, proposedAlias: "Ali1" }),
        };
      } else {
        return {
          mutate: () => onSuccess({}),
        };
      }
    });
  });

  test("shows success toast when approving alias succeeds", async () => {
    useBackendMutation.mockImplementation((axiosParamsFn, { onSuccess }) => {
      return {
        mutate: () =>
          onSuccess(
            { id: 1 }, // user
            { proposedAlias: "Ali1" }, // proposedAlias
          ),
      };
    });
    renderPage();
    const cell = await screen.findByTestId("AliasTable-cell-row-0-col-approve");
    const button = within(cell).getByRole("button", { name: "Approve" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Alias Ali1 for id 1 approved!",
      );
    });
  });

  test("shows success toast when rejecting alias succeeds", async () => {
    useBackendMutation.mockImplementation((axiosParamsFn, { onSuccess }) => {
      return {
        mutate: () =>
          onSuccess(
            { id: 1 }, // user
            { proposedAlias: "Ali1" }, // proposedAlias
          ),
      };
    });

    renderPage();

    const cell = await screen.findByTestId("AliasTable-cell-row-0-col-reject");
    const button = within(cell).getByRole("button", { name: "Reject" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Alias Ali1 for id 1 rejected!",
      );
    });
  });
});
