import type { LessonDraft } from "./types";

export const generativeAI: Record<string, LessonDraft> = {
  "prompt-engineering": {
    one_line: "Specify the task and success criteria clearly, then evaluate the outputs instead of relying on clever phrasing.",
    steps: {
      concept: { body: "Prompt engineering designs the instructions, context, examples, and output requirements given to a generative model. Clear boundaries between instructions and supplied data help reduce ambiguity. Good prompts are evaluated against representative cases, including edge cases, not just one pleasing example. Prompting cannot guarantee factual accuracy, enforce authorization, or replace application-side validation." },
      intuition: { body: "A useful task brief says what to do, what information to use, what to return, and how success will be judged. An unclear brief invites interpretation. Even a clear brief can be followed incorrectly, so the receiving application still checks the result, just as a reviewer checks a completed form." },
      math: {
        body: "A simple evaluation score is the fraction of cases meeting a predefined criterion. Different criteria, such as schema validity and factual accuracy, should be reported separately. Passing a schema check alone says nothing about whether the values are true.",
        formulas: ["\\widehat s=\\frac1N\\sum_{i=1}^{N}\\mathbf1[\\operatorname{criterion}(o_i)]"],
        worked_example: "If 18 of 20 responses follow the required JSON schema, format compliance is 90%. Factual correctness must be measured independently rather than inferred from that number.",
      },
      code: {
        language: "python",
        snippet: `import json

instruction = 'Return JSON with label and confidence. Labels: billing, technical, other.'
response = '{"label": "billing", "confidence": 0.8}'
result = json.loads(response)
if set(result) != {"label", "confidence"}:
    raise ValueError("Unexpected response fields")
if result["label"] not in {"billing", "technical", "other"}:
    raise ValueError("Unknown label")
score = result["confidence"]
if type(score) not in (int, float) or not 0 <= score <= 1:
    raise ValueError("Confidence must be a number between zero and one")
print(result["label"])`,
        explanation: "The response is a fixed sample, not a model API call. The validator checks structure and allowed values; it cannot tell whether billing is the correct category or whether the confidence is calibrated.",
      },
    },
    quiz: [
      { id: "prompt-1", question: "What should accompany a clear output-format instruction?", options: ["Application-side validation", "An assumption that the format will always be followed", "Removal of all evaluation examples"], correct_index: 0, explanation: "The application must still validate outputs rather than trusting a prompt to enforce a contract." },
      { id: "prompt-2", question: "Does valid JSON prove the contained answer is factual?", options: ["Yes", "No, syntax and truth are different checks", "Only if it has exactly two fields"], correct_index: 1, explanation: "A structurally valid response can still contain unsupported or incorrect claims." },
      { id: "prompt-3", question: "How should two prompt variants be compared?", options: ["By selecting the longer one automatically", "By one appealing example", "Using the same representative test cases and criteria"], correct_index: 2, explanation: "Consistent evaluation reduces cherry-picking and reveals tradeoffs across cases." },
    ],
    terms: {
      Instruction: "The task description and constraints supplied to a model.",
      "Output contract": "The structure and allowed values the consuming application expects.",
      Rubric: "A predefined set of criteria for assessing responses consistently.",
      "Untrusted context": "Supplied material whose contents should not be treated as application authority.",
    },
    used_in: ["Structured extraction", "Assistant workflows", "Task evaluation"],
    go_deeper: { title: "Pre-train, Prompt, and Predict: a survey of prompting methods", url: "https://arxiv.org/abs/2107.13586" },
  },
  "few-shot-learning": {
    one_line: "Use a few examples to communicate or infer a new task without assuming a large labeled dataset.",
    steps: {
      concept: { body: "Few-shot learning addresses tasks with only a small labeled support set. Approaches include metric learning, meta-learning, and in-context examples for language models. In-context learning supplies demonstrations in the prompt without updating model weights; other few-shot methods do train or adapt parameters. Example selection, class coverage, ordering, and evaluation contamination can strongly affect results." },
      intuition: { body: "Showing two correctly filled forms can teach a format faster than a long abstract description. But examples that cover only easy cases may leave important rules ambiguous. A metric-based classifier uses a related idea: a few labeled examples define representative points, and a new item is compared with those points." },
      math: {
        body: "In a prototypical classifier, average support embeddings for each class to obtain a prototype c_k. Predict the class with the smallest chosen distance to the query embedding. This illustrates one metric-learning approach, not the internal mechanics of LLM in-context learning.",
        formulas: ["c_k=\\frac1{|S_k|}\\sum_{x\\in S_k}f(x)", "\\widehat y=\\underset{k}{\\arg\\min}\\;d(f(x),c_k)"],
        worked_example: "Class A has one-dimensional support embeddings [-2, -1], giving prototype -1.5. Class B has [1, 2], giving 1.5. Query 0.8 is closer to B.",
      },
      code: {
        language: "python",
        snippet: `support = {"A": [-2.0, -1.0], "B": [1.0, 2.0]}
prototypes = {
    label: sum(examples) / len(examples)
    for label, examples in support.items()
}
query = 0.8
prediction = min(prototypes, key=lambda label: (query - prototypes[label]) ** 2)
print(prototypes, prediction)`,
        explanation: "The numbers are precomputed toy embeddings, and classification uses nearest prototypes. In an LLM, few-shot prompting instead includes input-output demonstrations in context; no nearest-prototype calculation is implied.",
      },
    },
    quiz: [
      { id: "few-1", question: "Does ordinary few-shot prompting update an LLM's weights?", options: ["Yes, on every prompt", "No, demonstrations are supplied in context", "Only when examples are sorted"], correct_index: 1, explanation: "In-context demonstrations condition the response without performing a parameter update." },
      { id: "few-2", question: "For prototypes -1.5 and 1.5, which class is closest to query 0.8?", options: ["The negative prototype", "They are equally close", "The positive prototype"], correct_index: 2, explanation: "The distances are 2.3 and 0.7, respectively." },
      { id: "few-3", question: "What makes a small demonstration set more useful?", options: ["Representative examples covering important distinctions", "Only repeating the same easy example", "Including final test answers in the prompt"], correct_index: 0, explanation: "Coverage and relevance matter; leaking evaluation answers would invalidate the evaluation." },
    ],
    terms: {
      "Support set": "The small labeled example set available for a new task.",
      Prototype: "A representative embedding, often the mean of a class's support examples.",
      "In-context learning": "Adapting behavior from instructions or examples within a request without updating parameters.",
    },
    used_in: ["Low-data classification", "Prompt demonstrations", "Rapid task adaptation"],
    go_deeper: { title: "Prototypical Networks for Few-shot Learning", url: "https://arxiv.org/abs/1703.05175" },
  },
  "diffusion-models": {
    one_line: "Learn how to remove controlled noise so a model can turn a noisy starting point into a sample.",
    steps: {
      concept: { body: "Diffusion models define a forward process that gradually corrupts data with noise and learn a reverse process that removes it. A common training objective predicts the noise added at a randomly selected timestep. At generation time, an iterative sampler uses the trained predictions to move from noise toward a sample. Image systems often perform this process in a learned latent space to reduce computation." },
      intuition: { body: "Imagine repeatedly adding static to a picture until its structure is obscured. Training supplies many pairs of noisy pictures and the noise that produced them, teaching a model useful denoising directions. Generation starts from a noisy canvas and uses those learned directions step by step; it is not simply reversing a known stored photograph." },
      math: {
        body: "A noisy sample can be formed directly from clean data x_0 and standard Gaussian noise epsilon using cumulative noise-schedule coefficient alpha_bar_t. Noise-prediction training minimizes squared error between the true noise and the model's estimate.",
        formulas: ["x_t=\\sqrt{\\overline\\alpha_t}\\,x_0+\\sqrt{1-\\overline\\alpha_t}\\,\\epsilon", "L=\\mathbb E\\left[\\lVert\\epsilon-\\epsilon_\\theta(x_t,t)\\rVert_2^2\\right]"],
        worked_example: "With x_0 = 0.8, alpha_bar = 0.64, and noise -0.3, the noisy value is 0.8*0.8 + 0.6*(-0.3) = 0.46.",
      },
      code: {
        language: "python",
        snippet: `from math import sqrt

clean = 0.8
alpha_bar = 0.64
noise = -0.3
noisy = sqrt(alpha_bar) * clean + sqrt(1 - alpha_bar) * noise
estimated_noise = noise
reconstructed = (noisy - sqrt(1 - alpha_bar) * estimated_noise) / sqrt(alpha_bar)
print(round(noisy, 4), round(reconstructed, 4))`,
        explanation: "This demonstrates one forward noising step and algebraic reconstruction when the exact noise is known. A trained model must estimate that noise; a real diffusion sampler uses a schedule and repeated updates rather than this oracle.",
      },
    },
    quiz: [
      { id: "diff-1", question: "What does a common diffusion training objective predict?", options: ["The filename of the training image", "Only its class label", "The noise added to a sample at a timestep"], correct_index: 2, explanation: "Noise-prediction models learn to estimate the corruption from the noisy input and timestep." },
      { id: "diff-2", question: "Why is the code's exact reconstruction not a complete generator?", options: ["It uses the known noise rather than a learned estimate", "It never uses arithmetic", "It proves all real models reconstruct perfectly"], correct_index: 0, explanation: "Knowing the true noise is an illustrative oracle; generation relies on imperfect learned denoising." },
      { id: "diff-3", question: "What is an advantage of latent diffusion?", options: ["It removes all training data requirements", "It performs diffusion in a more compact representation", "It guarantees zero sampling cost"], correct_index: 1, explanation: "A learned latent representation can reduce the dimensionality and cost of denoising." },
    ],
    terms: {
      "Noise schedule": "The sequence controlling how much noise is added or removed across timesteps.",
      Denoising: "Estimating a cleaner signal or the noise component from a corrupted observation.",
      "Latent diffusion": "Running a diffusion process in a learned lower-dimensional representation.",
    },
    used_in: ["Image generation", "Audio synthesis", "Image restoration"],
    go_deeper: { title: "Denoising Diffusion Probabilistic Models", url: "https://arxiv.org/abs/2006.11239" },
  },
  "gans": {
    one_line: "Train a generator to create plausible samples while a discriminator learns to distinguish generated from real data.",
    steps: {
      concept: { body: "A generative adversarial network pairs a generator with a discriminator. The generator maps noise to samples; the discriminator scores whether samples resemble the real data distribution. Training alternates updates using competing objectives. GANs can produce sharp outputs, but optimization can be unstable and mode collapse can reduce diversity. A high-quality individual sample is not enough to show that the full distribution is well covered." },
      intuition: { body: "One player creates examples, and another learns to spot what makes them different from real examples. Each pushes the other to improve. If the creator discovers a few samples that consistently fool the judge, it may repeat those rather than cover the whole variety of real data. That is a useful way to understand mode collapse." },
      math: {
        body: "A binary discriminator can minimize negative log probability for real data and negative log one-minus-probability for generated data. The common non-saturating generator objective instead minimizes -log D(G(z)). This differs from simply minimizing the discriminator's own loss.",
        formulas: ["L_D=-\\mathbb E_x\\log D(x)-\\mathbb E_z\\log(1-D(G(z)))", "L_G=-\\mathbb E_z\\log D(G(z))"],
        worked_example: "If D(real) = 0.8 and D(fake) = 0.2, the discriminator loss for one pair is about 0.446. The non-saturating generator loss is -log(0.2), about 1.609.",
      },
      code: {
        language: "python",
        snippet: `from math import log

real_score = 0.8
fake_score = 0.2
discriminator_loss = -log(real_score) - log(1 - fake_score)
generator_loss = -log(fake_score)
improved_generator_loss = -log(0.5)
print(round(discriminator_loss, 6), round(generator_loss, 6))
print("If fake is scored 0.5:", round(improved_generator_loss, 6))`,
        explanation: "This computes objectives from fixed illustrative discriminator scores. Training would backpropagate through the discriminator into the generator for its update while keeping discriminator parameters fixed during that step.",
      },
    },
    quiz: [
      { id: "gan-1", question: "What does the generator typically map into a sample?", options: ["A latent noise vector", "The discriminator's source code", "A mandatory exact copy of one training sample"], correct_index: 0, explanation: "A latent input lets the generator produce different samples." },
      { id: "gan-2", question: "What is mode collapse?", options: ["Using too many labels", "Producing too little diversity despite plausible individual outputs", "An exact guarantee of full data coverage"], correct_index: 1, explanation: "A generator may concentrate on a few modes while missing other parts of the real distribution." },
      { id: "gan-3", question: "When D(fake) rises from 0.2 to 0.5, what happens to -log D(fake)?", options: ["It increases", "It stays identical", "It decreases"], correct_index: 2, explanation: "A larger probability assigned to generated data lowers the non-saturating generator loss." },
    ],
    terms: {
      Generator: "A learned function producing samples from latent inputs.",
      Discriminator: "A model that distinguishes real examples from generated examples in adversarial training.",
      "Mode collapse": "Insufficient output diversity, where a generator covers only a limited part of the target distribution.",
    },
    used_in: ["Image synthesis", "Image-to-image translation", "Generative representation research"],
    go_deeper: { title: "Generative Adversarial Networks", url: "https://arxiv.org/abs/1406.2661" },
  },
  "variational-autoencoder": {
    one_line: "Learn a distribution over latent representations, balancing accurate reconstruction with a useful sampling space.",
    steps: {
      concept: { body: "A variational autoencoder uses an encoder to approximate a posterior distribution over latent variables and a decoder to model observations from those latents. A common encoder predicts Gaussian means and variances. Training balances reconstruction quality with a KL term that encourages the approximate posterior to stay near a prior. This makes sampling possible, but the balance can fail, including posterior collapse where the decoder ignores the latent." },
      intuition: { body: "Instead of compressing each input into one exact address, the encoder assigns a small region of a map. The decoder learns to reconstruct useful samples from points in that region. Encouraging those regions to fit a simple overall map makes it possible to sample new points without first encoding an existing input." },
      math: {
        body: "The reparameterization trick writes a latent draw as mean plus standard deviation times independent noise. For a diagonal Gaussian posterior and standard normal prior, the KL divergence has a closed form. The objective maximizes an evidence lower bound combining expected log likelihood and negative KL.",
        formulas: ["z=\\mu+\\sigma\\odot\\epsilon,\\qquad \\epsilon\\sim\\mathcal N(0,I)", "D_{\\mathrm{KL}}=\\frac12\\sum_j\\left(\\mu_j^2+\\sigma_j^2-\\log\\sigma_j^2-1\\right)"],
        worked_example: "With mean [0.2, -0.1] and variances [0.5, 2], the Gaussian KL to a standard normal prior is 0.275. If the mean is zero and both variances are one, KL is zero.",
      },
      code: {
        language: "python",
        snippet: `from math import sqrt, log

mean = [0.2, -0.1]
variance = [0.5, 2.0]
noise = [1.0, -1.0]
latent = [m + sqrt(v)*e for m, v, e in zip(mean, variance, noise)]
kl = 0.5 * sum(m*m + v - log(v) - 1 for m, v in zip(mean, variance))
print(latent, round(kl, 6))`,
        explanation: "The chosen noise vector makes one sample reproducible. The code illustrates latent sampling and the KL term, not a complete trained encoder/decoder. Frameworks commonly predict log variance for numerical convenience.",
      },
    },
    quiz: [
      { id: "vae-1", question: "What does the reparameterization trick separate from the learned parameters?", options: ["The dataset labels forever", "Independent sampling noise", "Every decoder weight"], correct_index: 1, explanation: "Writing z = mu + sigma*epsilon lets gradients flow through mu and sigma while epsilon is independent noise." },
      { id: "vae-2", question: "When is the Gaussian KL to a standard normal prior zero?", options: ["Whenever variance is zero", "Whenever the decoder is large", "When mean is zero and variance is one in every dimension"], correct_index: 2, explanation: "The two distributions then match exactly." },
      { id: "vae-3", question: "Why not optimize only reconstruction quality?", options: ["The latent distribution may become unsuitable for prior-based sampling", "Reconstruction is never useful", "KL always equals one"], correct_index: 0, explanation: "The KL regularization helps organize a latent space compatible with the sampling prior." },
    ],
    terms: {
      "Approximate posterior": "The encoder's tractable estimate of latent uncertainty given an observation.",
      Prior: "A distribution over latent variables before observing a specific input.",
      Reparameterization: "Expressing a random draw using learned deterministic transforms of independent noise.",
      ELBO: "Evidence lower bound, a training objective balancing expected log likelihood and a KL penalty.",
    },
    used_in: ["Latent representation learning", "Generative modeling", "Probabilistic reconstruction"],
    go_deeper: { title: "Auto-Encoding Variational Bayes", url: "https://arxiv.org/abs/1312.6114" },
  },
};
