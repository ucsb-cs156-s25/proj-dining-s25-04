import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import aliasFixtures from "fixtures/aliasFixtures";
import AliasTable from "main/components/Alias/AliasTable";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

jest.mock("react-toastify", () => {
  const toast = Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  });
  return { toast };
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("AliasTable tests", () => {
  const queryClient = new QueryClient();

  test("approve button shows success toast", async () => {
    const axiosMock = new AxiosMockAdapter(axios);
    axiosMock.onPut("/api/currentUser/updateAliasModeration").reply(200, {
      id: aliasFixtures.oneAlias[0].id,
      approved: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AliasTable alias={aliasFixtures.oneAlias} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const approveCell = await screen.findByTestId(
      "AliasTable-cell-row-0-col-approve",
    );
    fireEvent.click(within(approveCell).getByRole("button"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        `Alias ${aliasFixtures.oneAlias[0].proposedAlias} for id ${aliasFixtures.oneAlias[0].id} approved!`,
      );
    });
  });

  test("reject button shows success toast", async () => {
    const axiosMock = new AxiosMockAdapter(axios);
    axiosMock.onPut("/api/currentUser/updateAliasModeration").reply(200, {
      id: aliasFixtures.oneAlias[0].id,
      approved: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AliasTable alias={aliasFixtures.oneAlias} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const rejectCell = await screen.findByTestId(
      "AliasTable-cell-row-0-col-reject",
    );
    fireEvent.click(within(rejectCell).getByRole("button"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        `Alias ${aliasFixtures.oneAlias[0].proposedAlias} for id ${aliasFixtures.oneAlias[0].id} rejected!`,
      );
    });
  });

  test("approve error toast on failure", async () => {
    const axiosMock = new AxiosMockAdapter(axios);
    axiosMock.onPut("/api/currentUser/updateAliasModeration").networkError();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AliasTable alias={aliasFixtures.oneAlias} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const approveCell = await screen.findByTestId(
      "AliasTable-cell-row-0-col-approve",
    );
    fireEvent.click(within(approveCell).getByRole("button"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Error approving alias: Network Error",
      );
    });
  });

  test("reject error toast on failure", async () => {
    const axiosMock = new AxiosMockAdapter(axios);
    axiosMock.onPut("/api/currentUser/updateAliasModeration").networkError();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AliasTable alias={aliasFixtures.oneAlias} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const rejectCell = await screen.findByTestId(
      "AliasTable-cell-row-0-col-reject",
    );
    fireEvent.click(within(rejectCell).getByRole("button"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Error rejecting alias: Network Error",
      );
    });
  });
});
