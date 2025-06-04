# docker exec mockstagram-kafka-1 kafka-console-consumer --bootstrap-server localhost:9092 --topic active_influencers --from-beginning --max-messages 10 | cat

docker exec mockstagram-kafka-1 kafka-run-class kafka.tools.GetOffsetShell --bootstrap-server localhost:9092 --topic influencer_fetch_tasks --time -1 | cat

# docker exec mockstagram-kafka-1 kafka-console-consumer --bootstrap-server localhost:9092 --topic active_influencers --from-beginning --max-messages 6