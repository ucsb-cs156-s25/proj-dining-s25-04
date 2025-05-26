import React from "react";
import { useCurrentUser, hasRole } from "main/utils/currentUser";
import { Navigate } from "react-router-dom";
import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import AliasTable from "main/components/Alias/AliasTable";
import ReviewTable from "main/components/Reviews/ReviewTable";
import { useBackend, useBackendMutation } from "main/utils/useBackend";
import { toast } from "react-toastify";

export default function Moderate() {
  const { data: currentUser } = useCurrentUser();
  const comments = ""; // Placeholder for comments, can be used in future if needed

  const { data: aliasData } = useBackend(
    ["/api/admin/usersWithProposedAlias"],
    { method: "GET", url: "/api/admin/usersWithProposedAlias" },
    [],
  );

  const { data: reviewData } = useBackend(
    ["/api/reviews/needsmoderation"],
    { method: "GET", url: "/api/reviews/needsmoderation" },
    [],
  );

  const approveReviewMutation = useBackendMutation(
    (review) => ({
      url: "/api/reviews/moderate",
      method: "PUT",
      params: {
        id: review.id,
        status: "APPROVED",
        moderatorComments: comments,
      },
    }),
    {
      onSuccess: () => toast("Review approved!"),
      onError: (err) => toast.error(`Error: ${err.message}`),
    },
  );

  const rejectReviewMutation = useBackendMutation(
    (review) => ({
      url: "/api/reviews/moderate",
      method: "PUT",
      params: {
        id: review.id,
        status: "REJECTED",
        moderatorComments: comments,
      },
    }),
    {
      onSuccess: () => toast("Review rejected!"),
      onError: (err) => toast.error(`Error: ${err.message}`),
    },
  );

  if (!currentUser.loggedIn || !hasRole(currentUser, "ROLE_ADMIN")) {
    return <Navigate to="/" />;
  }

  return (
    <BasicLayout>
      <div className="pt-2">
        <h2>Moderation Page</h2>

        <h3>Alias Proposals</h3>
        <AliasTable alias={aliasData} />

        <h3 className="mt-4">Review Submissions</h3>
        <ReviewTable
          data={reviewData}
          moderatorOptions={true}
          onApprove={approveReviewMutation.mutate}
          onReject={rejectReviewMutation.mutate}
        />
      </div>
    </BasicLayout>
  );
}
