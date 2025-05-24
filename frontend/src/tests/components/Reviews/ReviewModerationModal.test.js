import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReviewModerationModal from "main/components/Reviews/ReviewModerationModal";

// mock useBackendMutation
jest.mock("main/utils/useBackend", () => ({ useBackendMutation: jest.fn() }));
import { useBackendMutation } from "main/utils/useBackend";

// mock toast
jest.mock("react-toastify", () => {
  const toast = jest.fn();
  toast.error = jest.fn();
  return { toast };
});

const fakeReview = {
  id: 42,
  itemsStars: 4,
  reviewerComments: "Great place!",
};

describe("ReviewModerationModal", () => {
  let mutateMock;
  let onCloseMock;

  beforeEach(() => {
    jest.clearAllMocks();
    mutateMock = jest.fn();
    useBackendMutation.mockReturnValue({
      mutate: mutateMock,
      isLoading: false,
    });
    onCloseMock = jest.fn();
  });

  test("renders correctly for APPROVED status and shows review details", () => {
    render(
      <ReviewModerationModal
        show={true}
        review={fakeReview}
        status="APPROVED"
        onClose={onCloseMock}
      />,
    );
    expect(screen.getByText("Approve Review")).toBeInTheDocument();
    expect(screen.getByText("Score:")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Comments:")).toBeInTheDocument();
    expect(screen.getByText("Great place!")).toBeInTheDocument();
    expect(screen.getByLabelText("Moderator Comments")).toBeRequired();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });

  test("renders correctly for REJECTED status", () => {
    render(
      <ReviewModerationModal
        show={true}
        review={fakeReview}
        status="REJECTED"
        onClose={onCloseMock}
      />,
    );
    expect(screen.getByText("Reject Review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  test("submits and calls mutate + onClose + toast on success", async () => {
    render(
      <ReviewModerationModal
        show={true}
        review={fakeReview}
        status="APPROVED"
        onClose={onCloseMock}
      />,
    );
    fireEvent.change(screen.getByLabelText("Moderator Comments"), {
      target: { value: "Looks good" },
    });
    fireEvent.click(screen.getByTestId("ReviewModerationModal-submit"));

    expect(mutateMock).toHaveBeenCalledWith(fakeReview, "Looks good");
    await waitFor(() => {
      expect(require("react-toastify").toast).toHaveBeenCalledWith(
        "Review approved!",
      );
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  test("calls onClose when Cancel clicked", () => {
    render(
      <ReviewModerationModal
        show={true}
        review={fakeReview}
        status="REJECTED"
        onClose={onCloseMock}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCloseMock).toHaveBeenCalled();
  });
});
