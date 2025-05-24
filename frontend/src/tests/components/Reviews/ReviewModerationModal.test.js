import React from "react";
import {
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";

import Moderate from "main/pages/Moderate";
import aliasFixtures from "fixtures/aliasFixtures";
import { ReviewFixtures } from "fixtures/reviewFixtures";

// 1) mock backend hooks
jest.mock("main/utils/useBackend");
import { useBackend, useBackendMutation } from "main/utils/useBackend";

// 2) mock toast
jest.mock("react-toastify", () => {
  const t = jest.fn();
  t.error = jest.fn();
  return { toast: t };
});

describe("Moderate Page – Review moderation flow", () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    jest.clearAllMocks();

    // aliasData then reviewData
    useBackend
      .mockReturnValueOnce({ data: aliasFixtures.oneAlias, isLoading: false })
      .mockReturnValueOnce({
        data: ReviewFixtures.threeReviews,
        isLoading: false,
      });

    useBackendMutation.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    });
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

  test("clicking Approve opens modal, submits with comments, and calls mutation + toast", async () => {
    renderPage();

    // 等待 ReviewTable 渲染
    await screen.findByTestId("ReviewTable");

    // 点击第一行的 Approve
    const approveButtons = screen.getAllByRole("button", { name: "Approve" });
    fireEvent.click(approveButtons[0]);

    // Modal 出现
    const modal = await screen.findByTestId("ReviewModerationModal");
    expect(modal).toBeInTheDocument();

    // 填写备注
    fireEvent.change(within(modal).getByLabelText("Moderator Comments"), {
      target: { value: "Looks good to me" },
    });

    // 提交
    fireEvent.click(within(modal).getByTestId("ReviewModerationModal-submit"));

    // mutate 和 toast 调用检查
    const mutateMock = useBackendMutation().mutate;
    expect(mutateMock).toHaveBeenCalledWith(
      ReviewFixtures.threeReviews[0],
      "Looks good to me",
    );
    await waitFor(() => {
      expect(require("react-toastify").toast).toHaveBeenCalledWith(
        "Review approved!",
      );
    });
  });

  // 同理可以写 Reject 的测试...
  test("clicking Reject opens modal with correct title and calls mutation", async () => {
    renderPage();
    await screen.findByTestId("ReviewTable");

    const rejectButtons = screen.getAllByRole("button", { name: "Reject" });
    fireEvent.click(rejectButtons[1]);

    const modal = await screen.findByTestId("ReviewModerationModal");
    expect(modal).toBeInTheDocument();

    // 填写备注
    fireEvent.change(within(modal).getByLabelText("Moderator Comments"), {
      target: { value: "Not good enough" },
    });

    // 提交
    fireEvent.click(within(modal).getByTestId("ReviewModerationModal-submit"));

    // mutate 和 toast 调用检查
    const mutateMock = useBackendMutation().mutate;
    expect(mutateMock).toHaveBeenCalledWith(
      ReviewFixtures.threeReviews[1],
      "Not good enough",
    );
    await waitFor(() => {
      expect(require("react-toastify").toast).toHaveBeenCalledWith(
        "Review rejected!",
      );
    });
  });
});
