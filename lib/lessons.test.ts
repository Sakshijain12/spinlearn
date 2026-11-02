import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "katex";
import { AVAILABLE_LESSONS, getGlossary, getLesson, PUBLISHED_TOPICS } from "./lessons";
import { SAMPLE_TOPICS } from "./data";
import { CATEGORIES } from "./learning";
import { lessonContentSchema } from "./schemas/validation";
import { sampleTopicPool } from "./utils";

const expectedSlugs = [
  "kv-cache", "self-attention", "transformer-architecture", "attention-heads",
  "positional-encoding", "embeddings", "tokenization", "softmax", "gradient-descent",
  "backpropagation", "batch-normalization", "lora", "reinforcement-learning", "rlhf",
  "quantization", "model-compression", "inference-optimization", "prompt-engineering",
  "chain-of-thought", "few-shot-learning", "overfitting", "bias-variance-tradeoff",
  "cross-entropy-loss", "precision-and-recall", "regularization", "dropout", "cnn",
  "residual-connection", "context-window", "mixture-of-experts", "rag", "diffusion-models",
  "gans", "variational-autoencoder", "fine-tuning", "learning-rate-schedule", "scaling-laws",
  "knowledge-distillation", "vector-database", "model-drift", "hallucination", "red-teaming",
];

const codeChecks: Record<string, string> = {
  "kv-cache": "assert len(outputs) == 2 and outputs[0] == [1.0, 0.0]\nassert isclose(sum(outputs[1]), 1) and outputs[1][1] > outputs[1][0]",
  "self-attention": "assert isclose(sum(weights), 1) and weights[0] > weights[1]\nassert isclose(output[0], weights[0] * 10) and isclose(output[1], weights[1] * 20)",
  "transformer-architecture": "assert output[0] == 1 and 3.99 < output[1] < 4.01",
  "attention-heads": "assert head_outputs[0] < 15 < head_outputs[1]\nassert isclose(combined, 15)",
  "positional-encoding": "assert positional_encoding(0, 4) == [0, 1, 0, 1]\nassert len(encoding) == 4 and isclose(encoding[0], 0.8414709848078965)",
  "embeddings": "assert nearest == 'dog'\nassert isclose(cosine([1, 0], [2, 0]), 1) and isclose(cosine([1, 0], [0, 1]), 0)",
  "tokenization": "assert pieces == ['low', 'er'] and token_ids == [0, 1]\nassert ''.join(pieces) == 'lower'",
  "softmax": "assert isclose(sum(probabilities), 1)\nassert all(isclose(a, b) for a, b in zip(probabilities, softmax([1, 2, 3])))\nassert probabilities[2] > probabilities[1] > probabilities[0]",
  "gradient-descent": "assert abs(weight - 2) < 0.03\nassert all(b < a for a, b in zip(losses, losses[1:]))",
  "backpropagation": "assert grad_a == 184 and grad_b == 138\nassert isclose(numerical, grad_a, rel_tol=1e-8)",
  "batch-normalization": "assert isclose(mean, 2.5) and isclose(variance, 1.25)\nassert abs(sum(normalized)) < 1e-9\nassert abs(sum(x*x for x in normalized) / len(normalized) - 1) < 1e-4",
  "lora": "assert adapter_parameters == 5\nassert isclose(output[0], 2.6) and isclose(output[1], 0.7)\nassert base == [[1, 0, 0], [0, 1, 0]]",
  "reinforcement-learning": "assert isclose(target, 2.8) and isclose(updated_q, 1.4)",
  "rlhf": "assert isclose(preference_probability, 0.7310585786300049)\nassert isclose(pairwise_loss, 0.31326168751822286)",
  "quantization": "assert quantized == [-127, -38, 0, 51, 127]\nassert max_error <= scale / 2 + 1e-12",
  "model-compression": "assert pruned == [0.8, 0, -0.6, 0] and sparsity == 0.5\nassert isclose(abs(before - after), 0.01)",
  "inference-optimization": "assert separate_ms == 24 and batched_ms == 10\nassert isclose(speedup, 2.4) and isclose(amdahl_speedup, 5/3)",
  "prompt-engineering": "assert result == {'label': 'billing', 'confidence': 0.8}",
  "chain-of-thought": "assert total == Decimal('32.40') and verified",
  "few-shot-learning": "assert prototypes == {'A': -1.5, 'B': 1.5} and prediction == 'B'",
  "overfitting": "assert best_epoch == 3 and isclose(gap, 0.16)",
  "bias-variance-tradeoff": "assert bias_squared == 0 and variance == 1 and mse == 1\nassert isclose(bias_squared + variance, mse)",
  "cross-entropy-loss": "assert isclose(loss, 0.4076059644443806)",
  "precision-and-recall": "assert (tp, fp, fn) == (2, 1, 1)\nassert all(isclose(value, 2/3) for value in (precision, recall, f1))",
  "regularization": "assert isclose(updated_weight, 2.3)",
  "dropout": "assert inference == activations and 0 in training\nassert any(x != 0 for x in training)\nassert all(y == 0 or y == 2*x for x, y in zip(activations, training))",
  "cnn": "assert outputs == [-3.0, 2.0]",
  "residual-connection": "assert identity_outputs == inputs\nassert all(isclose(y, 1.1*x) for x, y in zip(inputs, outputs))",
  "context-window": "assert selected == [1000, 700] and remaining == 34",
  "mixture-of-experts": "assert selected == [0, 1] and isclose(sum(gates), 1)\nassert isclose(output, 34/9)",
  "rag": "assert source_id == 'cache-guide' and scores[source_id] == 2\nassert context.startswith('[cache-guide]')",
  "diffusion-models": "assert isclose(noisy, 0.46) and isclose(reconstructed, clean)",
  "gans": "assert isclose(discriminator_loss, 0.4462871026284194)\nassert isclose(generator_loss, 1.6094379124341003)\nassert improved_generator_loss < generator_loss",
  "variational-autoencoder": "assert isclose(kl, 0.275)\nassert isclose(latent[0], 0.9071067811865475) and isclose(latent[1], -1.5142135623730952)",
  "fine-tuning": "assert weight > pretrained_weight\nassert losses[-1] < losses[0]",
  "learning-rate-schedule": "assert isclose(rates[0], 0.0005) and isclose(rates[1], 0.001)\nassert isclose(rates[-1], 0)\nassert all(b <= a for a, b in zip(rates[2:], rates[3:]))",
  "scaling-laws": "assert all(isclose(a, b) for a, b in zip(losses, [2.1, 1.1, 0.6, 0.35]))",
  "knowledge-distillation": "assert isclose(sum(teacher), 1) and isclose(sum(student), 1)\nassert kl > 0 and isclose(distillation_loss, 4*kl)",
  "vector-database": "assert [row['id'] for row in ranked] == ['guide-a', 'guide-c']\nassert all(row['kind'] == 'guide' for row in ranked)",
  "model-drift": "assert isclose(distance, 0.3) and alert",
  "hallucination": "assert supported == [('launch_year', 2024)]\nassert unverified == [('team_size', 12)] and support_rate == 0.5",
  "red-teaming": "assert failures == ['over-length input'] and isclose(failure_rate, 1/3)",
};

describe("complete published catalogue", () => {
  it("preserves every existing slug and includes every handover topic", () => {
    expect(SAMPLE_TOPICS).toHaveLength(42);
    expect(AVAILABLE_LESSONS).toHaveLength(42);
    expect(AVAILABLE_LESSONS.map((lesson) => lesson.slug).sort()).toEqual([...expectedSlugs].sort());
    expect(new Set(SAMPLE_TOPICS.map((topic) => topic.id)).size).toBe(42);
    expect(new Set(SAMPLE_TOPICS.map((topic) => topic.name)).size).toBe(42);
    expect(PUBLISHED_TOPICS).toEqual(SAMPLE_TOPICS);
    expect(AVAILABLE_LESSONS.reduce((count, lesson) => count + lesson.quiz.length, 0)).toBe(84);
    expect(AVAILABLE_LESSONS.map((lesson) => lesson.steps.concept.quick_check)).toHaveLength(42);
  });

  it.each(AVAILABLE_LESSONS)("validates every learning surface for $slug", (lesson) => {
    expect(lessonContentSchema.parse(lesson)).toEqual(lesson);
    const topic = SAMPLE_TOPICS.find((item) => item.slug === lesson.slug);
    expect(topic).toMatchObject({ name: lesson.title, category: lesson.category, level: lesson.level, minutes: lesson.minutes });
    expect(lesson.steps.concept.body.length).toBeGreaterThan(180);
    expect(lesson.steps.intuition.body.length).toBeGreaterThan(150);
    expect(lesson.steps.math.worked_example?.length).toBeGreaterThan(70);
    expect(lesson.steps.code.snippet.length).toBeGreaterThan(150);
    expect(lesson.steps.code.explanation.length).toBeGreaterThan(100);
    expect(lesson.steps.code.language).toBe("python");
    const glossary = getGlossary(lesson.slug);
    expect(Object.keys(glossary)).toEqual(lesson.key_terms);
    for (const term of lesson.key_terms) expect(glossary[term].length).toBeGreaterThan(20);
    const questions = [lesson.steps.concept.quick_check, ...lesson.quiz];
    expect(lesson.quiz).toHaveLength(2);
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
    expect(new Set(questions.map((question) => question.question)).size).toBe(questions.length);
    for (const question of questions) {
      expect(question.options[question.correct_index]).toBeDefined();
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.explanation.length).toBeGreaterThan(30);
    }
    for (const formula of lesson.steps.math.formulas) {
      expect(() => renderToString(formula, { throwOnError: true, strict: "error", trust: false })).not.toThrow();
    }
    expect(new URL(lesson.go_deeper.url).protocol).toBe("https:");
  });

  it("has original concept, intuition, code, and questions for every topic", () => {
    for (const field of ["concept", "intuition"] as const) {
      expect(new Set(AVAILABLE_LESSONS.map((lesson) => lesson.steps[field].body)).size).toBe(42);
    }
    expect(new Set(AVAILABLE_LESSONS.map((lesson) => lesson.steps.code.snippet)).size).toBe(42);
    const questions = AVAILABLE_LESSONS.flatMap((lesson) =>
      [lesson.steps.concept.quick_check, ...lesson.quiz].map((question) => question.question));
    expect(new Set(questions).size).toBe(126);
    expect(getLesson("not-a-topic")).toBeUndefined();
    expect(getGlossary("lora").Rank).toContain("matrix");
  });

  it("serves at least three topics in every category and multiple advanced LLMs", () => {
    for (const category of CATEGORIES.filter((value) => value !== "All")) {
      expect(PUBLISHED_TOPICS.filter((topic) => topic.category === category).length).toBeGreaterThanOrEqual(3);
    }
    const advancedLLMs = PUBLISHED_TOPICS.filter((topic) => topic.category === "LLMs" && topic.level === "Advanced");
    expect(advancedLLMs.map((topic) => topic.slug).sort()).toEqual(["kv-cache", "mixture-of-experts", "transformer-architecture"]);
  });

  it("can select every published topic and never fills a multi-topic reel with only the winner", () => {
    const random = vi.spyOn(Math, "random");
    try {
      for (let index = 0; index < PUBLISHED_TOPICS.length; index += 1) {
        random.mockReturnValue((index + 0.5) / PUBLISHED_TOPICS.length);
        const result = sampleTopicPool(PUBLISHED_TOPICS);
        expect(result.decoys[result.chosenIndex]).toBe(PUBLISHED_TOPICS[index].name);
        expect(new Set(result.decoys).size).toBeGreaterThan(1);
        expect(getLesson(PUBLISHED_TOPICS[index].slug)).toBeDefined();
      }
    } finally {
      random.mockRestore();
    }
  });

  it("rejects a correct-index pointing beyond the available answers", () => {
    const lesson = AVAILABLE_LESSONS.find((item) => item.slug === "lora")!;
    const invalid = { ...lesson, quiz: lesson.quiz.map((question, index) => index === 0 ? { ...question, correct_index: 3 } : question) };
    expect(lessonContentSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects a Concept question duplicated in the final Quiz", () => {
    const lesson = AVAILABLE_LESSONS[0];
    const duplicated = { ...lesson, quiz: [lesson.steps.concept.quick_check, ...lesson.quiz] };
    expect(lessonContentSchema.safeParse(duplicated).success).toBe(false);
  });

  it("executes all 42 Python examples and verifies their numerical results", () => {
    expect(Object.keys(codeChecks).sort()).toEqual([...expectedSlugs].sort());
    const examples = AVAILABLE_LESSONS.map((lesson) => ({
      slug: lesson.slug, code: lesson.steps.code.snippet, check: codeChecks[lesson.slug],
    }));
    const result = spawnSync("python", ["-c", `
import contextlib, io, json, math, sys
examples = json.load(sys.stdin)
for example in examples:
    scope = {"__name__": "__main__", "isclose": math.isclose}
    output = io.StringIO()
    try:
        with contextlib.redirect_stdout(output):
            exec(compile(example["code"], example["slug"] + ".py", "exec"), scope)
        assert output.getvalue().strip(), "Example must demonstrate a result"
        exec(compile(example["check"], example["slug"] + "_checks.py", "exec"), scope)
    except Exception as error:
        raise RuntimeError("Failed code example: " + example["slug"]) from error
print("Verified", len(examples), "runnable Python examples.")
`], { input: JSON.stringify(examples), encoding: "utf8", timeout: 20000, windowsHide: true });
    if (result.error) throw result.error;
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Verified 42 runnable Python examples.");
  }, 30000);
});
