import { Kafka, Producer } from "kafkajs";
import { Pool } from "pg";
import { FetcherResult } from "../src/types";

async function runE2ETest() {
  console.log("Starting E2E test...");

  // Initialize Kafka
  const kafka = new Kafka({
    clientId: "e2e-test",
    brokers: ["localhost:9092"],
  });

  const producer = kafka.producer();
  await producer.connect();

  // Initialize database
  const pool = new Pool({
    host: "localhost",
    port: 6432,
    user: "mockstagram",
    password: "mockstagram",
    database: "mockstagram",
  });

  const testPk = 451000005;
  const initialFollowerCount = 4000;
  const updatedFollowerCount = 5000;

  const initialTimestamp = new Date();
  initialTimestamp.setSeconds(0, 0);

  const updatedTimestamp = new Date();
  updatedTimestamp.setSeconds(0, 0);
  updatedTimestamp.setMinutes(initialTimestamp.getMinutes() + 1);

  try {
    // First, create initial test data in the database
    console.log("Creating initial test data in database...");

    // Insert into influencer_summary
    await pool.query(
      `
      INSERT INTO influencer_summary (
        pk,
        username,
        current_follower_count,
        total_follower_sum,
        readings_count,
        last_updated
      ) VALUES ($1, $2, $3, $3, 1, $4)
      ON CONFLICT (pk) DO UPDATE SET
        username = EXCLUDED.username,
        current_follower_count = EXCLUDED.current_follower_count,
        total_follower_sum = influencer_summary.total_follower_sum + EXCLUDED.current_follower_count,
        readings_count = influencer_summary.readings_count + 1,
        last_updated = EXCLUDED.last_updated
        `,
      [testPk, "e2e_test_user", initialFollowerCount, initialTimestamp]
    );

    // Insert into follower_timeline
    await pool.query(
      `INSERT INTO follower_timeline (pk, follower_count, timestamp)
       VALUES ($1, $2, $3)`,
      [testPk, initialFollowerCount, initialTimestamp]
    );

    // Verify initial state
    console.log("Verifying initial database state...");
    const initialSummary = await pool.query(
      "SELECT * FROM influencer_summary WHERE pk = $1",
      [testPk]
    );
    const initialTimeline = await pool.query(
      "SELECT * FROM follower_timeline WHERE pk = $1",
      [testPk]
    );

    console.log("Initial Influencer Summary:", initialSummary.rows[0]);
    console.log("Initial Follower Timeline:", initialTimeline.rows[0]);

    // Now send update message to Kafka
    console.log("Sending update message to Kafka...");
    const testData: FetcherResult = {
      pk: testPk,
      username: "e2e_test_user",
      followerCount: updatedFollowerCount,
      fetchTimestamp: updatedTimestamp,
    };

    await producer.send({
      topic: "fetcher_results",
      messages: [
        {
          key: String(testData.pk),
          value: JSON.stringify(testData),
        },
      ],
    });

    console.log("Waiting for message to be processed...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Verify final state
    console.log("Verifying final database state...");
    const finalSummary = await pool.query(
      "SELECT * FROM influencer_summary WHERE pk = $1",
      [testPk]
    );
    const finalTimeline = await pool.query(
      "SELECT * FROM follower_timeline WHERE pk = $1 ORDER BY timestamp DESC LIMIT 1",
      [testPk]
    );

    console.log("Final Influencer Summary:", finalSummary.rows[0]);
    console.log("Final Follower Timeline:", finalTimeline.rows[0]);

    // Verify results
    const summaryUpdated =
      finalSummary.rows[0]?.current_follower_count == updatedFollowerCount;
    const timelineUpdated =
      finalTimeline.rows[0]?.follower_count == updatedFollowerCount;

    //   check total_follower_sum
    const totalFollowerSum =
      finalSummary.rows[0]?.total_follower_sum ==
      initialFollowerCount + updatedFollowerCount;
    //  read count should be 2
    const readingsCount = finalSummary.rows[0]?.readings_count;

    if (
      summaryUpdated &&
      timelineUpdated &&
      totalFollowerSum &&
      readingsCount == 2
    ) {
      console.log("E2E Test Passed: Data was updated correctly");
      console.log(
        `Follower count updated from ${initialFollowerCount} to ${updatedFollowerCount}`
      );
    } else {
      console.error("E2E Test Failed: Data was not updated correctly");
      console.error("Expected follower count:", updatedFollowerCount);
      console.error(
        "Actual summary follower count:",
        finalSummary.rows[0]?.current_follower_count
      );
      console.error(
        "Expected total follower sum:",
        initialFollowerCount + updatedFollowerCount
      );
      console.error(
        "Actual total follower sum:",
        finalSummary.rows[0]?.total_follower_sum
      );
      console.error("Expected readings count:", 2);
      console.error("Actual readings count:", readingsCount);
    }
  } catch (error) {
    console.error("❌ E2E Test Failed:", error);
  } finally {
    // Cleanup
    // delete the test data from the database
    await pool.query("DELETE FROM influencer_summary WHERE pk = $1", [testPk]);
    await pool.query("DELETE FROM follower_timeline WHERE pk = $1", [testPk]);

    await producer.disconnect();
    await pool.end();
  }
}

// Run the test
runE2ETest().catch(console.error);
