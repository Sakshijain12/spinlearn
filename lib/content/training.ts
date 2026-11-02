import type { LessonDraft } from "./types";

export const training: Record<string, LessonDraft> = {
  "lora": {
    one_line: "Train a small low-rank correction while leaving the pretrained weight matrix frozen.",
    steps: {
      concept: { body: "Low-Rank Adaptation represents a weight update as the product of two thin matrices. The base weights remain frozen while the small adapter matrices are trained. This reduces trainable parameters and optimizer-state memory, although activations and base-model weights still require memory. An adapter can often be merged into compatible base weights for inference. Its rank and target layers are design choices, not guarantees of unchanged quality." },
      intuition: { body: "Instead of editing every entry in a large spreadsheet independently, describe its correction using a few shared patterns. Each pattern combines a direction in the input space with a direction in the output space. A small number of patterns can capture useful task adaptations without allowing every possible full-rank change." },
      math: {
        body: "For W of shape m by n, B has shape m by r and A has shape r by n. The update BA has rank at most r. The adapter uses r(m+n) parameters instead of mn. A common scale is alpha/r; initializations often make the initial update zero.",
        formulas: ["W'=W+\\frac{\\alpha}{r}BA,\\qquad r\\ll\\min(m,n)", "P_{\\mathrm{adapter}}=r(m+n)"],
        worked_example: "For a 4096 by 4096 matrix and rank 8, the adapter has 65,536 parameters, versus 16,777,216 entries in the full matrix: about 0.39%. This compares trainable weight counts, not total system memory.",
      },
      code: {
        language: "python",
        snippet: `base = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]
A = [[1.0, -1.0, 0.5]]
B = [[0.2], [-0.1]]
x = [2.0, 1.0, 4.0]
rank = 1
delta = [[sum(B[i][k] * A[k][j] for k in range(rank))
          for j in range(3)] for i in range(2)]
merged = [[base[i][j] + delta[i][j] for j in range(3)] for i in range(2)]
output = [sum(w*v for w, v in zip(row, x)) for row in merged]
adapter_parameters = rank * (2 + 3)
print(delta, output, adapter_parameters)`,
        explanation: "This shows a rank-one update with scale alpha/r = 1 and a merged forward pass. The adapter values are illustrative, not learned. In training, freeze the base matrix and optimize only A and B.",
      },
    },
    quiz: [
      { id: "lora-1", question: "Which parameters are usually trained in basic LoRA?", options: ["The small adapter matrices", "Every base-model parameter", "Only the input token IDs"], correct_index: 0, explanation: "Basic LoRA freezes the base weights and learns the low-rank correction." },
      { id: "lora-2", question: "How many adapter parameters are needed for m by n weights and rank r?", options: ["mn", "r(m+n)", "m+n+r squared"], correct_index: 1, explanation: "B contributes mr parameters and A contributes rn." },
      { id: "lora-3", question: "Does a small trainable adapter eliminate the base model's memory requirements?", options: ["Yes, the base model disappears", "Yes, every activation becomes zero", "No, base weights and activations still matter"], correct_index: 2, explanation: "LoRA primarily reduces trainable parameters and optimizer state, not all memory costs." },
    ],
    terms: {
      Rank: "The number of independent directions a matrix can represent; BA has rank at most the adapter width.",
      Adapter: "A relatively small trainable component added to adapt a pretrained model.",
      "Frozen weights": "Parameters kept unchanged during the current training procedure.",
      "Merge step": "Adding the trained adapter update into compatible base weights for a combined inference matrix.",
    },
    used_in: ["Parameter-efficient fine-tuning", "Task-specific adapters", "Multi-tenant model customization"],
    go_deeper: { title: "LoRA: Low-Rank Adaptation of Large Language Models", url: "https://arxiv.org/abs/2106.09685" },
  },
  "reinforcement-learning": {
    one_line: "Learn decisions from their consequences by maximizing expected cumulative reward.",
    steps: {
      concept: { body: "Reinforcement learning studies an agent interacting with an environment. The agent observes a state, chooses an action, receives a reward, and transitions onward. A policy maps observations to actions. Rewards can be delayed, so credit assignment matters. Exploration gathers information about alternatives; exploitation uses current knowledge. A poorly specified reward can encourage unwanted behavior even when optimization works as designed." },
      intuition: { body: "A game-playing agent may sacrifice an immediate point to improve its eventual chance of winning. Learning which actions are worthwhile requires more than predicting the next reward. A value estimate summarizes expected future outcomes, and a discount factor controls how strongly later rewards count." },
      math: {
        body: "Tabular Q-learning moves an action-value estimate toward a reward plus the best estimated next-state value. For a terminal next state, omit the future-value term. Convergence results need assumptions such as adequate exploration and suitable learning rates; arbitrary neural-network variants are not automatically stable.",
        formulas: ["Q(s,a)\\leftarrow Q(s,a)+\\eta\\left[r+\\gamma\\max_{a'}Q(s',a')-Q(s,a)\\right]"],
        worked_example: "With current Q = 0, reward 1, next best Q = 2, gamma = 0.9, and step size 0.5, the target is 2.8 and the updated Q is 1.4.",
      },
      code: {
        language: "python",
        snippet: `current_q = 0.0
reward = 1.0
next_values = [2.0, 0.5]
discount = 0.9
learning_rate = 0.5
terminal = False

target = reward + (0.0 if terminal else discount * max(next_values))
updated_q = current_q + learning_rate * (target - current_q)
print("Target:", target, "Updated Q:", updated_q)`,
        explanation: "This is one Q-learning update, not a fully trained agent. A full loop collects transitions, chooses an exploration policy, handles terminal states, and evaluates the resulting behavior against the intended objective.",
      },
    },
    quiz: [
      { id: "rl-1", question: "What does a policy specify?", options: ["Only the optimizer's learning rate", "How the agent chooses actions", "The number of vocabulary tokens"], correct_index: 1, explanation: "A policy determines an action or action distribution from the available observation or state." },
      { id: "rl-2", question: "What should happen to the bootstrap term after a terminal transition?", options: ["It must double", "It must use an unrelated state", "It should be omitted"], correct_index: 2, explanation: "A terminal state has no subsequent return in the episode to bootstrap from." },
      { id: "rl-3", question: "Why is reward design important?", options: ["An agent may optimize the stated reward without achieving the intended goal", "Any reward guarantees good behavior", "Reward does not influence learning"], correct_index: 0, explanation: "A reward is a proxy for the designer's intent and can be incomplete or misaligned." },
    ],
    terms: {
      Policy: "A rule or distribution used by an agent to choose actions.",
      "Action value": "The expected return from taking an action and then following an assumed future policy.",
      Exploration: "Trying actions to acquire information rather than only choosing the current best estimate.",
      "Discount factor": "A factor between zero and one used to reduce the weight of later rewards in many return definitions.",
    },
    used_in: ["Game-playing agents", "Simulation-based control", "Sequential decision systems"],
    go_deeper: { title: "Dive into Deep Learning: Q-learning", url: "https://d2l.ai/chapter_reinforcement-learning/qlearning.html" },
  },
  "fine-tuning": {
    one_line: "Start from a pretrained model and update it using examples of the behavior your task needs.",
    steps: {
      concept: { body: "Fine-tuning continues training from pretrained parameters instead of starting from random initialization. It can update all parameters or only selected components such as a head or adapter. Good task data, clear labels, representative evaluation, and conservative hyperparameters matter more than simply running more epochs. Fine-tuning may overfit or degrade earlier capabilities, so compare against the original model and relevant held-out tests." },
      intuition: { body: "A musician who already knows an instrument can learn a new repertoire faster than a beginner. Practice changes existing skills rather than inventing them from nothing. Too much narrow practice can still weaken versatility. A pretrained model similarly brings useful representations, but the new objective can pull those representations in unwanted directions." },
      math: {
        body: "Initialize theta at pretrained weights theta_0, then minimize an average supervised loss on a task dataset. For a binary logistic model, sigmoid(wx) predicts class-one probability and the gradient of cross-entropy with respect to w is (p-y)x.",
        formulas: ["\\theta\\gets\\theta_0,\\qquad \\min_\\theta\\frac1N\\sum_i\\ell(f_\\theta(x_i),y_i)", "\\frac{\\partial\\ell}{\\partial w}=(\\sigma(wx)-y)x"],
        worked_example: "A pretrained scalar weight w = 1 already gives a positive example x = 1 probability about 0.731. Training on positive x = 1 and negative x = -1 increases its margin; it does not initialize a new classifier from zero.",
      },
      code: {
        language: "python",
        snippet: `from math import exp, log

examples = [(-1.0, 0), (1.0, 1)]
pretrained_weight = 1.0
weight = pretrained_weight
losses = []
for _ in range(20):
    probabilities = [1 / (1 + exp(-weight*x)) for x, _ in examples]
    loss = -sum(y*log(p) + (1-y)*log(1-p)
                for (_, y), p in zip(examples, probabilities)) / len(examples)
    losses.append(loss)
    gradient = sum((p-y)*x for (x, y), p in zip(examples, probabilities)) / len(examples)
    weight -= 0.1 * gradient
print(round(weight, 4), round(losses[-1], 4))`,
        explanation: "This tiny logistic model demonstrates continued training from a nonzero pretrained parameter. It is not an LLM fine-tuning job. Real adaptation also requires data governance, a separate validation split, and checks for capability regression.",
      },
    },
    quiz: [
      { id: "ft-1", question: "What distinguishes fine-tuning from training from scratch?", options: ["It never uses labels", "It cannot change any parameter", "It starts from pretrained parameters"], correct_index: 2, explanation: "Fine-tuning reuses a learned initialization and adapts it to a new objective or dataset." },
      { id: "ft-2", question: "What should be evaluated after adaptation?", options: ["Task performance and regressions on relevant earlier capabilities", "Only the number of epochs", "Only training loss on repeated examples"], correct_index: 0, explanation: "An adaptation can help the target task while harming other behavior or overfitting." },
      { id: "ft-3", question: "Must every parameter be updated?", options: ["Yes, otherwise it is impossible", "No, heads or adapters can be trained selectively", "Only token IDs can be updated"], correct_index: 1, explanation: "Full fine-tuning and parameter-efficient adaptation are different valid choices." },
    ],
    terms: {
      Pretraining: "Initial learning that produces reusable parameters before task-specific adaptation.",
      "Catastrophic forgetting": "A substantial loss of earlier capabilities when training on new data or objectives.",
      "Validation split": "Held-out examples used to choose training settings without using the final test set.",
    },
    used_in: ["Domain adaptation", "Task-specific classifiers", "Instruction-following models"],
    go_deeper: { title: "Universal Language Model Fine-tuning for Text Classification", url: "https://arxiv.org/abs/1801.06146" },
  },
  "learning-rate-schedule": {
    one_line: "Use a changing step size to balance early training stability with later refinement.",
    steps: {
      concept: { body: "A learning-rate schedule changes the optimizer's step size over time. Warmup starts with smaller steps and increases them; decay later reduces the step size. Common schedules include step decay, cosine decay, and validation-driven reductions. The schedule must match its unit, such as optimizer updates rather than mini-batches before gradient accumulation. A good schedule still depends on optimizer, batch size, and task." },
      intuition: { body: "Start cautiously while the training dynamics settle, move more decisively once they are stable, then take finer steps near the end. Warmup and decay implement this rough pattern. They are tools, not universal laws: copying a schedule without matching the training length or update frequency can make it behave very differently." },
      math: {
        body: "After warmup, cosine decay moves from eta_max toward zero over a fixed horizon T. Progress t/T is clamped to the intended interval. A nonzero minimum learning rate can be added in variants.",
        formulas: ["\\eta_t=\\frac{\\eta_{\\max}}2\\left(1+\\cos\\frac{\\pi t}{T}\\right),\\qquad 0\\leq t\\leq T"],
        worked_example: "At the start of cosine decay the rate is eta_max, halfway through it is eta_max/2, and at its endpoint it is zero.",
      },
      code: {
        language: "python",
        snippet: `from math import cos, pi

def rate(step, total=10, warmup=2, peak=0.001):
    if not 0 <= warmup < total or not 0 <= step <= total:
        raise ValueError("Invalid schedule position")
    if step < warmup:
        return peak * (step + 1) / warmup
    progress = (step - warmup) / (total - warmup)
    return peak * 0.5 * (1 + cos(pi * progress))

rates = [rate(step) for step in range(11)]
print([round(value, 6) for value in rates])`,
        explanation: "The first two updates warm up to the peak; the remaining horizon decays to zero. State exactly when the scheduler is stepped in a real loop, especially with gradient accumulation or resumed checkpoints.",
      },
    },
    quiz: [
      { id: "lr-1", question: "What does warmup normally do?", options: ["Gradually increases an initially small learning rate", "Permanently freezes all parameters", "Deletes early training examples"], correct_index: 0, explanation: "Warmup provides smaller early updates before reaching the configured peak rate." },
      { id: "lr-2", question: "What is the cosine-decayed rate halfway through the decay horizon?", options: ["Twice the peak", "Half the peak", "Always zero"], correct_index: 1, explanation: "cos(pi/2) is zero, leaving eta_max/2." },
      { id: "lr-3", question: "Why distinguish batches from optimizer updates?", options: ["They must always be identical", "Cosine needs text input", "Gradient accumulation can combine several batches into one update"], correct_index: 2, explanation: "Stepping a schedule per batch instead of per accumulated optimizer update changes its effective duration." },
    ],
    terms: {
      Warmup: "An initial period in which the learning rate increases toward its intended scale.",
      Decay: "A later reduction in the learning rate according to time or a performance criterion.",
      "Gradient accumulation": "Combining gradients from several mini-batches before applying one parameter update.",
    },
    used_in: ["Transformer training", "Large-batch optimization", "Fine-tuning"],
    go_deeper: { title: "SGDR: Stochastic Gradient Descent with Warm Restarts", url: "https://arxiv.org/abs/1608.03983" },
  },
  "scaling-laws": {
    one_line: "Fit empirical trends to plan how model size, data, and compute may improve loss.",
    steps: {
      concept: { body: "Neural scaling laws describe empirical relationships between measures such as held-out loss, parameter count, training data, and compute. Power-law fits can guide budget allocation, but their constants and exponents depend on the studied setting. Extrapolation beyond measured ranges is uncertain. More parameters alone do not ensure better results if training data or compute are insufficient, and lower average loss does not guarantee every downstream behavior improves." },
      intuition: { body: "Doubling a factory's machinery helps little if it still receives the same tiny supply of raw material. Model size and data interact in a similar way under a fixed training budget. Scaling studies help decide how to distribute resources rather than blindly maximizing one number." },
      math: {
        body: "A simplified fitted loss has an irreducible term plus parameter- and data-limited terms. N and D represent parameter and token counts in the units used by the fit. Training compute is often roughly proportional to ND for a fixed dense-model recipe, but the constant and omitted costs depend on architecture.",
        formulas: ["L(N,D)\\approx L_\\infty+A N^{-\\alpha}+B D^{-\\beta}", "C\\propto ND"],
        worked_example: "For the illustrative one-axis curve L(N) = 0.1 + 2/sqrt(N), increasing N from 1 to 4 reduces loss from 2.1 to 1.1. The excess over the floor halves; the total loss does not become zero.",
      },
      code: {
        language: "python",
        snippet: `def fitted_loss(size):
    if size <= 0:
        raise ValueError("Size must be positive")
    floor, coefficient, exponent = 0.1, 2.0, 0.5
    return floor + coefficient * size ** (-exponent)

sizes = [1, 4, 16, 64]
losses = [fitted_loss(size) for size in sizes]
print(list(zip(sizes, losses)))`,
        explanation: "The coefficients are invented to demonstrate the shape of a power law, not predictions for a real model. Fit and validate such coefficients from actual experiments before using them to plan spending.",
      },
    },
    quiz: [
      { id: "scale-1", question: "What kind of claim is a fitted neural scaling law?", options: ["A universal mathematical guarantee", "An empirical relationship under studied conditions", "A replacement for evaluation"], correct_index: 1, explanation: "Scaling fits summarize observations and carry uncertainty outside the measured regime." },
      { id: "scale-2", question: "For fixed compute roughly proportional to ND, increasing N usually leaves what?", options: ["Unlimited training tokens", "No effect on the budget", "Less budget for D unless another factor changes"], correct_index: 2, explanation: "Keeping the product approximately fixed means larger models generally allow fewer training tokens." },
      { id: "scale-3", question: "What is the floor of 0.1 + 2/sqrt(N) as N grows?", options: ["0.1", "2", "Negative infinity"], correct_index: 0, explanation: "The inverse-power term tends toward zero while the irreducible term remains." },
    ],
    terms: {
      "Power law": "A relationship where one quantity changes as a constant power of another.",
      "Compute-optimal": "An allocation intended to achieve the best measured objective for a fixed compute budget.",
      Extrapolation: "Applying a fitted trend outside the range of observations used to estimate it.",
    },
    used_in: ["Training-budget planning", "Model-size selection", "Experiment forecasting"],
    go_deeper: { title: "Training Compute-Optimal Large Language Models", url: "https://arxiv.org/abs/2203.15556" },
  },
  "knowledge-distillation": {
    one_line: "Let a student learn from a teacher's probability patterns, not only hard labels.",
    steps: {
      concept: { body: "Knowledge distillation trains a student to match aspects of a teacher's outputs or representations. Soft class probabilities convey relationships between incorrect alternatives that a one-hot label omits. A temperature can soften the distributions. Distillation may combine teacher targets with original labels. It can reduce deployment cost, but the student can also inherit the teacher's errors or biases and still needs independent evaluation." },
      intuition: { body: "An answer key says only which option is correct. A tutor can also explain that one wrong alternative is much closer than another. A soft distribution provides a limited numerical version of that extra information. A smaller student may learn a useful approximation without reproducing every ability of the teacher." },
      math: {
        body: "Compare teacher distribution p_T with student distribution q_T at temperature T using KL divergence. A common training objective multiplies this term by T squared to compensate for gradient scaling and combines it with hard-label loss.",
        formulas: ["L_{\\mathrm{distill}}=T^2\\sum_i p_T(i)\\log\\frac{p_T(i)}{q_T(i)}"],
        worked_example: "A teacher assigning [0.7, 0.2, 0.1] reveals a preference between the two incorrect classes that a hard target [1, 0, 0] hides.",
      },
      code: {
        language: "python",
        snippet: `from math import exp, log

def softmax(values, temperature):
    weights = [exp((x - max(values)) / temperature) for x in values]
    return [w / sum(weights) for w in weights]

temperature = 2.0
teacher = softmax([3.0, 1.0, 0.0], temperature)
student = softmax([0.2, 0.1, 0.0], temperature)
kl = sum(p * log(p / q) for p, q in zip(teacher, student))
distillation_loss = temperature ** 2 * kl
print(round(distillation_loss, 6))`,
        explanation: "This computes a distillation objective for one example. Actual training differentiates the student logits while treating teacher targets as fixed, and may add supervised cross-entropy on the true label.",
      },
    },
    quiz: [
      { id: "kd-1", question: "What extra information can soft targets contain?", options: ["Only the index of the largest class", "The exact training data by definition", "Relative probabilities of alternative classes"], correct_index: 2, explanation: "The distribution expresses relationships beyond the single winning label." },
      { id: "kd-2", question: "Which model normally receives gradient updates in basic distillation?", options: ["The student", "Only the frozen teacher", "Neither model ever changes"], correct_index: 0, explanation: "The teacher provides targets while training updates the student to match them." },
      { id: "kd-3", question: "Does matching a teacher remove the need for student evaluation?", options: ["Yes, every property transfers perfectly", "No, errors and limitations can transfer or change", "Only if temperature equals two"], correct_index: 1, explanation: "A student is an approximation and may inherit or introduce errors." },
    ],
    terms: {
      Teacher: "The model providing targets or representations for another model to learn from.",
      Student: "The model being trained to approximate useful behavior of the teacher.",
      "Soft target": "A target probability distribution rather than a single class ID.",
      "KL divergence": "A directional measure of mismatch between probability distributions.",
    },
    used_in: ["Small-model deployment", "Model compression", "Transferring capabilities"],
    go_deeper: { title: "Distilling the Knowledge in a Neural Network", url: "https://arxiv.org/abs/1503.02531" },
  },
};
