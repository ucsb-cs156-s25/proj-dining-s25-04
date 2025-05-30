const ReviewFixtures = {
  oneReview: {
    id: 1,
    studentId: 1,
    itemId: 7,
    itemName: "Grilled Cheese Sandwich",
    dateItemServed: "2022-01-02T12:00:00",
    reviewerComments: "Tasty and fresh!",
    itemsStars: 5,
    status: "AWAITING_REVIEW",
    userIdModerator: null,
    moderatorComments: null,
    dateReviewed: "2022-01-01T12:00:00",
    dateCreated: "2022-01-01T12:00:00",
    dateEdited: "2022-01-01T12:00:00",
  },
  threeReviews: [
    {
      id: 1,
      studentId: 1,
      itemId: 7,
      itemName: "Grilled Cheese Sandwich",
      dateItemServed: "2022-01-02T12:00:00",
      reviewerComments: "Delicious!",
      itemsStars: 4,
      status: "APPROVED",
      userIdModerator: 4,
      moderatorComments: "Looks good",
      dateReviewed: "2022-01-01T12:00:00",
      dateCreated: "2022-01-01T12:00:00",
      dateEdited: "2022-01-02T13:00:00",
    },
    {
      id: 2,
      studentId: 2,
      itemId: 8,
      itemName: "Pizza",
      dateItemServed: "2022-02-02T12:00:00",
      reviewerComments: "Too salty.",
      itemsStars: 2,
      status: "REJECTED",
      userIdModerator: 5,
      moderatorComments: "Inappropriate content",
      dateReviewed: "2022-01-01T12:00:00",
      dateCreated: "2022-02-01T12:00:00",
      dateEdited: "2022-02-02T13:00:00",
    },
    {
      id: 3,
      studentId: 3,
      itemId: 9,
      itemName: "Salad",
      dateItemServed: "2022-03-02T12:00:00",
      reviewerComments: "Pretty good overall.",
      itemsStars: 3,
      status: "AWAITING_REVIEW",
      userIdModerator: 6,
      moderatorComments: "Thanks!",
      dateReviewed: "2022-01-01T12:00:00",
      dateCreated: "2022-03-01T12:00:00",
      dateEdited: "2022-03-01T12:00:00",
    },
  ],
};

export { ReviewFixtures };
