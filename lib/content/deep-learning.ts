import type { LessonDraft } from "./types";

export const deepLearning: Record<string, LessonDraft> = {
  "backpropagation": {
    one_line: "Reuse intermediate derivatives to efficiently calculate how each parameter affects the final loss.",
    steps: {
      concept: { body: "Backpropagation applies the chain rule through a computation graph in reverse order. A forward pass produces predictions and records intermediates; a backward pass combines local derivatives with incoming loss gradients. When a value influences multiple paths, their gradient contributions add. Backpropagation computes gradients; an optimizer such as SGD or Adam decides how to update the parameters." },
      intuition: { body: "Imagine tracing the causes of an error from the output back to each adjustable part. Every operation answers: if my output changed a little, how much would each input need to change? Passing this sensitivity backward avoids separately rerunning the whole model for every weight, as a naive numerical-difference method would." },
      math: {
        body: "For h = ax, prediction b h, and half squared error, first compute the output error. Multiply it by local derivatives to obtain gradients for b and a. The factor one-half removes a factor of two from the loss derivative.",
        formulas: ["h=ax,\\quad \\widehat y=bh,\\quad L=\\tfrac12(\\widehat y-y)^2", "\\frac{\\partial L}{\\partial b}=(\\widehat y-y)h,\\qquad \\frac{\\partial L}{\\partial a}=(\\widehat y-y)bx"],
        worked_example: "With x = 2, a = 3, b = 4, and target 1, h = 6 and prediction = 24. The gradients are dL/db = 23*6 = 138 and dL/da = 23*4*2 = 184.",
      },
      code: {
        language: "python",
        snippet: `x, target = 2.0, 1.0
a, b = 3.0, 4.0
hidden = a * x
prediction = b * hidden
error = prediction - target
grad_b = error * hidden
grad_a = error * b * x

def loss(first_weight):
    return 0.5 * (b * first_weight * x - target) ** 2

epsilon = 1e-5
numerical = (loss(a + epsilon) - loss(a - epsilon)) / (2 * epsilon)
print(grad_a, grad_b, round(numerical, 3))`,
        explanation: "The central finite difference checks the analytical gradient for a. It is a useful diagnostic on small examples, but computing every gradient this way would be expensive for a large model.",
      },
    },
    quiz: [
      { id: "bp-1", question: "What does backpropagation produce?", options: ["A new training dataset", "Gradients of a loss", "A guarantee of global optimality"], correct_index: 1, explanation: "The backward pass calculates sensitivities. The optimizer applies an update afterward." },
      { id: "bp-2", question: "If one variable contributes to two paths into the loss, what happens to its gradients?", options: ["Only one path counts", "They cancel automatically", "The contributions are added"], correct_index: 2, explanation: "The multivariable chain rule sums the effects of all downstream paths." },
      { id: "bp-3", question: "For the worked example, what is dL/da?", options: ["184", "138", "24"], correct_index: 0, explanation: "The output error is 23, and the local factors are b = 4 and x = 2: 23*4*2 = 184." },
    ],
    terms: {
      "Chain rule": "A rule for differentiating a composition by multiplying and summing local derivatives.",
      "Computation graph": "A representation of operations and the values flowing between them.",
      "Gradient check": "A comparison between an analytical or automatic derivative and a numerical approximation.",
    },
    used_in: ["Automatic differentiation", "Neural-network training", "Differentiable programming"],
    go_deeper: { title: "Dive into Deep Learning: backpropagation", url: "https://d2l.ai/chapter_multilayer-perceptrons/backprop.html" },
  },
  "batch-normalization": {
    one_line: "Normalize activations, then learn their scale and offset; use different statistics at training and inference.",
    steps: {
      concept: { body: "Batch normalization standardizes activations using mini-batch mean and variance, followed by learned scale gamma and offset beta. Training also accumulates running statistics that are typically used at inference. For convolutional layers, statistics are often collected per channel over the batch and spatial positions. Its behavior depends on batch composition, so very small batches and train/eval mode mistakes can cause problems." },
      intuition: { body: "A measuring instrument is easier to use when its readings stay on a manageable scale. Batch normalization adjusts that scale but then lets the model learn a preferred calibration. At deployment, recomputing calibration from whichever users happen to share a request batch could make predictions inconsistent, which is why fixed running estimates are normally used." },
      math: {
        body: "Compute batch mean mu and variance v, normalize with a small positive epsilon for stability, then apply gamma and beta. This expression uses a population-style batch variance; framework details for updating running variance can differ.",
        formulas: ["\\widehat x_i=\\frac{x_i-\\mu_B}{\\sqrt{v_B+\\epsilon}},\\qquad y_i=\\gamma\\widehat x_i+\\beta"],
        worked_example: "For [1, 2, 3, 4], the batch mean is 2.5 and variance is 1.25. With gamma = 1 and beta = 0, normalized values are about [-1.342, -0.447, 0.447, 1.342].",
      },
      code: {
        language: "python",
        snippet: `from math import sqrt

batch = [1.0, 2.0, 3.0, 4.0]
mean = sum(batch) / len(batch)
variance = sum((x - mean) ** 2 for x in batch) / len(batch)
gamma, beta, epsilon = 1.0, 0.0, 1e-5
normalized = [(x - mean) / sqrt(variance + epsilon) for x in batch]
outputs = [gamma * x + beta for x in normalized]
print([round(x, 3) for x in outputs])`,
        explanation: "This illustrates training-time normalization for one feature, not a complete layer with running statistics. At inference, use the stored statistics and the framework's evaluation mode rather than normalizing each request independently.",
      },
    },
    quiz: [
      { id: "bn-1", question: "Which statistics are typically used at inference?", options: ["A fresh mean from each single request", "Always mean zero and variance one", "Stored running mean and variance"], correct_index: 2, explanation: "Evaluation normally uses accumulated statistics rather than statistics of the current inference batch." },
      { id: "bn-2", question: "Why add epsilon inside the square root?", options: ["To stabilize division when variance is tiny", "To erase the batch mean", "To increase the number of features"], correct_index: 0, explanation: "A small epsilon prevents division by zero or an extremely small standard deviation." },
      { id: "bn-3", question: "What do gamma and beta control?", options: ["The dataset split", "Learned scale and offset", "The convolution kernel size"], correct_index: 1, explanation: "The affine transform lets the model choose a useful scale and offset after standardization." },
    ],
    terms: {
      "Batch statistics": "The mean and variance computed from the current training mini-batch.",
      "Running statistics": "Accumulated estimates of activation mean and variance used during evaluation.",
      "Affine transform": "A learned multiplication and addition, such as gamma*x + beta.",
    },
    used_in: ["Convolutional networks", "Training stabilization", "Vision models"],
    go_deeper: { title: "Batch Normalization paper (2015)", url: "https://arxiv.org/abs/1502.03167" },
  },
  "dropout": {
    one_line: "Train with randomly missing activations so the network cannot rely on one fixed combination.",
    steps: {
      concept: { body: "Dropout randomly zeros selected activations during training. In inverted dropout, surviving activations are divided by the keep probability so their expected magnitude stays unchanged. Standard inference disables the masking because the scaling was already applied during training. Dropout is a regularizer, not a guarantee of better generalization; its usefulness depends on the architecture, data, and training recipe." },
      intuition: { body: "A team that sometimes practices without a member must learn several ways to complete the task. Similarly, a network cannot always depend on the exact same neighboring activations. It does not permanently delete those units: a different random mask is sampled on later passes. Setting the drop probability close to one leaves very little information to learn from." },
      math: {
        body: "Let p be the probability of dropping an activation and m a Bernoulli mask with keep probability 1-p. Inverted dropout multiplies by m/(1-p), making the conditional expected activation equal to the original x. Require 0 <= p < 1.",
        formulas: ["m\\sim\\operatorname{Bernoulli}(1-p),\\qquad \\widetilde x=\\frac{mx}{1-p}", "\\mathbb E[\\widetilde x\\mid x]=x"],
        worked_example: "For x = 4 and p = 0.5, the training output is either 0 or 8 with equal probability. Its expectation is 4. Ordinary inference returns 4.",
      },
      code: {
        language: "python",
        snippet: `from random import Random

rng = Random(7)
activations = [1.0, 2.0, 3.0, 4.0]
drop_probability = 0.5
training = [
    x / (1 - drop_probability) if rng.random() >= drop_probability else 0.0
    for x in activations
]
inference = activations.copy()
print("Training:", training)
print("Inference:", inference)`,
        explanation: "A seeded generator makes the demonstration repeatable. A real training run samples many masks; expectation preservation is an average statement, not a claim that every masked batch keeps its exact original mean.",
      },
    },
    quiz: [
      { id: "drop-1", question: "With inverted dropout, what normally happens during inference?", options: ["Masking is disabled", "Every activation is dropped", "All units are permanently removed"], correct_index: 0, explanation: "Training-time scaling already accounts for missing activations, so ordinary evaluation uses the unmasked network." },
      { id: "drop-2", question: "For x = 4 and drop probability 0.5, what are the possible training outputs?", options: ["0 and 4", "0 and 8", "2 and 4"], correct_index: 1, explanation: "A surviving value is divided by the keep probability 0.5, producing 8." },
      { id: "drop-3", question: "Which statement about a dropout mask is correct?", options: ["It permanently changes the layer size", "It must be the same for every training pass", "It randomly suppresses activations during training"], correct_index: 2, explanation: "Dropout masks are temporary perturbations, not permanent model pruning." },
    ],
    terms: {
      "Keep probability": "The probability that an activation survives a dropout mask.",
      "Inverted dropout": "Scaling surviving activations during training so ordinary inference needs no dropout scaling.",
      "Co-adaptation": "Excessive reliance among features on the presence of particular other features.",
    },
    used_in: ["Neural-network regularization", "Classifier training", "Some transformer training recipes"],
    go_deeper: { title: "Dropout research paper", url: "https://arxiv.org/abs/1207.0580" },
  },
  "cnn": {
    one_line: "Reuse a small learned filter across a signal to detect local patterns with shared parameters.",
    steps: {
      concept: { body: "A convolutional neural network applies local filters across structured data such as an image. Sharing the same filter at many positions uses fewer parameters than connecting every pixel independently and helps detect a pattern wherever it appears. Multiple channels and layers build richer features. Most deep-learning libraries call the operation convolution while actually implementing cross-correlation, without flipping the kernel." },
      intuition: { body: "Slide a small stencil over a picture and score how well each patch matches it. One stencil might respond to horizontal edges; another to texture. Later layers combine local responses into larger patterns. Stride changes how far the stencil moves each time, while padding controls what happens near boundaries." },
      math: {
        body: "For a one-dimensional valid cross-correlation with stride one, each output sums a local input window times the kernel. With input length n, kernel size k, stride s, padding p, and dilation one, the output length is floor((n+2p-k)/s)+1.",
        formulas: ["y_i=\\sum_{j=0}^{k-1}w_jx_{i+j}", "n_{\\mathrm{out}}=\\left\\lfloor\\frac{n+2p-k}{s}\\right\\rfloor+1"],
        worked_example: "Input [1, 2, 4, 0] and kernel [1, 0, -1] produce [-3, 2] with no padding and stride one.",
      },
      code: {
        language: "python",
        snippet: `signal = [1.0, 2.0, 4.0, 0.0]
kernel = [1.0, 0.0, -1.0]
outputs = [
    sum(signal[i + j] * kernel[j] for j in range(len(kernel)))
    for i in range(len(signal) - len(kernel) + 1)
]
print(outputs)`,
        explanation: "This is a fixed one-dimensional filter, not a trained image classifier. CNN training learns many such kernels, and two-dimensional convolutions extend the same local weighted-sum idea across image height and width.",
      },
    },
    quiz: [
      { id: "cnn-1", question: "What makes a convolutional filter parameter-efficient?", options: ["A separate weight for every location", "Reusing the same weights across locations", "Removing every nonlinear activation"], correct_index: 1, explanation: "Weight sharing lets one filter detect a pattern at many positions." },
      { id: "cnn-2", question: "For length 4, kernel size 3, no padding, and stride 1, how many outputs are produced?", options: ["4", "3", "2"], correct_index: 2, explanation: "The valid output length is 4 - 3 + 1 = 2." },
      { id: "cnn-3", question: "What does stride control?", options: ["The step between successive filter positions", "The learning rate", "The number of target classes"], correct_index: 0, explanation: "Increasing stride skips more input positions and generally reduces output resolution." },
    ],
    terms: {
      Kernel: "A small matrix or tensor of weights reused across local input regions.",
      Stride: "The spacing between consecutive positions where a filter is applied.",
      "Receptive field": "The input region that can influence a particular output activation.",
    },
    used_in: ["Image recognition", "Audio processing", "Medical-image analysis"],
    go_deeper: { title: "Dive into Deep Learning: convolutions", url: "https://d2l.ai/chapter_convolutional-neural-networks/conv-layer.html" },
  },
  "residual-connection": {
    one_line: "Let a block learn a correction to its input instead of forcing it to reconstruct everything.",
    steps: {
      concept: { body: "A residual connection adds a block's input to the output of a learned transformation. The direct path helps information and gradients travel through deep networks. If the transformation is near zero, the block behaves close to an identity map. Addition requires compatible shapes; a projection can adjust dimensions when needed. Residual paths help optimization but do not by themselves guarantee stable training." },
      intuition: { body: "Editing a useful draft is often easier than writing a new document from nothing. The direct path carries the draft, and the learned branch supplies corrections. Even if the correction branch initially contributes little, the original information still reaches the next block." },
      math: {
        body: "For y = x + F(x), the Jacobian is I + J_F. The identity term creates a direct gradient contribution. It does not imply that the total gradient can never vanish or grow: the transformation and the rest of the network still matter.",
        formulas: ["y=x+F(x)", "\\frac{\\partial y}{\\partial x}=I+\\frac{\\partial F}{\\partial x}"],
        worked_example: "If F(x) = 0.1x, the residual block returns 1.1x. For input [1, 2, 3], the output is [1.1, 2.2, 3.3]. If F is zero, the input passes through unchanged.",
      },
      code: {
        language: "python",
        snippet: `inputs = [1.0, 2.0, 3.0]
correction = [0.1 * x for x in inputs]
outputs = [x + delta for x, delta in zip(inputs, correction)]
identity_outputs = [x + 0.0 for x in inputs]
print(outputs)
print("Zero correction:", identity_outputs)`,
        explanation: "The correction is deliberately simple to isolate the skip connection. Real residual branches can contain convolutions, attention, normalization, or multilayer perceptrons.",
      },
    },
    quiz: [
      { id: "res-1", question: "If the residual branch F(x) is zero, what is x + F(x)?", options: ["Zero", "Twice the input", "The original input"], correct_index: 2, explanation: "The direct identity path preserves x even when the learned correction is zero." },
      { id: "res-2", question: "What is needed to add the input and branch output?", options: ["Compatible tensor shapes", "Different numbers of elements", "A softmax across all layers"], correct_index: 0, explanation: "Residual addition requires matching dimensions or an explicit projection to align them." },
      { id: "res-3", question: "Which gradient term comes from the direct path?", options: ["A mandatory zero matrix", "An identity contribution", "Only the loss value"], correct_index: 1, explanation: "Differentiating x with respect to itself contributes I to I + J_F." },
    ],
    terms: {
      "Skip connection": "A path that bypasses one or more transformations and carries information forward.",
      "Identity map": "A function whose output equals its input.",
      Projection: "A learned mapping used to change feature dimensions, for example to align residual shapes.",
    },
    used_in: ["ResNets", "Transformer blocks", "Deep feature extraction"],
    go_deeper: { title: "Deep Residual Learning for Image Recognition", url: "https://arxiv.org/abs/1512.03385" },
  },
};
