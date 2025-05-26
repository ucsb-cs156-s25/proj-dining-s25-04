// src/tests/pages/Moderate.test.js
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";

import Moderate from "main/pages/Moderate";
import aliasFixtures from "fixtures/aliasFixtures";
import { ReviewFixtures } from "fixtures/reviewFixtures";
import { useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";

jest.mock("main/utils/useBackend", () => {
  const actual = jest.requireActual("main/utils/useBackend");
  return {
    ...actual,
    useBackendMutation: jest.fn(),
  };
});

jest.mock("react-toastify", () => {
  const t = jest.fn();
  t.error = jest.fn();
  return { toast: t };
});

describe("ModeratePage tests", () => {
  let axiosMock;
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
    axiosMock = new AxiosMockAdapter(axios);

    // Stub currentUser & systemInfo
    axiosMock.onGet("/api/currentUser").reply(200, {
      user: { id: 1, email: "admin@ucsb.edu", admin: true },
      roles: [{ authority: "ROLE_ADMIN" }],
      loggedIn: true,
    });
    axiosMock.onGet("/api/systemInfo").reply(200, {
      springH2ConsoleEnabled: false,
    });

    // Stub the two data endpoints
    axiosMock
      .onGet("/api/admin/usersWithProposedAlias")
      .reply(200, aliasFixtures.threeAlias);
    axiosMock
      .onGet("/api/reviews/needsmoderation")
      .reply(200, ReviewFixtures.threeReviews);

    // Stub PUT endpoints so that mutate() won't actually hit network
    axiosMock.onPut("/api/admin/usersWithProposedAlias").reply(200, {});
    axiosMock.onPut("/api/reviews/moderate").reply(200, {});

    // Default: all mutations call onError(...)
    useBackendMutation.mockImplementation((_, { onError }) => ({
      mutate: () => onError(new Error("Request failed with status code 500")),
    }));
  });

  test("renders both Alias and Review table headers", async () => {
    renderPage();

    // wait for title
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

  test("displays alias rows", async () => {
    renderPage();
    const rows = await screen.findAllByTestId(/AliasTable-row-/);
    expect(rows).toHaveLength(aliasFixtures.threeAlias.length);
    aliasFixtures.threeAlias.forEach((a, i) => {
      expect(within(rows[i]).getByText(a.proposedAlias)).toBeInTheDocument();
    });
  });

  test("displays review rows", async () => {
    renderPage();
    const rows = await screen.findAllByTestId(/ReviewTable-row-/);
    expect(rows).toHaveLength(ReviewFixtures.threeReviews.length);
    ReviewFixtures.threeReviews.forEach((r, i) => {
      expect(within(rows[i]).getByText(r.reviewerComments)).toBeInTheDocument();
    });
  });

  test("reject alias shows error toast", async () => {
    renderPage();
    const cell = await screen.findByTestId("AliasTable-cell-row-0-col-reject");
    fireEvent.click(within(cell).getByRole("button", { name: "Reject" }));
    expect(toast.error).toHaveBeenCalledWith(
      "Error rejecting alias: Request failed with status code 500",
    );
  });

  test("reject review shows error toast", async () => {
    renderPage();
    const cell = await screen.findByTestId("ReviewTable-cell-row-0-col-Reject");
    fireEvent.click(within(cell).getByRole("button", { name: "Reject" }));
    expect(toast.error).toHaveBeenCalledWith(
      "Error: Request failed with status code 500",
    );
  });

  test("approve review shows error toast", async () => {
    renderPage();
    const cell = await screen.findByTestId(
      "ReviewTable-cell-row-0-col-Approve",
    );
    fireEvent.click(within(cell).getByRole("button", { name: "Approve" }));
    expect(toast.error).toHaveBeenCalledWith(
      "Error: Request failed with status code 500",
    );
  });

  test("approve review success toast", async () => {
    // mutation success case
    useBackendMutation.mockImplementation((_, { onSuccess }) => ({
      mutate: () => onSuccess(),
    }));

    renderPage();
    const cell = await screen.findByTestId(
      "ReviewTable-cell-row-0-col-Approve",
    );
    fireEvent.click(within(cell).getByRole("button", { name: "Approve" }));
    expect(toast).toHaveBeenCalledWith("Review approved!");
  });

  test("reject review success toast", async () => {
    useBackendMutation.mockImplementation((_, { onSuccess }) => ({
      mutate: () => onSuccess(),
    }));

    renderPage();
    const cell = await screen.findByTestId("ReviewTable-cell-row-0-col-Reject");
    fireEvent.click(within(cell).getByRole("button", { name: "Reject" }));
    expect(toast).toHaveBeenCalledWith("Review rejected!");
  });
});
