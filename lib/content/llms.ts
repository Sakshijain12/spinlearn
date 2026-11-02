import type { LessonDraft } from "./types";

export const llms: Record<string, LessonDraft> = {
  "kv-cache": {
    one_line: "Save each token's keys and values the first time you compute them, so every new token only does work for itself.",
    steps: {
      concept: { body: "A causal language model generates one token at a time. At each layer, the newest token attends to keys and values for its available prefix. Earlier tokens' representations do not depend on later tokens, so their keys and values can be reused. A KV cache stores these tensors instead of recomputing them at every step. This trades extra memory for less repeated computation; it does not eliminate the cost of attending to a growing context.", embed: "none" },
      intuition: { body: "Think of the cache as a growing ledger. A new token adds its key and value, then reads earlier rows using its current query. Previously written rows stay unchanged. Queries are not needed after their token's output has been computed. Step through the illustration to see new rows being added and old rows reused.", embed: "kv_cache_stepper" },
      math: {
        body: "The current query attends over all cached keys and values. Cache memory grows linearly with sequence length and batch size. In the memory formula, L is layers, H_KV is KV heads, d_h is head dimension, S is sequence length, N is batch size, and b is bytes per value. The factor two counts both keys and values.",
        formulas: ["o_t = \\operatorname{softmax}\\!\\left(\\frac{q_t K_{1:t}^{\\mathsf T}}{\\sqrt{d_k}}\\right)V_{1:t}", "\\mathrm{bytes} = 2 L H_{\\mathrm{KV}} d_h S N b"],
        worked_example: "32 layers, 8 KV heads, head dimension 128, and fp16 require 2*32*8*128*2 = 131,072 bytes per token: 128 KiB. At 4,096 tokens and batch size one, that is 512 MiB.",
      },
      code: {
        language: "python",
        snippet: `from math import exp, sqrt

def decode_cached(tokens):
    keys, values, outputs = [], [], []
    for token in tokens:
        query = list(token)
        keys.append(list(token))
        values.append(list(token))
        scores = [sum(a*b for a, b in zip(query, key)) / sqrt(len(query))
                  for key in keys]
        weights = [exp(s - max(scores)) for s in scores]
        weights = [w / sum(weights) for w in weights]
        outputs.append([sum(w*v[j] for w, v in zip(weights, values))
                        for j in range(len(query))])
    return outputs

outputs = decode_cached([[1.0, 0.0], [0.0, 1.0]])
print(outputs)`,
        explanation: "This causal single-head example uses identity Q/K/V projections to keep the arithmetic visible. Each token's key and value are appended once. Real models use learned projections and one cache per layer; the downloadable NumPy example shows those projections.",
      },
    },
    quiz: [
      { id: "q1", question: "Why can past keys and values be reused at later steps?", options: ["Causal masking means earlier tokens never depend on later ones, so their K and V never change", "Keys and values are normalized, so they stay the same across steps", "The cache stores an approximation that is close enough in practice"], correct_index: 0, explanation: "Causal attention means a token's hidden state, and therefore its k and v, depends only on itself and earlier tokens." },
      { id: "q2", question: "Why don't we cache queries?", options: ["Queries are too large to store", "Each past query was used only once, at its own step; only the newest token's query is needed", "Queries change every step, so caching them would be wrong"], correct_index: 1, explanation: "Only the current token asks the question. Old queries have nothing left to do." },
      { id: "q3", question: "With 32 layers, 8 KV heads, head_dim 128, fp16, what is the KV cache size per token?", options: ["64 KiB", "128 KiB", "512 KiB", "1 MiB"], correct_index: 1, explanation: "2 * 32 * 8 * 128 * 2 bytes = 131,072 bytes = 128 KiB." },
    ],
    terms: {
      Prefill: "The first pass over a prompt, computing and storing its keys and values before token-by-token decoding.",
      Decode: "Generating a new token using the available prefix and then extending the cache.",
      GQA: "Grouped-query attention shares a smaller number of key/value heads among multiple query heads, reducing cache memory.",
      PagedAttention: "Managing KV-cache memory in blocks to reduce wasted space while serving variable-length sequences.",
      "Prefix caching": "Reusing an existing KV cache for a shared prompt prefix when the model, token sequence, and relevant settings match.",
    },
    used_in: ["Inference servers", "Streaming chat replies", "Long-context models"],
    go_deeper: { title: "PagedAttention paper (2023)", url: "https://arxiv.org/abs/2309.06180" },
  },
  "self-attention": {
    one_line: "Each token blends information from other tokens, using learned relevance scores to build a context-aware representation.",
    steps: {
      concept: { body: "A token's meaning depends on its context. Self-attention lets each token gather information from the same sequence. Learned projections turn every token into a query, a key, and a value. Query-key similarities decide how strongly to mix the values. In a causal language model, a mask prevents a token from attending to future positions.", embed: "none" },
      intuition: { body: "Think of a query as a question, a key as a label, and a value as the information behind that label. Each token compares its question with the available labels, then takes a weighted blend of their information. Choose a token below to explore an illustrative attention pattern. The weights are teaching examples, not measurements from a trained model.", embed: "attention_fan" },
      math: {
        body: "Multiply queries by transposed keys to get relevance scores. Divide by the square root of the key dimension to control their scale, then apply softmax along each row. Every resulting row sums to one. Multiplying those weights by V blends the value vectors.",
        formulas: ["\\operatorname{Attention}(Q,K,V)=\\operatorname{softmax}\\!\\left(\\frac{QK^{\\mathsf T}}{\\sqrt{d_k}}\\right)V"],
        worked_example: "If one query assigns weights 0.6, 0.3, and 0.1 to three tokens, its output is 0.6v1 + 0.3v2 + 0.1v3. The output contains information from all three, with the first contributing most.",
      },
      code: {
        language: "python",
        snippet: `from math import exp, sqrt

def attend(query, keys, values):
    scores = [sum(q*k for q, k in zip(query, key)) / sqrt(len(query))
              for key in keys]
    weights = [exp(s - max(scores)) for s in scores]
    weights = [w / sum(weights) for w in weights]
    output = [sum(w*v[j] for w, v in zip(weights, values))
              for j in range(len(values[0]))]
    return weights, output

weights, output = attend([1.0, 0.0], [[1.0, 0.0], [0.0, 1.0]],
                         [[10.0, 0.0], [0.0, 20.0]])
print(weights, output)`,
        explanation: "This computes one unmasked query's attention over two keys and values. It subtracts the maximum for stable softmax. Causal attention restricts which keys are visible before this normalization.",
      },
    },
    quiz: [
      { id: "attention-q1", question: "Why divide the query-key dot products by the square root of the key dimension?", options: ["To control score scale and avoid saturating softmax", "To make every value vector unit length", "To remove the need for a causal mask"], correct_index: 0, explanation: "Dot-product variance grows with the key dimension. Scaling helps keep softmax from becoming excessively sharp." },
      { id: "attention-q2", question: "Which vectors are blended to produce the attention output?", options: ["Queries", "Values", "Position indices"], correct_index: 1, explanation: "Query-key comparisons determine the weights. Those weights are used to blend the value vectors." },
      { id: "attention-q3", question: "What does a causal attention mask prevent?", options: ["Attending to earlier tokens", "Attending to future tokens", "Using more than one attention head"], correct_index: 1, explanation: "A causal mask prevents information from later positions from leaking into a token's representation." },
    ],
    terms: {
      Query: "A learned projection describing the information a token is looking for.",
      Key: "A learned projection compared with queries to determine attention weights.",
      Value: "A learned projection containing the information that attention blends into its output.",
      Softmax: "A function that turns scores into positive weights whose sum is one.",
      "Multi-head": "Parallel attention heads with different projections whose outputs are combined.",
    },
    used_in: ["Language models", "Vision transformers", "Speech models"],
    go_deeper: { title: "Attention is all you need (2017)", url: "https://arxiv.org/abs/1706.03762" },
  },
  "transformer-architecture": {
    one_line: "Alternate communication between tokens with per-token transformations, while preserving information through residual paths.",
    steps: {
      concept: { body: "Transformers stack attention and feed-forward blocks, usually with normalization and residual connections. Attention exchanges information between positions; the feed-forward network transforms features at each position. Encoder models can use bidirectional context, while autoregressive decoders mask future tokens. Position information is supplied separately. Parallel training over known tokens does not mean an autoregressive decoder generates all unknown tokens simultaneously." },
      intuition: { body: "Picture a group alternating between discussion and private reflection. Attention is the discussion: each participant collects useful information from others. The feed-forward block is private processing of that information. Residual paths keep previous notes available, and normalization keeps intermediate scales manageable. Repeating these rounds builds increasingly useful representations." },
      math: {
        body: "A common pre-normalized block first adds attention of a normalized input, then adds a feed-forward transformation of the normalized intermediate. The equations show one modern variant; the original Transformer used a different normalization order.",
        formulas: ["H=X+\\operatorname{Attention}(\\operatorname{LN}(X))", "Y=H+\\operatorname{FFN}(\\operatorname{LN}(H))"],
        worked_example: "For one feature vector x = [1, 3], normalization gives approximately [-1, 1]. If the feed-forward branch is ReLU, adding that branch to x gives approximately [1, 4]. Attention is a separate sublayer.",
      },
      code: {
        language: "python",
        snippet: `from math import sqrt

def layer_norm(vector):
    mean = sum(vector) / len(vector)
    variance = sum((x - mean) ** 2 for x in vector) / len(vector)
    return [(x - mean) / sqrt(variance + 1e-5) for x in vector]

hidden = [1.0, 3.0]
normalized = layer_norm(hidden)
feed_forward = [max(0.0, x) for x in normalized]
output = [h + f for h, f in zip(hidden, feed_forward)]
print(output)`,
        explanation: "This isolates the pre-normalized feed-forward residual sublayer. ReLU stands in for a learned multilayer feed-forward network; this is not a full Transformer or a trained language model. The attention sublayer is taught separately.",
      },
    },
    quiz: [
      { id: "tr-1", question: "Which block directly mixes information between token positions?", options: ["A per-token bias", "Only the output vocabulary table", "Attention"], correct_index: 2, explanation: "Attention weights and combines information from other visible positions." },
      { id: "tr-2", question: "Why does an autoregressive decoder use a causal mask during training?", options: ["To prevent access to future target tokens", "To remove all position information", "To force every attention weight to zero"], correct_index: 0, explanation: "Training should respect the same information boundary as next-token generation." },
      { id: "tr-3", question: "Does parallel processing of training tokens imply all new output tokens can be generated at once?", options: ["Yes, without any assumptions", "No, autoregressive outputs depend on earlier generated tokens", "Only if softmax is removed"], correct_index: 1, explanation: "During teacher-forced training the target prefix is known; during generation it must be produced sequentially." },
    ],
    terms: {
      "Feed-forward network": "A per-position nonlinear transformation, usually expanding and then projecting features.",
      "Layer normalization": "Normalizing features within an example or token, rather than across the training batch.",
      "Causal mask": "A restriction preventing a position from attending to future positions.",
      "Residual path": "An additive route that preserves earlier representations alongside a learned transformation.",
    },
    used_in: ["Language generation", "Text encoders", "Vision-language systems"],
    go_deeper: { title: "Attention is all you need: the Transformer architecture", url: "https://arxiv.org/abs/1706.03762" },
  },
  "attention-heads": {
    one_line: "Different learned projections let multiple heads attend to different aspects of the same sequence.",
    steps: {
      concept: { body: "Multi-head attention runs several attention operations with separate query, key, and value projections. Their outputs are concatenated and projected back into the model's feature space. Heads can specialize in different relationships, but no particular linguistic role is guaranteed. Splitting a fixed model dimension across more heads changes their capacity per head rather than creating free compute." },
      intuition: { body: "A group of readers can study the same sentence with different questions in mind. One may emphasize a nearby noun, another a distant reference. Combining their notes is more expressive than forcing every relationship through one weighting pattern. The model learns these perspectives; they are not manually assigned job titles." },
      math: {
        body: "Each head applies attention after learned projections. Concatenation joins the head outputs along the feature dimension. A learned output matrix W_O mixes the resulting features. In a common configuration, each head's dimension is d_model divided by the number of heads.",
        formulas: ["h_i=\\operatorname{Attention}(QW_i^Q,KW_i^K,VW_i^V)", "\\operatorname{MHA}(Q,K,V)=\\operatorname{Concat}(h_1,\\ldots,h_h)W^O"],
        worked_example: "Eight heads in a model of width 512 commonly use 64 features per head. Concatenation produces width 512 again before the output projection.",
      },
      code: {
        language: "python",
        snippet: `from math import exp

values = [10.0, 20.0]
head_scores = [[2.0, 0.0], [0.0, 2.0]]
head_outputs = []
for scores in head_scores:
    weights = [exp(s - max(scores)) for s in scores]
    weights = [w / sum(weights) for w in weights]
    head_outputs.append(sum(w*v for w, v in zip(weights, values)))

combined = sum(head_outputs) / len(head_outputs)
print(head_outputs, combined)`,
        explanation: "The two score patterns stand in for different learned Q/K projections. Each head produces a different mixture of the same values. Averaging illustrates a simple output projection; real multi-head layers learn that projection.",
      },
    },
    quiz: [
      { id: "heads-1", question: "What distinguishes attention heads in a standard multi-head layer?", options: ["Separate learned projections", "Different training datasets are required", "Each has a fixed human-assigned grammatical role"], correct_index: 0, explanation: "Separate projections let heads learn different score patterns and value representations." },
      { id: "heads-2", question: "With model width 512 and 8 equal heads, what is each head's usual width?", options: ["4096", "64", "8"], correct_index: 1, explanation: "Dividing the 512 features among 8 equal heads gives 64 per head; concatenating all heads restores width 512." },
      { id: "heads-3", question: "What typically happens after concatenating head outputs?", options: ["The sequence is discarded", "All heads are converted to labels", "A learned output projection mixes them"], correct_index: 2, explanation: "W_O combines the concatenated features into the model representation." },
    ],
    terms: {
      Head: "One attention computation with its own projected feature spaces.",
      Concatenation: "Joining tensors along a chosen dimension while preserving their values.",
      "Output projection": "A learned linear map that combines the features returned by attention heads.",
    },
    used_in: ["Transformer attention", "Cross-attention", "Multimodal fusion"],
    go_deeper: { title: "Attention is all you need: multi-head attention", url: "https://arxiv.org/abs/1706.03762" },
  },
  "positional-encoding": {
    one_line: "Supply order information so attention can distinguish the same tokens in different arrangements.",
    steps: {
      concept: { body: "Attention over token content alone does not inherently know the sequence order. Positional methods provide that missing signal. Learned absolute embeddings assign a vector to each position; sinusoidal encodings use fixed frequencies. Rotary embeddings rotate query/key features so their dot products depend on relative positions. A method that defines positions beyond the training range does not automatically guarantee good long-context generalization." },
      intuition: { body: "The words 'dog bites person' and 'person bites dog' contain the same vocabulary but convey different relationships. Position signals are like timestamps attached to those words. Different frequencies in a sinusoidal encoding provide clocks that tick at several scales, letting positions have distinct patterns." },
      math: {
        body: "For an even feature width d, alternate sine and cosine at frequency scales determined by the feature pair index i. These fixed vectors can be added to token embeddings. This formula describes the original sinusoidal scheme, not rotary embeddings.",
        formulas: ["PE_{p,2i}=\\sin\\!\\left(\\frac{p}{10000^{2i/d}}\\right),\\qquad PE_{p,2i+1}=\\cos\\!\\left(\\frac{p}{10000^{2i/d}}\\right)"],
        worked_example: "At position 0 with width 4, the encoding is [0, 1, 0, 1]. At position 1 it is approximately [0.841, 0.540, 0.010, 1.000].",
      },
      code: {
        language: "python",
        snippet: `from math import sin, cos

def positional_encoding(position, width):
    if width <= 0 or width % 2:
        raise ValueError("Use a positive even width")
    result = []
    for index in range(0, width, 2):
        angle = position / (10000 ** (index / width))
        result.extend([sin(angle), cos(angle)])
    return result

encoding = positional_encoding(1, 4)
print([round(x, 3) for x in encoding])`,
        explanation: "This produces a fixed sinusoidal vector with no learned parameters. It demonstrates position features; a model still needs training to make useful use of them.",
      },
    },
    quiz: [
      { id: "pos-1", question: "Why add position information to content-only attention?", options: ["To eliminate all token embeddings", "To distinguish sequence order", "To make the vocabulary smaller"], correct_index: 1, explanation: "Token content alone does not specify which occurrence comes first or how far apart positions are." },
      { id: "pos-2", question: "What is the width-4 sinusoidal encoding at position zero?", options: ["[1, 1, 1, 1]", "[0, 0, 0, 0]", "[0, 1, 0, 1]"], correct_index: 2, explanation: "sin(0) is zero and cos(0) is one for every frequency." },
      { id: "pos-3", question: "Does a formula supporting larger position indices guarantee good extrapolation?", options: ["No, model behavior still depends on training and architecture", "Yes, for every context length", "Only if all positions receive the same vector"], correct_index: 0, explanation: "Representing an unseen position is different from learning to reason reliably over a much longer context." },
    ],
    terms: {
      "Absolute position": "A position index measured from a sequence's start.",
      "Relative position": "The offset or distance between two sequence positions.",
      RoPE: "Rotary position embeddings, which rotate query/key features to encode relative positional relationships.",
    },
    used_in: ["Sequence modeling", "Long-context inference", "Vision transformers"],
    go_deeper: { title: "Attention is all you need: positional encoding", url: "https://arxiv.org/abs/1706.03762" },
  },
  "embeddings": {
    one_line: "Map an item to a vector whose geometry is useful for the task the model was trained to solve.",
    steps: {
      concept: { body: "An embedding represents a word, document, image, or other item as a vector. Token embeddings can be looked up by ID; sentence or image embeddings are usually produced by an encoder. Training determines which relationships the vector space preserves. Similarity scores are meaningful only within compatible spaces, so vectors from unrelated models should not be compared directly." },
      intuition: { body: "Think of placing items on a map where relevant neighbors tend to be close. The map is learned from a task, not a universal definition of meaning. A shopping-search map may emphasize product function, while a sentiment model may emphasize emotional tone. Proximity suggests a learned relationship, not factual equivalence." },
      math: {
        body: "Cosine similarity divides the dot product by both vector norms, measuring directional alignment. It is undefined for a zero vector. For unit-normalized embeddings, cosine similarity equals the dot product. Some systems intentionally use other distances.",
        formulas: ["\\operatorname{cos}(u,v)=\\frac{u^Tv}{\\lVert u\\rVert_2\\lVert v\\rVert_2}"],
        worked_example: "Vectors [1, 0] and [0, 1] have cosine similarity 0. Vectors [1, 0] and [2, 0] have similarity 1 despite having different lengths.",
      },
      code: {
        language: "python",
        snippet: `from math import sqrt

def cosine(a, b):
    denominator = sqrt(sum(x*x for x in a) * sum(y*y for y in b))
    if denominator == 0:
        raise ValueError("Cosine requires nonzero vectors")
    return sum(x*y for x, y in zip(a, b)) / denominator

query = [1.0, 0.2]
candidates = {"dog": [0.9, 0.1], "airplane": [-0.2, 1.0]}
nearest = max(candidates, key=lambda key: cosine(query, candidates[key]))
print(nearest)`,
        explanation: "The vectors are hand-designed teaching examples, not learned semantic representations. A real application would use a consistent embedding model for documents and queries and evaluate retrieval quality on its own data.",
      },
    },
    quiz: [
      { id: "emb-1", question: "Can vectors from arbitrary unrelated embedding models be compared directly?", options: ["Always, if their lengths match", "Only after sorting their coordinates", "No, the coordinate spaces may not be compatible"], correct_index: 2, explanation: "Matching dimensions alone does not align the learned representation spaces." },
      { id: "emb-2", question: "What is the cosine similarity of [1, 0] and [2, 0]?", options: ["1", "2", "0"], correct_index: 0, explanation: "They point in the same direction, and cosine removes their length difference." },
      { id: "emb-3", question: "What determines the relationships an embedding captures?", options: ["Only the variable name", "The training objective, data, and model", "A universal fixed meaning for each coordinate"], correct_index: 1, explanation: "Vector geometry reflects how and on what the representation was learned." },
    ],
    terms: {
      "Embedding space": "The vector coordinate system produced by a particular learned representation.",
      "Cosine similarity": "A normalized dot product measuring alignment between nonzero vectors.",
      "Nearest neighbor": "An item closest to a query according to the chosen similarity or distance.",
    },
    used_in: ["Semantic search", "Recommendations", "Clustering"],
    go_deeper: { title: "Efficient Estimation of Word Representations in Vector Space", url: "https://arxiv.org/abs/1301.3781" },
  },
  "tokenization": {
    one_line: "Turn text into the exact sequence of vocabulary IDs expected by a model.",
    steps: {
      concept: { body: "A tokenizer splits text into units such as bytes, subwords, or words and maps those units to IDs. Subword methods balance vocabulary size against sequence length. Byte-pair encoding learns frequent pair merges; other tokenizers use different algorithms. Token boundaries depend on the tokenizer, language, whitespace, and special tokens. Use the model's own tokenizer for context budgeting and decoding." },
      intuition: { body: "A set of reusable building blocks can spell both familiar and new words. Common pieces may be stored as larger blocks, while unusual words need several smaller ones. Counting written words is therefore not the same as counting model tokens. A token ID is an index, not a numerical measure of meaning." },
      math: {
        body: "In a simplified BPE training step, choose a frequent adjacent symbol pair and merge it into one symbol. During encoding, apply the learned merge rules in their priority order. A vocabulary of V items supports IDs from 0 to V-1.",
        formulas: ["(a^*,b^*)=\\underset{(a,b)}{\\arg\\max}\\;\\operatorname{count}(a,b)", "\\operatorname{encode}(x)=(t_1,\\ldots,t_n),\\qquad 0\\leq t_i<V"],
        worked_example: "Starting with letters in 'lower', merges (l,o), (lo,w), and (e,r) yield ['low', 'er']. The actual IDs depend on the vocabulary.",
      },
      code: {
        language: "python",
        snippet: `pieces = list("lower")
for left, right in [("l", "o"), ("lo", "w"), ("e", "r")]:
    merged, index = [], 0
    while index < len(pieces):
        if index + 1 < len(pieces) and pieces[index:index+2] == [left, right]:
            merged.append(left + right)
            index += 2
        else:
            merged.append(pieces[index])
            index += 1
    pieces = merged

vocabulary = {"low": 0, "er": 1}
token_ids = [vocabulary[piece] for piece in pieces]
print(pieces, token_ids)`,
        explanation: "This tiny ordered-merge demonstration omits real tokenizer features such as byte fallback, normalization, special tokens, and efficient merge search. It illustrates subword composition rather than reproducing a production tokenizer.",
      },
    },
    quiz: [
      { id: "tok-1", question: "Which tokenizer should calculate a model's exact input token count?", options: ["The tokenizer paired with that model", "Any word-count tool", "Any tokenizer with the same vocabulary size"], correct_index: 0, explanation: "Different vocabularies, normalization rules, and special tokens can produce different counts and IDs." },
      { id: "tok-2", question: "What does a token ID represent?", options: ["The token's semantic importance", "An index in the model's vocabulary", "Its probability in every context"], correct_index: 1, explanation: "The ID selects a vocabulary entry, which can then select an embedding." },
      { id: "tok-3", question: "Why are subwords useful?", options: ["They guarantee one token per word", "They remove all sequence-length limits", "They represent many words using reusable pieces"], correct_index: 2, explanation: "Subwords let a finite vocabulary compose uncommon and new word forms." },
    ],
    terms: {
      BPE: "Byte-pair encoding, a family of subword tokenization methods based on learned symbol-pair merges.",
      Vocabulary: "The finite set of token entries supported by a model's tokenizer.",
      "Special token": "A reserved token for a structural role such as sequence boundaries or chat formatting.",
    },
    used_in: ["Model preprocessing", "Token-budget estimation", "Text generation"],
    go_deeper: { title: "Neural Machine Translation of Rare Words with Subword Units", url: "https://arxiv.org/abs/1508.07909" },
  },
  "chain-of-thought": {
    one_line: "Intermediate computation can help solve a task, but the final result still needs independent verification.",
    steps: {
      concept: { body: "Chain-of-thought methods use intermediate reasoning steps rather than asking only for a final answer. They can improve some multi-step tasks, depending on the model and prompting method. More explanation is not proof of correctness, and generated explanations need not faithfully reveal a model's internal process. Applications should verify important outcomes with tools, tests, or evidence instead of treating a fluent rationale as authority." },
      intuition: { body: "Breaking a shopping calculation into subtotal, discount, and tax can reduce mistakes compared with guessing the final total. Yet writing a convincing explanation of a wrong calculation does not make it right. Separating a proposed result from an independent arithmetic check gives a stronger safeguard than evaluating eloquence." },
      math: {
        body: "Extra intermediate tokens consume the same context and generation budget as other output tokens. A verifier can test a task-specific invariant. In the arithmetic example, the claimed total should equal quantity times price times one minus the discount, within the rounding tolerance.",
        formulas: ["T_{\\mathrm{total}}=T_{\\mathrm{prompt}}+T_{\\mathrm{intermediate}}+T_{\\mathrm{answer}}", "|a-qp(1-d)|\\leq\\epsilon"],
        worked_example: "Three items at 12 currency units each with a 10% discount cost 3*12*0.9 = 32.4. A separate calculation can reject a claimed total of 34.2.",
      },
      code: {
        language: "python",
        snippet: `from decimal import Decimal

quantity = 3
price = Decimal("12.00")
discount = Decimal("0.10")
subtotal = quantity * price
total = (subtotal * (1 - discount)).quantize(Decimal("0.01"))
claimed_total = Decimal("32.40")
verified = claimed_total == total
print({"subtotal": str(subtotal), "total": str(total), "verified": verified})`,
        explanation: "This is an external arithmetic verifier, not a language-model call or a reconstruction of private model reasoning. Decimal avoids binary floating-point surprises in this simple currency example.",
      },
    },
    quiz: [
      { id: "cot-1", question: "What is the strongest check of a generated arithmetic answer here?", options: ["A longer explanation", "An independent calculation", "More confident wording"], correct_index: 1, explanation: "A task-specific verifier checks the result directly instead of judging the style of its explanation." },
      { id: "cot-2", question: "What is a cost of generating intermediate reasoning text?", options: ["It eliminates the context limit", "It removes inference compute", "It consumes tokens, latency, and context budget"], correct_index: 2, explanation: "Intermediate tokens still need to be generated and included in the available budget." },
      { id: "cot-3", question: "Does a fluent rationale guarantee a faithful account of model internals?", options: ["No", "Yes for every model", "Yes whenever it uses equations"], correct_index: 0, explanation: "Generated explanations can be plausible without being correct or faithful to the underlying computation." },
    ],
    terms: {
      Decomposition: "Breaking a larger task into smaller computations or subproblems.",
      Verifier: "An independent procedure that checks whether an answer satisfies a relevant condition.",
      Faithfulness: "How accurately an explanation reflects the process that actually produced an outcome.",
    },
    used_in: ["Multi-step problem solving", "Tool-assisted workflows", "Answer verification"],
    go_deeper: { title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models", url: "https://arxiv.org/abs/2201.11903" },
  },
  "context-window": {
    one_line: "Budget for all the tokens a request needs, not just the user's latest message.",
    steps: {
      concept: { body: "A context window limits how much tokenized information a model can consider in a request. Depending on the model or API, input and output limits may be shared or separately constrained. System instructions, conversation history, retrieved documents, tool messages, and reserved output all consume budget. A large window does not guarantee that the model will reliably use every fact in it, and increasing context can increase latency and memory use." },
      intuition: { body: "Think of packing a suitcase with a fixed capacity. Essential instructions and the latest question need space, and you must leave room for the answer. Packing every old conversation and document can crowd out more relevant material. Summarization and retrieval help choose what matters, but either can lose important information." },
      math: {
        body: "For a shared window C, reserve output tokens before allocating the remaining input. Count tokens using the actual tokenizer and chat template, including structural overhead. The inequality is a budgeting rule, not a universal API specification.",
        formulas: ["T_{\\mathrm{system}}+T_{\\mathrm{history}}+T_{\\mathrm{documents}}+T_{\\mathrm{output}}\\leq C"],
        worked_example: "A 4096-token budget with 250 instruction tokens, 1600 history tokens, and 512 reserved output tokens leaves 1734 tokens for documents and any uncounted overhead.",
      },
      code: {
        language: "python",
        snippet: `context_limit = 4096
system_tokens, history_tokens, output_reserve = 250, 1600, 512
remaining = context_limit - system_tokens - history_tokens - output_reserve
if remaining < 0:
    raise ValueError("Instructions and history exceed the budget")

document_lengths = [1000, 700, 400]
selected = []
for length in document_lengths:
    if length <= remaining:
        selected.append(length)
        remaining -= length
print(selected, "tokens left:", remaining)`,
        explanation: "The lengths are assumed to come from a tokenizer and be ordered by relevance. The example keeps whole documents within the remaining budget. A production system also accounts for message formatting and may split documents at sensible boundaries.",
      },
    },
    quiz: [
      { id: "ctx-1", question: "Which tokens can consume request context?", options: ["Only the final user message", "Only generated output", "Instructions, history, retrieved content, and possibly output"], correct_index: 2, explanation: "The exact limits depend on the model/API, but all supplied context and reserved generation must be budgeted." },
      { id: "ctx-2", question: "How much remains in the worked example before documents are added?", options: ["1734 tokens", "4096 tokens", "3584 tokens"], correct_index: 0, explanation: "4096 - 250 - 1600 - 512 = 1734." },
      { id: "ctx-3", question: "Does a larger context window guarantee reliable use of every included fact?", options: ["Yes, by definition", "No, effective retrieval and reasoning still matter", "Only for documents longer than the window"], correct_index: 1, explanation: "A model can accept a long input yet overlook or misuse information within it." },
    ],
    terms: {
      "Output reserve": "Tokens set aside for the model's generated response.",
      Truncation: "Removing content to fit within a limit, potentially losing useful information.",
      "Context management": "Selecting, compressing, or retrieving information for a bounded model request.",
    },
    used_in: ["Chat applications", "Document assistants", "Long-context budgeting"],
    go_deeper: { title: "Lost in the Middle: How Language Models Use Long Contexts", url: "https://arxiv.org/abs/2307.03172" },
  },
  "mixture-of-experts": {
    one_line: "Activate a few specialist subnetworks per token to increase total capacity without using every parameter on every token.",
    steps: {
      concept: { body: "A sparse mixture-of-experts layer contains several expert networks and a router that selects which experts process each token. Often the experts replace a dense feed-forward block. Total parameter count can be large while active parameters per token remain smaller. Routing, communication, memory, load imbalance, and expert capacity still introduce costs. Sparse activation does not mean the whole model needs less storage." },
      intuition: { body: "A service desk sends each request to a few relevant specialists rather than asking every employee to work on it. If everyone is routed to one specialist, the others sit idle and a queue forms. Routing must balance useful specialization with efficient distribution of work." },
      math: {
        body: "The router assigns scores, selects a top-k set S, and combines selected expert outputs with normalized gate weights. This lesson uses normalized top-k probabilities; actual architectures differ in routing, capacity handling, and balancing losses.",
        formulas: ["y=\\sum_{i\\in S}g_iE_i(x),\\qquad \\sum_{i\\in S}g_i=1"],
        worked_example: "Router probabilities [0.7, 0.2, 0.1] select the first two experts. Renormalized gates are 7/9 and 2/9. Outputs 2 and 10 combine to 34/9, about 3.778.",
      },
      code: {
        language: "python",
        snippet: `probabilities = [0.7, 0.2, 0.1]
experts = [lambda x: 2*x, lambda x: 10*x, lambda x: -4*x]
selected = sorted(range(len(experts)),
                  key=lambda i: probabilities[i], reverse=True)[:2]
normalizer = sum(probabilities[i] for i in selected)
gates = [probabilities[i] / normalizer for i in selected]
output = sum(g * experts[i](1.0) for g, i in zip(gates, selected))
print(selected, gates, round(output, 6))`,
        explanation: "Only selected expert functions are evaluated. The tiny scalar functions stand in for neural networks; real serving must also move token activations to the appropriate devices and handle overloaded experts.",
      },
    },
    quiz: [
      { id: "moe-1", question: "What does sparse expert routing reduce per token?", options: ["The number of experts that execute", "The need to store all model weights", "Every communication cost"], correct_index: 0, explanation: "Only a subset of experts processes a token, while the full parameter set may still need to be available." },
      { id: "moe-2", question: "Why is load balancing important?", options: ["It makes every expert mathematically identical", "Uneven routing can overload some experts and leave others idle", "It removes the router"], correct_index: 1, explanation: "Concentrated traffic can waste compute and cause capacity bottlenecks." },
      { id: "moe-3", question: "After selecting probabilities 0.7 and 0.2, what is the first normalized gate?", options: ["0.5", "0.7 exactly", "7/9"], correct_index: 2, explanation: "The selected probabilities sum to 0.9, so the first weight is 0.7/0.9." },
    ],
    terms: {
      Router: "A learned mechanism that selects experts and produces their combination weights.",
      "Top-k routing": "Selecting the k highest-scoring experts for a token.",
      "Load balancing": "Encouraging work to be distributed across experts rather than concentrated on a few.",
      "Active parameters": "Parameters whose computation is used for a particular token, as distinct from the total stored model.",
    },
    used_in: ["Sparse language models", "Large-capacity training", "Distributed inference"],
    go_deeper: { title: "Switch Transformers", url: "https://arxiv.org/abs/2101.03961" },
  },
  "rag": {
    one_line: "Retrieve relevant evidence first, then ask a generator to answer using that evidence and its sources.",
    steps: {
      concept: { body: "Retrieval-augmented generation combines a retrieval system with a generative model. Documents are prepared and indexed, a query retrieves candidate passages, and selected passages become model context. Retrieval may use lexical search, embeddings, or a hybrid. RAG can update knowledge without retraining the generator, but missing, stale, unauthorized, or misleading sources can still produce bad answers. Citations should be checked against the actual supporting text." },
      intuition: { body: "An open-book exam works only if you find the right page and understand it correctly. Retrieval chooses the pages; generation writes the response. Better wording cannot fix a missing source. Evaluate these stages separately so that you know whether a failed answer came from search, context selection, or the generator." },
      math: {
        body: "A retriever selects top-k documents according to a relevance score. A generator then conditions on the question and selected evidence. This schematic expression describes a practical pipeline; it is not a claim that retrieval scores are calibrated probabilities.",
        formulas: ["D_q=\\operatorname{TopK}_{d\\in\\mathcal D}\\;s(q,d)", "p(y\\mid q,D_q)"],
        worked_example: "A question about KV-cache memory should retrieve a passage about stored keys and values, not just a broadly related passage about training. Attach the source ID so the final answer can cite the exact evidence.",
      },
      code: {
        language: "python",
        snippet: `documents = {
    "cache-guide": "KV cache memory stores keys and values",
    "training-guide": "Gradient descent updates model weights",
    "serving-guide": "Batching improves serving throughput",
}
query_terms = set("cache memory".lower().split())
scores = {
    key: len(query_terms & set(text.lower().split()))
    for key, text in documents.items()
}
source_id = max(scores, key=scores.get)
if scores[source_id] == 0:
    raise ValueError("No matching evidence")
context = f"[{source_id}] {documents[source_id]}"
print(context)`,
        explanation: "This runnable lexical retriever illustrates source selection and provenance; it does not call an LLM. A production system uses stronger search, authorization filters, sensible chunking, and an answer-grounding evaluation.",
      },
    },
    quiz: [
      { id: "rag-1", question: "What is the retriever's primary job?", options: ["Rewrite the model weights for every query", "Find relevant evidence", "Guarantee every generated claim is true"], correct_index: 1, explanation: "Retrieval selects relevant source material to condition the answer." },
      { id: "rag-2", question: "Does showing a citation prove that a claim is supported?", options: ["Yes, every URL proves its nearby sentence", "Yes, if the answer is fluent", "No, the cited passage must actually support the claim"], correct_index: 2, explanation: "Citation existence and evidence support are different checks." },
      { id: "rag-3", question: "How can RAG incorporate a newly published document?", options: ["Update the retrieval corpus/index without necessarily retraining the generator", "Always retrain the full model from scratch", "Increase output temperature only"], correct_index: 0, explanation: "External evidence can change independently of the generator's fixed parameters." },
    ],
    terms: {
      Retriever: "The component that selects relevant source passages for a query.",
      Chunking: "Splitting documents into units sized for indexing and model context.",
      Grounding: "Connecting an answer's claims to evidence supplied or verified for the task.",
      Provenance: "Information identifying where a piece of evidence came from.",
    },
    used_in: ["Document question answering", "Enterprise search", "Source-backed assistants"],
    go_deeper: { title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", url: "https://arxiv.org/abs/2005.11401" },
  },
};
