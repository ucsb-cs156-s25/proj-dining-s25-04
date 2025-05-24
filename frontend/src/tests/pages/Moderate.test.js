// src/tests/pages/Moderate.test.js

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import Moderate from "main/pages/Moderate";
import aliasFixtures from "fixtures/aliasFixtures";
import { ReviewFixtures as reviewFixtures } from "fixtures/reviewFixtures";

// Mock BasicLayout to avoid internal hooks
jest.mock("main/layouts/BasicLayout/BasicLayout", () => ({ children }) => (
  <div>{children}</div>
));
// Mock currentUser and role-check
jest.mock("main/utils/currentUser", () => ({
  useCurrentUser: jest.fn(),
  hasRole: jest.fn(),
  useLogout: jest.fn().mockReturnValue({ mutate: jest.fn() }),
}));
import { useCurrentUser, hasRole } from "main/utils/currentUser";

// Mock backend hooks
jest.mock("main/utils/useBackend", () => ({
  useBackend: jest.fn(),
  useBackendMutation: jest.fn(),
}));
import { useBackend, useBackendMutation } from "main/utils/useBackend";

// Mock toast
jest.mock("react-toastify", () => {
  const t = jest.fn();
  t.error = jest.fn();
  return { toast: t };
});

const queryClient = new QueryClient();

beforeEach(() => {
  jest.clearAllMocks();
  // currentUser mock
  useCurrentUser.mockReturnValue({ data: { loggedIn: true } });
  hasRole.mockReturnValue(true);
  // useBackend: first alias, then reviews
  useBackend
    .mockReturnValueOnce({ data: aliasFixtures.oneAlias, isLoading: false })
    .mockReturnValueOnce({
      data: reviewFixtures.threeReviews,
      isLoading: false,
    });
  // mutation mock (not used in this simple test)
  useBackendMutation.mockReturnValue({ mutate: jest.fn(), isLoading: false });
});

function renderPage() {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Moderate />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Moderate Page – Review moderation flow (simplified)", () => {
  test("clicking Approve opens ReviewModerationModal", async () => {
    renderPage();
    // Wait for review table header to appear
    await screen.findByTestId("ReviewTable-header-itemId");
    // Click the first Approve button
    const approveBtn = await screen.findByTestId(
      "ReviewTable-cell-row-0-col-Approve-button",
    );
    fireEvent.click(approveBtn);
    // Modal should open
    expect(await screen.findByText("Approve Review")).toBeInTheDocument();
  });

  test("clicking Reject opens ReviewModerationModal", async () => {
    renderPage();
    await screen.findByTestId("ReviewTable-header-itemId");
    const rejectBtn = await screen.findByTestId(
      "ReviewTable-cell-row-1-col-Reject-button",
    );
    fireEvent.click(rejectBtn);
    expect(await screen.findByText("Reject Review")).toBeInTheDocument();
  });
});
