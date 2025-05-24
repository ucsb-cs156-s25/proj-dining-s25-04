import React, { useState } from "react";
import { useCurrentUser, hasRole } from "main/utils/currentUser";
import { Navigate } from "react-router-dom";
import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import AliasTable from "main/components/Alias/AliasTable";
import ReviewTable from "main/components/Reviews/ReviewTable";
import ReviewModerationModal from "main/components/Reviews/ReviewModerationModal";
import { useBackend } from "main/utils/useBackend";

export default function Moderate() {
  const { data: currentUser } = useCurrentUser();

  //  Alias
  const aliasResponse = useBackend(
    ["/api/admin/usersWithProposedAlias"],
    { method: "GET", url: "/api/admin/usersWithProposedAlias" },
    [],
  );
  const aliasData = aliasResponse?.data ?? [];

  //  Review
  const reviewResponse = useBackend(
    ["/api/reviews/all"],
    { method: "GET", url: "/api/reviews/all" },
    [],
  );
  const reviewData = reviewResponse?.data ?? [];

  const [showModal, setShowModal] = useState(false);
  const [modalReview, setModalReview] = useState(null);
  const [modalStatus, setModalStatus] = useState("APPROVED");

  const openModal = (review, status) => {
    setModalReview(review);
    setModalStatus(status);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setModalReview(null);
  };

  if (!currentUser.loggedIn || !hasRole(currentUser, "ROLE_ADMIN")) {
    return <Navigate to="/" />;
  }

  return (
    <BasicLayout>
      <div className="pt-2">
        <h1>Moderation Page</h1>

        <h3>Alias Proposals</h3>
        <AliasTable alias={aliasData} />

        <h3 className="mt-4">Review Submissions</h3>
        <ReviewTable
          data={reviewData}
          moderatorOptions={true}
          onApprove={(review) => openModal(review, "APPROVED")}
          onReject={(review) => openModal(review, "REJECTED")}
        />

        {/* Moderation Modal */}
        <ReviewModerationModal
          show={showModal}
          review={modalReview}
          status={modalStatus}
          onClose={closeModal}
        />
      </div>
    </BasicLayout>
  );
}
