// this script is used to populate the `active_influencers` kafka topic with the initial set of influencers
// as per the assignment details, influencer pk are between1,000,000 and 1,999,999 (inclusive)
// so we will loop through all of them and write them to the kafka topic

const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "registry-writer",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();

const INFLUENCER_PK_START = 1000000;
// const INFLUENCER_PK_END = INFLUENCER_PK_START + 5;
const INFLUENCER_PK_END = INFLUENCER_PK_START + 999999;

async function main() {
  try {
    console.log("Connecting to Kafka...");
    await producer.connect();
    console.log("Connected to Kafka");

    for (let i = INFLUENCER_PK_START; i <= INFLUENCER_PK_END; i++) {
      const message = {
        pk: i,
        active: true,
      };

      console.log(`Sending message for influencer ${i}...`);
      await producer.send({
        topic: "active_influencers",
        messages: [
          {
            key: i.toString(),
            value: JSON.stringify(message),
          },
        ],
      });
      console.log(`Message sent for influencer ${i}`);
    }

    console.log("Disconnecting from Kafka...");
    await producer.disconnect();
    console.log("Disconnected from Kafka");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
