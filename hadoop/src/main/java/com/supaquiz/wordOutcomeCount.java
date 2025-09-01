package com.supaquiz;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.*;
import org.apache.hadoop.mapreduce.*;
import org.apache.hadoop.mapreduce.lib.input.FileInputFormat;
import org.apache.hadoop.mapreduce.lib.input.TextInputFormat;
import org.apache.hadoop.mapreduce.lib.output.FileOutputFormat;

import java.io.IOException;
import java.text.Normalizer;
import java.util.HashSet;
import java.util.Set;

public class WordOutcomeCount {

    private static final Set<String> STOPWORDS = new HashSet<String>() {{
        String[] arr = ("a,au,aux,avec,ce,cet,cette,ces,ceci,cela,ça,le,la,les,un,une,des,du,de,d," +
                "et,ou,mais,donc,or,ni,car,que,qui,quoi,où,quand,comment,pour,par,plus,moins," +
                "the,of,and,to,in,for,on,at,by,from,with,as,an,a,or,is,are,was,were,be,been," +
                "this,that,these,those,it,its,if,then,else,than,so,not,no,do,does,did,can,could," +
                "i,you,he,she,we,they,them,his,her,your,yours,our,ours").split(",");
        for (String w : arr) add(w.trim());
    }};

    public static class KeyWritable implements WritableComparable<KeyWritable> {
        public Text word = new Text();
        public Text outcome = new Text(); // "1" correct, "0" incorrect
        public Text theme = new Text();

        public KeyWritable() {}
        public KeyWritable(String w, String o, String t) { word.set(w); outcome.set(o); theme.set(t); }

        @Override public void write(DataOutput out) throws IOException { word.write(out); outcome.write(out); theme.write(out); }
        @Override public void readFields(DataInput in) throws IOException { word.readFields(in); outcome.readFields(in); theme.readFields(in); }
        @Override public int compareTo(KeyWritable o) {
            int c = word.compareTo(o.word); if (c != 0) return c;
            c = theme.compareTo(o.theme);   if (c != 0) return c;
            return outcome.compareTo(o.outcome);
        }
        @Override public String toString() { return word.toString() + "\t" + outcome.toString() + "\t" + theme.toString(); }
        @Override public int hashCode() { return word.hashCode()*31 + theme.hashCode()*13 + outcome.hashCode(); }
        @Override public boolean equals(Object obj) {
            if (!(obj instanceof KeyWritable)) return false;
            KeyWritable o = (KeyWritable)obj;
            return word.equals(o.word) && outcome.equals(o.outcome) && theme.equals(o.theme);
        }
    }

    public static class WordOutcomeMapper extends Mapper<LongWritable, Text, KeyWritable, IntWritable> {
        private static final ObjectMapper MAPPER = new ObjectMapper();
        private static final IntWritable ONE = new IntWritable(1);
        private final KeyWritable outKey = new KeyWritable();

        @Override
        protected void map(LongWritable key, Text value, Context ctx) throws IOException, InterruptedException {
            JsonNode node;
            try { node = MAPPER.readTree(value.toString()); } catch (Exception e) { return; }

            String text = safeLower(node.get("text"));
            if (text.isEmpty()) return;

            String theme = safeLower(node.get("theme"));
            if (theme.isEmpty()) theme = "unknown";

            boolean isCorrect = false;
            JsonNode ic = node.get("is_correct");
            if (ic != null && ic.isBoolean()) isCorrect = ic.booleanValue();
            else {
                JsonNode c2 = node.get("correct");
                if (c2 != null && c2.isTextual()) isCorrect = "1".equals(c2.asText()) || "true".equals(c2.asText());
            }
            String outcome = isCorrect ? "1" : "0";

            String normalized = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
            String[] tokens = normalized.toLowerCase().replaceAll("[^a-zA-Zàâäéèêëîïôöùûüç\\s]", " ").split("\\s+");

            for (String tok : tokens) {
                if (tok.length() < 3) continue;
                if (STOPWORDS.contains(tok)) continue;
                outKey.word.set(tok);
                outKey.outcome.set(outcome);
                outKey.theme.set(theme);
                ctx.write(outKey, ONE);
            }
        }
        private static String safeLower(JsonNode n) { return n == null ? "" : n.asText("").toLowerCase(); }
    }

    public static class WordPartitioner extends Partitioner<KeyWritable, IntWritable> {
        @Override public int getPartition(KeyWritable key, IntWritable value, int numPartitions) {
            return (key.word.hashCode() & Integer.MAX_VALUE) % numPartitions;
        }
    }

    public static class SumReducer extends Reducer<KeyWritable, IntWritable, Text, IntWritable> {
        private final Text out = new Text();
        @Override protected void reduce(KeyWritable key, Iterable<IntWritable> vals, Context ctx) throws IOException, InterruptedException {
            int sum = 0; for (IntWritable v : vals) sum += v.get();
            out.set(key.word.toString() + "\t" + key.outcome.toString() + "\t" + key.theme.toString());
            ctx.write(out, new IntWritable(sum));
        }
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 2) { System.err.println("Usage: WordOutcomeCount <input> <output>"); System.exit(1); }
        Configuration conf = new Configuration();
        Job job = Job.getInstance(conf, "SupaQuiz WordOutcomeCount");
        job.setJarByClass(WordOutcomeCount.class);

        job.setMapperClass(WordOutcomeMapper.class);
        job.setCombinerClass(SumReducer.class);
        job.setPartitionerClass(WordPartitioner.class);
        job.setReducerClass(SumReducer.class);

        job.setMapOutputKeyClass(KeyWritable.class);
        job.setMapOutputValueClass(IntWritable.class);
        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(IntWritable.class);

        job.setInputFormatClass(TextInputFormat.class);
        FileInputFormat.addInputPath(job, new Path(args[0]));
        FileOutputFormat.setOutputPath(job, new Path(args[1]));
        System.exit(job.waitForCompletion(true) ? 0 : 2);
    }
}