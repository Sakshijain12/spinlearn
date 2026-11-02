import type { LessonDraft } from "./types";

export const deployment: Record<string, LessonDraft> = {
  "quantization": {
    one_line: "Approximate numerical values using a smaller set of representable levels to reduce storage and sometimes computation.",
    steps: {
      concept: { body: "Quantization represents weights or activations with fewer bits, commonly using an integer value plus a scale and sometimes a zero point. Post-training quantization calibrates an existing model; quantization-aware training simulates the effect during optimization. Weight-only and activation quantization have different tradeoffs. Reduced storage does not automatically imply faster inference: hardware support, kernel implementation, and accuracy requirements matter." },
      intuition: { body: "Rounding measurements to a coarser ruler reduces how much information must be stored. If the ruler's range is too wide, small differences disappear; if it is too narrow, outliers are clipped. Per-channel or per-group scales can adapt the ruler to different parts of a tensor." },
      math: {
        body: "Symmetric signed int8 quantization can use levels -127 through 127 with scale s = max absolute value divided by 127. Round and clip x/s to obtain q, then reconstruct approximately as sq. Without clipping, ideal rounding error is at most s/2.",
        formulas: ["q=\\operatorname{clip}\\!\\left(\\operatorname{round}(x/s),-127,127\\right),\\qquad \\widehat x=sq"],
        worked_example: "If the largest magnitude is 1, the scale is 1/127. A value 0.4 becomes integer 51 and reconstructs to about 0.4016. Raw int8 weight storage is one quarter of float32 storage before scales and other overhead.",
      },
      code: {
        language: "python",
        snippet: `weights = [-1.0, -0.3, 0.0, 0.4, 1.0]
maximum = max(abs(x) for x in weights)
if maximum == 0:
    scale, quantized = 1.0, [0] * len(weights)
else:
    scale = maximum / 127
    quantized = [max(-127, min(127, round(x / scale))) for x in weights]
restored = [scale * q for q in quantized]
max_error = max(abs(x - y) for x, y in zip(weights, restored))
print(quantized, round(max_error, 6))`,
        explanation: "This demonstrates per-tensor symmetric quantization and reconstruction, not an accelerated integer matrix kernel. The all-zero tensor case is handled explicitly. Evaluate model quality and actual target-device performance after quantization.",
      },
    },
    quiz: [
      { id: "quant-1", question: "What is needed to interpret an integer weight in scaled quantization?", options: ["The original training label", "Only the tensor filename", "Its quantization scale and any zero point"], correct_index: 2, explanation: "The stored integer must be mapped back to an approximate numeric value using the quantization parameters." },
      { id: "quant-2", question: "Does using fewer bits guarantee lower latency?", options: ["No, hardware and kernel support also matter", "Yes on every device", "Only if accuracy is ignored completely"], correct_index: 0, explanation: "Storage savings can be offset by conversion costs or unsupported kernels." },
      { id: "quant-3", question: "Without clipping, what is the ideal rounding error bound for step size s?", options: ["Exactly s for every value", "At most s/2", "Always zero"], correct_index: 1, explanation: "Rounding to the nearest representable level moves a value by no more than half a step." },
    ],
    terms: {
      Scale: "The step size connecting a quantized integer level to its approximate real value.",
      "Zero point": "An integer offset used by asymmetric quantization to represent real zero.",
      Calibration: "Using representative inputs to choose suitable quantization ranges or parameters.",
      Clipping: "Restricting a value to the supported minimum and maximum levels.",
    },
    used_in: ["Memory-efficient inference", "Edge deployment", "Low-bit model serving"],
    go_deeper: { title: "Transformers documentation: quantization overview", url: "https://huggingface.co/docs/transformers/quantization/overview" },
  },
  "model-compression": {
    one_line: "Reduce the model's resource requirements while measuring how much useful behavior is retained.",
    steps: {
      concept: { body: "Model compression includes pruning, quantization, low-rank factorization, and distillation. Each changes a different aspect of the model or its representation. Pruning removes weights or structures; quantization reduces precision; distillation trains a different student. Compare quality, memory, latency, throughput, and implementation complexity. A smaller file or more zero weights does not automatically yield faster execution." },
      intuition: { body: "Lightening a backpack can mean removing unnecessary items, choosing smaller versions, or replacing several tools with one compact tool. The right method depends on the trip. Likewise, compressing for a phone, a server GPU, and an archival download can require different tradeoffs." },
      math: {
        body: "Magnitude pruning retains weights whose absolute value exceeds a threshold. Sparsity is the fraction of weights set to zero. This counts zeros, not actual speedup; dense storage and dense kernels may still process the entire tensor.",
        formulas: ["w_i'=w_i\\,\\mathbf1[|w_i|\\geq\\tau]", "\\operatorname{sparsity}=1-\\frac{\\#\\{i:w_i'\\neq0\\}}{N}"],
        worked_example: "Threshold 0.1 changes [0.8, 0.02, -0.6, -0.01] to [0.8, 0, -0.6, 0], giving 50% sparsity. With input [1,1,1,1], the dot product changes from 0.21 to 0.20.",
      },
      code: {
        language: "python",
        snippet: `weights = [0.8, 0.02, -0.6, -0.01]
inputs = [1.0, 1.0, 1.0, 1.0]
threshold = 0.1
pruned = [w if abs(w) >= threshold else 0.0 for w in weights]
sparsity = sum(w == 0 for w in pruned) / len(pruned)
before = sum(w*x for w, x in zip(weights, inputs))
after = sum(w*x for w, x in zip(pruned, inputs))
print(pruned, sparsity, round(abs(before - after), 6))`,
        explanation: "This illustrates unstructured magnitude pruning and one output's change. Real compression requires evaluation across representative inputs, often recovery training, and a storage/kernel format able to benefit from the sparsity pattern.",
      },
    },
    quiz: [
      { id: "compress-1", question: "Do zeroed weights in a dense tensor automatically reduce its storage size?", options: ["No", "Yes, every zero disappears from the file", "Only if the file is named sparse"], correct_index: 0, explanation: "Dense representations still store entries; sparse formats need indices and compatible computation." },
      { id: "compress-2", question: "What is the sparsity of [0.8, 0, -0.6, 0]?", options: ["25%", "50%", "100%"], correct_index: 1, explanation: "Two of the four entries are zero." },
      { id: "compress-3", question: "Which evaluation is most useful after compression?", options: ["Only counting removed weights", "Only checking one successful input", "Quality and measured resource usage on the target workload"], correct_index: 2, explanation: "A useful compression must preserve required behavior and improve the resources that actually matter." },
    ],
    terms: {
      Pruning: "Removing or zeroing parameters, channels, or other model structures.",
      Sparsity: "The proportion of values or structures that are absent or zero.",
      "Structured pruning": "Removing organized units such as channels or heads, often easier for dense hardware to exploit.",
    },
    used_in: ["Mobile models", "Storage reduction", "Resource-constrained serving"],
    go_deeper: { title: "Deep Compression", url: "https://arxiv.org/abs/1510.00149" },
  },
  "inference-optimization": {
    one_line: "Measure the serving bottleneck before choosing batching, caching, better kernels, or smaller representations.",
    steps: {
      concept: { body: "Inference optimization improves model serving under a defined workload. Relevant measurements include time to first token, time per output token, end-to-end latency, throughput, and memory use. Techniques include batching, KV caching, optimized attention kernels, quantization, and efficient scheduling. Increasing throughput can worsen queueing latency, so benchmark under realistic concurrency and sequence lengths rather than reporting one favorable number." },
      intuition: { body: "Delivering eight parcels in one trip saves repeated setup, but a parcel may wait while the van fills. Batching has a similar throughput-latency tradeoff. An optimization that accelerates a minor part of the trip cannot transform the total time if loading or waiting remains dominant." },
      math: {
        body: "Throughput is completed requests divided by elapsed time. Amdahl's law bounds total speedup when a fraction f of runtime is accelerated by factor s while the rest stays unchanged. It assumes the same workload and ignores new overhead.",
        formulas: ["\\operatorname{throughput}=\\frac{N}{T}", "\\operatorname{speedup}=\\frac1{(1-f)+f/s}"],
        worked_example: "If 80% of runtime becomes twice as fast, overall speedup is 1/(0.2+0.8/2), about 1.67, not 2. Batching can separately save repeated fixed setup work.",
      },
      code: {
        language: "python",
        snippet: `requests = 8
setup_ms = 2.0
per_request_ms = 1.0
separate_ms = requests * (setup_ms + per_request_ms)
batched_ms = setup_ms + requests * per_request_ms
speedup = separate_ms / batched_ms
amdahl_speedup = 1 / ((1 - 0.8) + 0.8 / 2)
print(separate_ms, batched_ms, speedup)
print(round(amdahl_speedup, 3))`,
        explanation: "These are explicitly synthetic timing assumptions, not benchmark results. Real GPU batching can change both per-request cost and waiting time. Measure latency percentiles and throughput on the intended hardware and workload.",
      },
    },
    quiz: [
      { id: "infer-1", question: "What can happen when batch size is increased?", options: ["Latency must decrease for every request", "Throughput may improve while queueing latency worsens", "Memory use always becomes zero"], correct_index: 1, explanation: "Amortizing work can improve throughput, but requests may wait for a batch and consume more memory." },
      { id: "infer-2", question: "If only 80% of runtime is doubled in speed, what is the approximate total speedup?", options: ["2.0", "5.0", "1.67"], correct_index: 2, explanation: "Amdahl's law gives 1/(0.2+0.4), or approximately 1.67." },
      { id: "infer-3", question: "What should precede choosing an inference optimization?", options: ["Measuring the bottleneck and workload requirements", "Assuming the newest technique is always best", "Ignoring tail latency"], correct_index: 0, explanation: "The best optimization depends on whether compute, memory, communication, or queueing dominates." },
    ],
    terms: {
      Throughput: "The amount of completed work per unit time.",
      "Tail latency": "Latency near the slow end of the distribution, such as a 95th or 99th percentile.",
      Batching: "Processing several requests together to amortize overhead or improve hardware utilization.",
      Bottleneck: "The limiting resource or stage that dominates current performance.",
    },
    used_in: ["LLM serving", "GPU scheduling", "Latency-sensitive applications"],
    go_deeper: { title: "FlashAttention: fast, memory-efficient exact attention", url: "https://arxiv.org/abs/2205.14135" },
  },
  "vector-database": {
    one_line: "Store embeddings with their metadata and retrieve relevant neighbors under the right filters.",
    steps: {
      concept: { body: "Vector databases organize embeddings for similarity retrieval and commonly attach metadata and source identifiers. Exact search checks every candidate; approximate nearest-neighbor indexes trade some recall for speed and scale. The distance function must match how embeddings were trained and normalized. Authorization and metadata filters belong in retrieval, not merely in display after an unauthorized result has been fetched." },
      intuition: { body: "A large library can organize books by location on a topic map rather than by exact keywords. A query is placed on the same map, and nearby books are candidates. A fast approximate map may miss a neighbor, and the closest books are not automatically correct or accessible to every reader." },
      math: {
        body: "For unit-normalized embeddings, cosine similarity is a dot product. Search returns top-k candidates under that score after appropriate filtering. Approximate retrieval recall@k compares how many true exact top-k neighbors appear among the returned results.",
        formulas: ["\\operatorname{score}(q,x)=q^Tx\\quad\\text{for unit-normalized vectors}", "\\operatorname{recall@k}=\\frac{|A_k\\cap E_k|}{k}"],
        worked_example: "If the exact top three IDs are [A, B, C] and an approximate index returns [A, C, D], recall@3 is 2/3. Relevance to the user's task still needs its own evaluation.",
      },
      code: {
        language: "python",
        snippet: `from math import sqrt

def normalize(vector):
    norm = sqrt(sum(x*x for x in vector))
    if norm == 0:
        raise ValueError("Cannot normalize a zero vector")
    return [x / norm for x in vector]

rows = [
    {"id": "guide-a", "kind": "guide", "vector": [1.0, 0.2]},
    {"id": "note-b", "kind": "note", "vector": [1.0, 0.0]},
    {"id": "guide-c", "kind": "guide", "vector": [0.0, 1.0]},
]
query = normalize([1.0, 0.0])
allowed = [row for row in rows if row["kind"] == "guide"]
ranked = sorted(allowed, key=lambda row: sum(
    q*x for q, x in zip(query, normalize(row["vector"]))), reverse=True)
print([row["id"] for row in ranked])`,
        explanation: "This is an exact filtered search in a tiny in-memory list, not a production database. It illustrates metadata filtering and consistent normalization. Large indexes need durability, updates, access control, and measured retrieval recall.",
      },
    },
    quiz: [
      { id: "vector-1", question: "What is a common tradeoff of approximate nearest-neighbor search?", options: ["Always perfect recall and zero memory", "It cannot use embeddings", "Lower latency at the cost of possibly missing some neighbors"], correct_index: 2, explanation: "Approximate indexes avoid exhaustive search, so exact-neighbor recall must be measured." },
      { id: "vector-2", question: "When does dot product equal cosine similarity?", options: ["When both vectors have unit norm", "Whenever the vectors have the same dimension", "Only when they are zero"], correct_index: 0, explanation: "The denominator in cosine similarity becomes one for unit-normalized vectors." },
      { id: "vector-3", question: "What is recall@3 for exact [A,B,C] and approximate [A,C,D]?", options: ["1/3", "2/3", "3/3"], correct_index: 1, explanation: "Two of the three exact neighbors were retrieved." },
    ],
    terms: {
      ANN: "Approximate nearest-neighbor search, which trades some exact-neighbor recall for efficiency.",
      "Metadata filter": "A constraint on non-vector attributes, such as tenant, document type, or date.",
      "Recall@k": "The fraction of the exact top-k neighbors recovered by the returned set.",
    },
    used_in: ["Retrieval-augmented generation", "Recommendation lookup", "Multimodal search"],
    go_deeper: { title: "Billion-scale similarity search with GPUs", url: "https://arxiv.org/abs/1702.08734" },
  },
  "model-drift": {
    one_line: "Watch for changing data and outcomes instead of assuming yesterday's validation result still describes production.",
    steps: {
      concept: { body: "Model drift is a broad term for changing production conditions that may affect performance. Covariate drift changes the input distribution; concept drift changes the relationship between inputs and targets. Data-quality failures can resemble drift but have different causes. Distribution change alone does not prove accuracy has declined, and stable feature histograms do not prove accuracy is stable. Monitor both inputs and labeled outcomes when possible." },
      intuition: { body: "A map can remain perfectly printed while the roads change. A model trained for one mix of customers or language may encounter a different mix later. The response is to diagnose the change, assess its impact, and decide whether to repair a pipeline, collect labels, recalibrate, or retrain." },
      math: {
        body: "For categorical histograms over the same bins, total variation distance is half the sum of absolute probability differences. It ranges from zero to one. Thresholds should account for sample size, natural seasonality, and the cost of false alerts.",
        formulas: ["\\operatorname{TV}(p,q)=\\frac12\\sum_i|p_i-q_i|"],
        worked_example: "A reference distribution [0.8, 0.2] and current distribution [0.5, 0.5] have total variation 0.3. That signals a shift in the measured feature, not a quantified drop in accuracy.",
      },
      code: {
        language: "python",
        snippet: `reference = [0.8, 0.2]
current = [0.5, 0.5]
if len(reference) != len(current):
    raise ValueError("Histograms must use the same bins")
for histogram in (reference, current):
    if any(p < 0 for p in histogram) or abs(sum(histogram) - 1) > 1e-9:
        raise ValueError("Expected a probability histogram")
distance = 0.5 * sum(abs(p-q) for p, q in zip(reference, current))
alert = distance > 0.2
print(round(distance, 3), alert)`,
        explanation: "This demonstrates a simple feature-distribution alert with an illustrative threshold. It does not estimate model accuracy, adjust for statistical uncertainty, or justify automatically retraining without investigation.",
      },
    },
    quiz: [
      { id: "drift-1", question: "Does a changed input distribution prove accuracy dropped?", options: ["No, outcome evaluation is still needed", "Yes, by exactly the drift score", "Only when the model is small"], correct_index: 0, explanation: "Some shifts are harmless, while others matter substantially. Labels or targeted evaluation help assess impact." },
      { id: "drift-2", question: "What is the TV distance between [0.8,0.2] and [0.5,0.5]?", options: ["0.6", "0.3", "1.0"], correct_index: 1, explanation: "Half of |0.8-0.5| + |0.2-0.5| is 0.3." },
      { id: "drift-3", question: "What is a sensible first response to an alert?", options: ["Delete the model immediately", "Ignore all data-quality signals", "Investigate the cause and measure impact"], correct_index: 2, explanation: "Seasonality, pipeline bugs, and genuine task changes require different responses." },
    ],
    terms: {
      "Covariate drift": "A change in the distribution of input features.",
      "Concept drift": "A change in how targets relate to inputs.",
      "Total variation": "A distribution-distance measure based on absolute probability differences.",
      "Reference window": "A baseline period or dataset used for comparison with current observations.",
    },
    used_in: ["Production monitoring", "Retraining decisions", "Data-quality diagnosis"],
    go_deeper: { title: "Google ML Crash Course: monitoring production ML systems", url: "https://developers.google.com/machine-learning/crash-course/production-ml-systems/monitoring" },
  },
};
