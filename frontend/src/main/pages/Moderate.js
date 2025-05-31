import React from "react";
import { Navigate } from "react-router";
import BasicLayout from "main/layouts/BasicLayout/BasicLayout";
import AliasTable from "main/components/Alias/AliasTable";
import ReviewTable from "main/components/Reviews/ReviewTable";
import { useCurrentUser, hasRole } from "main/utils/currentUser";
import { useBackend } from "main/utils/useBackend";
import axios from "axios";
import { toast } from "react-toastify";

export default function Moderate() {
  const { data: currentUser } = useCurrentUser();

  // 1) fetch aliases
  const { data: aliases } = useBackend(["/api/admin/usersWithProposedAlias"], {
    method: "GET",
    url: "/api/admin/usersWithProposedAlias",
  });

  // 2) fetch reviews
  const { data: reviews } = useBackend(["/api/reviews/needsmoderation"], {
    method: "GET",
    url: "/api/reviews/needsmoderation",
  });

  // permission guard
  if (
    !currentUser.loggedIn ||
    (!hasRole(currentUser, "ROLE_ADMIN") &&
      !hasRole(currentUser, "ROLE_MODERATOR"))
  ) {
    return <Navigate to="/" />;
  }

  // 3) alias handlers
  const handleApproveAlias = async (a) => {
    try {
      await axios.put("/api/currentUser/updateAliasModeration", null, {
        params: { id: a.id, approved: true },
      });
      toast.success(`Alias "${a.proposedAlias}" for ID ${a.id} approved!`);
    } catch (err) {
      toast.error(`Error approving alias: ${err.message || "Unknown error"}`);
    }
  };
  const handleRejectAlias = async (a) => {
    try {
      await axios.put("/api/currentUser/updateAliasModeration", null, {
        params: { id: a.id, approved: false },
      });
      toast.success(`Alias "${a.proposedAlias}" for ID ${a.id} rejected!`);
    } catch (err) {
      toast.error(`Error rejecting alias: ${err.message || "Unknown error"}`);
    }
  };

  return (
    <BasicLayout id="moderate-page">
      <h1>Moderation Page</h1>
      <p>
        This page is accessible only to admins and moderators. (Placeholder)
      </p>
      <AliasTable
        aliases={aliases || []}
        onApprove={handleApproveAlias}
        onReject={handleRejectAlias}
      />
      <ReviewTable data={reviews || []} moderatorOptions={true} />
    </BasicLayout>
  );
}
