import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useBackendMutation } from "main/utils/useBackend";

/**
 * Props:
 * - review: the review object to moderate (must include id, itemsStars, reviewerComments)
 * - show: boolean flag to control visibility
 * - onClose: function to call when modal is closed
 * - status: string, either 'APPROVED' or 'REJECTED'
 */
export default function ReviewModerationModal({
  review,
  show,
  onClose,
  status,
}) {
  const [comments, setComments] = useState("");

  // Build the PUT params for moderation
  const objectToAxiosParams = (review, moderatorComments) => ({
    url: "/api/reviews/moderate",
    method: "PUT",
    params: {
      id: review.id,
      status: status,
      moderatorComments: moderatorComments,
    },
  });

  const mutation = useBackendMutation(
    objectToAxiosParams,
    {
      onSuccess: () => {
        toast(`Review ${status === "APPROVED" ? "approved" : "rejected"}!`);
        onClose();
      },
      onError: (err) => {
        toast.error(`Error: ${err.message}`);
      },
    },
    ["/api/reviews/all"], // refetch reviews after mutation
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(review, comments);
  };

  const handleClose = () => {
    setComments("");
    onClose();
  };

  if (!show) {
    return null;
  }

  return (
    <Modal show={show} onHide={handleClose} data-testid="ReviewModerationModal">
      <Modal.Header closeButton>
        <Modal.Title>
          {status === "APPROVED" ? "Approve Review" : "Reject Review"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <strong>Score:</strong> {review.itemsStars}
        </p>
        <p>
          <strong>Comments:</strong> {review.reviewerComments}
        </p>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="moderatorComments">
            <Form.Label>Moderator Comments</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              required
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant={status === "APPROVED" ? "success" : "danger"}
          onClick={handleSubmit}
          data-testid="ReviewModerationModal-submit"
        >
          {status === "APPROVED" ? "Approve" : "Reject"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
