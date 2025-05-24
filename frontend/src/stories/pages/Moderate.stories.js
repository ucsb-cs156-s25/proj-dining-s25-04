import React from "react";
import { http, HttpResponse } from "msw";
import Moderate from "main/pages/Moderate";
import aliasFixtures from "fixtures/aliasFixtures";
import { ReviewFixtures } from "fixtures/reviewFixtures";
import { apiCurrentUserFixtures } from "fixtures/currentUserFixtures";

export default {
  title: "pages/Moderate",
  component: Moderate,
};

const Template = () => <Moderate />;

export const LoggedOut = Template.bind({});
LoggedOut.parameters = {
  msw: {
    handlers: [
      http.get("/api/currentUser", () =>
        HttpResponse.json(null, { status: 403 })
      ),
    ],
  },
};

export const NoAdminRole = Template.bind({});
NoAdminRole.parameters = {
  msw: {
    handlers: [
      http.get("/api/currentUser", () =>
        HttpResponse.json(apiCurrentUserFixtures.userOnly)
      ),
    ],
  },
};

export const AdminView = Template.bind({});
AdminView.parameters = {
  msw: {
    handlers: [
      http.get("/api/currentUser", () =>
        HttpResponse.json(apiCurrentUserFixtures.adminUser)
      ),
      http.get(
        "/api/admin/usersWithProposedAlias",
        () => HttpResponse.json(aliasFixtures.threeAlias)
      ),
      http.get(
        "/api/reviews/all",
        () => HttpResponse.json(ReviewFixtures.threeReviews)
      ),
    ],
  },
};
