import type { LessonDraft } from "./types";

export const alignment: Record<string, LessonDraft> = {
  "rlhf": {
    one_line: "Turn preference comparisons into a training signal, while recognizing that reward is only a proxy for desired behavior.",
    steps: {
      concept: { body: "Reinforcement learning from human feedback commonly starts with supervised fine-tuning, gathers comparisons between candidate responses, trains a preference or reward model, and optimizes a policy using that signal. A constraint or penalty often limits deviation from a reference policy. Human feedback can improve usefulness, but annotator disagreement, reward-model errors, and overoptimization remain important. RLHF is not a proof of safety or universal agreement." },
      intuition: { body: "It may be easier for a reviewer to say which of two responses is better than to write the ideal response from scratch. A reward model learns to predict those comparisons. The generator then practices toward that learned score. If the scoring rule is imperfect, maximizing it too aggressively can exploit its weaknesses instead of improving the actual task." },
      math: {
        body: "A Bradley-Terry-style preference model predicts that response A is preferred to B with sigmoid(r_A-r_B). The pairwise loss is the negative log of that probability for the chosen answer. Policy training is a separate stage and may penalize KL divergence from a reference.",
        formulas: ["P(A\\succ B)=\\sigma(r_A-r_B)", "L_{\\mathrm{pair}}=-\\log\\sigma(r_A-r_B)", "J=\\mathbb E[r]-\\beta D_{\\mathrm{KL}}(\\pi\\Vert\\pi_{\\mathrm{ref}})"],
        worked_example: "If the chosen response has score 1.5 and the rejected response 0.5, the preference probability is sigmoid(1), about 0.731, and the pairwise loss is about 0.313.",
      },
      code: {
        language: "python",
        snippet: `from math import exp, log1p

chosen_score, rejected_score = 1.5, 0.5
difference = chosen_score - rejected_score
preference_probability = 1 / (1 + exp(-difference))
pairwise_loss = max(0.0, -difference) + log1p(exp(-abs(difference)))
print(round(preference_probability, 6), round(pairwise_loss, 6))`,
        explanation: "The stable expression computes one preference-model loss. It does not perform policy optimization or replace careful human labeling. A preference probability measures the learned comparison, not objective truth.",
      },
    },
    quiz: [
      { id: "rlhf-1", question: "What does a pairwise preference dataset record?", options: ["Only the token count of a prompt", "Which of two responses a reviewer prefers", "A guarantee that all reviewers agree"], correct_index: 1, explanation: "Comparisons identify the chosen response relative to an alternative, under a specific annotation rubric." },
      { id: "rlhf-2", question: "Why limit deviation from a reference policy?", options: ["To eliminate every possible error", "To ensure no parameter can ever change", "To discourage excessive changes while optimizing an imperfect reward"], correct_index: 2, explanation: "A reference constraint can help control drift and reward overoptimization, but does not guarantee desired behavior." },
      { id: "rlhf-3", question: "Does a higher learned reward necessarily mean a more truthful answer?", options: ["No, the reward model is a fallible proxy", "Yes, by definition", "Only when the answer is longer"], correct_index: 0, explanation: "The reward reflects training comparisons and can be mistaken or exploited." },
    ],
    terms: {
      "Preference model": "A learned model that predicts how responses compare under collected feedback.",
      "Reference policy": "A baseline behavior distribution used to constrain or compare policy updates.",
      "Reward overoptimization": "Improving a proxy score in ways that do not improve, or can harm, the intended objective.",
    },
    used_in: ["Assistant post-training", "Preference optimization research", "Human-guided model improvement"],
    go_deeper: { title: "Training language models to follow instructions with human feedback", url: "https://arxiv.org/abs/2203.02155" },
  },
  "hallucination": {
    one_line: "A plausible generated statement still needs evidence when the task requires factual or source-faithful answers.",
    steps: {
      concept: { body: "Hallucination describes generated content that is unsupported, false, or inconsistent with the supplied context. The exact definition depends on the task: creative fiction is different from factual question answering. Language models optimize predictive objectives rather than a universal truth test. Retrieval, source checking, tool use, calibrated abstention, and targeted evaluation can reduce risk but do not guarantee elimination." },
      intuition: { body: "A sentence can sound like an encyclopedia entry while containing an invented date. Fluency is a property of presentation, not evidence. A careful assistant distinguishes what the available source supports, what remains uncertain, and what cannot be answered rather than filling every gap with a confident guess." },
      math: {
        body: "For a set of factual claims, an evaluation can report the fraction supported by specified evidence. Support rate and answer completeness are different: saying almost nothing may increase support rate while failing the user's task. Real semantic support generally needs more than exact string matching.",
        formulas: ["\\operatorname{support\\ rate}=\\frac{\\#\\text{supported claims}}{\\#\\text{evaluated claims}}"],
        worked_example: "If evidence confirms a project's launch year but provides no team size, one of two claims is supported. The missing team size should be marked unverified, not guessed.",
      },
      code: {
        language: "python",
        snippet: `evidence = {"project": "Atlas", "launch_year": 2024}
claims = [("launch_year", 2024), ("team_size", 12)]
supported = []
unverified = []
for field, value in claims:
    if field in evidence and evidence[field] == value:
        supported.append((field, value))
    else:
        unverified.append((field, value))
support_rate = len(supported) / len(claims)
print("Supported:", supported)
print("Unverified:", unverified, "rate:", support_rate)`,
        explanation: "This checks structured claims against a tiny explicit evidence table. It is not a general hallucination detector: natural-language entailment, source reliability, dates, and incomplete evidence require more careful evaluation.",
      },
    },
    quiz: [
      { id: "hall-1", question: "Which property by itself proves a generated claim is factual?", options: ["Confident tone", "Detailed wording", "Neither confidence nor detail"], correct_index: 2, explanation: "Presentation does not establish evidence or truth." },
      { id: "hall-2", question: "What is appropriate when reliable evidence does not establish a requested fact?", options: ["Explain the uncertainty or abstain instead of inventing it", "Invent a precise number", "Treat any citation as conclusive"], correct_index: 0, explanation: "An honest boundary is preferable to a fabricated factual answer." },
      { id: "hall-3", question: "Does a perfect support rate guarantee a complete answer?", options: ["Yes, regardless of omitted facts", "No, the answer may omit essential requested information", "Only if it contains no claims"], correct_index: 1, explanation: "Support and completeness assess different dimensions of answer quality." },
    ],
    terms: {
      "Evidence support": "A relationship in which supplied or verified information substantiates a specific claim.",
      Abstention: "Declining to assert an answer when the available evidence or confidence is insufficient.",
      "Context faithfulness": "Consistency of an answer with the information provided for the task.",
    },
    used_in: ["Factual assistants", "Document summarization", "Source-grounded evaluation"],
    go_deeper: { title: "A Survey on Hallucination in Large Language Models", url: "https://arxiv.org/abs/2311.05232" },
  },
  "red-teaming": {
    one_line: "Use authorized, controlled challenge cases to uncover failures that ordinary happy-path tests miss.",
    steps: {
      concept: { body: "AI red teaming systematically tests a system's behavior against documented requirements and risk boundaries. Work should be authorized, scoped, and performed with synthetic or appropriately protected data. It complements routine quality evaluation by deliberately seeking difficult conditions. Findings need reproducible evidence, severity assessment, and remediation tests. A small successful test suite does not prove a system has no remaining failures." },
      intuition: { body: "Before a bridge opens, engineers test more than a single light vehicle crossing on a sunny day. An AI system likewise needs boundary conditions, ambiguous inputs, and checks of its stated constraints. The goal is to find and fix weaknesses, not to expose real users or sensitive information while testing." },
      math: {
        body: "A suite can record the fraction of cases violating an expected behavior. This rate depends on how cases were selected and is not automatically an estimate of real-world incident probability. Counts, categories, and severity should accompany any single aggregate.",
        formulas: ["\\widehat f=\\frac1N\\sum_{i=1}^{N}\\mathbf1[o_i\\notin\\mathcal A_i]"],
        worked_example: "If two format-boundary tests pass and one fails, the observed suite failure rate is 1/3. The failure should become a regression case after the underlying issue is fixed.",
      },
      code: {
        language: "python",
        snippet: `cases = [
    {"name": "ordinary input", "expected": "accept", "observed": "accept"},
    {"name": "empty input", "expected": "reject", "observed": "reject"},
    {"name": "over-length input", "expected": "reject", "observed": "accept"},
]
failures = [case["name"] for case in cases
            if case["observed"] != case["expected"]]
failure_rate = len(failures) / len(cases)
print("Cases to investigate:", failures)
print("Suite failure rate:", failure_rate)`,
        explanation: "These benign synthetic cases illustrate evaluation bookkeeping, not live probing of a system. Real test programs define permitted scope, protect data, document reproducibility, and verify fixes through regression tests.",
      },
    },
    quiz: [
      { id: "red-1", question: "What should be established before testing a deployed system?", options: ["Authorization, scope, and data-handling rules", "A plan to publish private data", "An assumption that every system is in scope"], correct_index: 0, explanation: "Controlled testing needs permission and boundaries that protect users and systems." },
      { id: "red-2", question: "What should happen after a reproducible failure is fixed?", options: ["Delete all knowledge of the failure", "Add a regression test and verify the remediation", "Assume all related failures are impossible"], correct_index: 1, explanation: "A regression case helps detect whether the issue returns after future changes." },
      { id: "red-3", question: "Does zero failures in a small selected suite prove overall safety?", options: ["Yes", "Yes if tests have descriptive names", "No, coverage and selection are limited"], correct_index: 2, explanation: "The suite only provides evidence about its tested conditions." },
    ],
    terms: {
      Scope: "The authorized systems, data, behaviors, and conditions included in an evaluation.",
      "Challenge case": "A deliberately chosen input or situation intended to test a difficult boundary.",
      "Regression test": "A repeatable check that a previously fixed failure does not reappear.",
      Severity: "An assessment of potential impact and context, distinct from how often a test fails.",
    },
    used_in: ["Pre-deployment evaluation", "Robustness testing", "Responsible model releases"],
    go_deeper: { title: "Red Teaming Language Models with Language Models", url: "https://arxiv.org/abs/2202.03286" },
  },
};
