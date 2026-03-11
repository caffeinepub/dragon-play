import Map "mo:core/Map";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

actor {
  type ScoreData = {
    bestScore : Nat;
    interactions : Nat;
  };

  module ScoreData {
    public func compare(a : ScoreData, b : ScoreData) : Order.Order {
      Nat.compare(b.bestScore, a.bestScore);
    };
  };

  let scores = Map.empty<Principal, ScoreData>();

  public shared ({ caller }) func recordInteraction(newScore : Nat) : async () {
    switch (scores.get(caller)) {
      case (null) {
        scores.add(caller, { bestScore = newScore; interactions = 1 });
      };
      case (?data) {
        let bestScore = if (newScore > data.bestScore) { newScore } else {
          data.bestScore;
        };
        scores.add(caller, { bestScore; interactions = data.interactions + 1 });
      };
    };
  };

  public query ({ caller }) func getScore() : async ScoreData {
    switch (scores.get(caller)) {
      case (null) {
        Runtime.trap("No score data found for this session");
      };
      case (?data) { data };
    };
  };

  public query func getLeaderboard() : async [ScoreData] {
    scores.values().toArray().sort();
  };
};
