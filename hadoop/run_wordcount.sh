#!/usr/bin/env bash
set -euo pipefail

# 1) Export Mongo -> NDJSON (dans le conteneur AI)
docker compose exec ai_service python /app/export_answers_to_ndjson.py

# 2) Rapatrier sur l’hôte dans le dossier partagé Hadoop
docker compose cp ai_service:/tmp/answers.ndjson ./hadoop/jars/answers.ndjson

# 3) Charger en HDFS + lancer Hadoop Streaming + récupérer le TSV
docker compose exec quiz-hadoop-master bash -lc '
  hdfs dfs -mkdir -p /data /out &&
  hdfs dfs -put -f /opt/jars/answers.ndjson /data/answers.ndjson &&
  hdfs dfs -rm -r -f /out/word_counts &&
  hadoop jar /usr/local/hadoop/share/hadoop/tools/lib/hadoop-streaming-*.jar \
    -D mapreduce.job.reduces=1 \
    -files /opt/streaming/mapper.py,/opt/streaming/reducer.py \
    -mapper /opt/streaming/mapper.py \
    -reducer /opt/streaming/reducer.py \
    -input /data/answers.ndjson \
    -output /out/word_counts &&
  hdfs dfs -get -f /out/word_counts/part-* /opt/jars/word_counts.tsv
'
echo "✅ Résultat: ./hadoop/jars/word_counts.tsv"
