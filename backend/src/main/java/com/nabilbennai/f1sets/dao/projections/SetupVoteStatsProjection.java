package com.nabilbennai.f1sets.dao.projections;

public interface SetupVoteStatsProjection {
  Long getSetupId();

  Long getUpvotes();

  Long getDownvotes();

  Long getScore();
}
