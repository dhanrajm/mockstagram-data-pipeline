const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "topic-creator",
  brokers: ["localhost:9092"],
});

async function main() {
  try {
    console.log("Connecting to Kafka...");
    const admin = kafka.admin();
    await admin.connect();
    console.log("Connected to Kafka");

    const topics = [
      {
        topic: "active_influencers",
        numPartitions: 1,
        replicationFactor: 1
      },
      {
        topic: "influencer_fetch_tasks",
        numPartitions: 1,
        replicationFactor: 1
      }
    ];

    console.log("Creating topics...");
    await admin.createTopics({
      topics,
      timeout: 5000
    });
    console.log("Topics created successfully");

    await admin.disconnect();
    console.log("Disconnected from Kafka");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main().catch(console.error); 