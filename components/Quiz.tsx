"use client";

import { useId, useState } from "react";
import type { LessonContent } from "@/lib/schemas/validation";
import { Icon } from "./Icon";

export function Quiz({
  questions, initialAnswers = [], initialScore = null, onAnswersChange, onChecked, onRetry,
}: {
  questions: LessonContent["quiz"];
  initialAnswers?: number[];
  initialScore?: number | null;
  onAnswersChange?: (answers: number[]) => void;
  onChecked?: (answers: number[], score: number) => void;
  onRetry?: (answers: number[]) => void;
}) {
  const id = useId();
  const [answers, setAnswers] = useState(() => questions.map((_, index) => initialAnswers[index] ?? -1));
  const [checked, setChecked] = useState(initialScore !== null);
  const [error, setError] = useState("");
  const correct = questions.filter((question, index) => answers[index] === question.correct_index).length;
  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    const nextAnswers = answers.map((answer, index) => index === questionIndex ? optionIndex : answer);
    setAnswers(nextAnswers);
    setError("");
    onAnswersChange?.(nextAnswers);
  };
  const check = () => {
    if (answers.some((answer) => answer < 0)) {
      setError("Choose an answer for every question, then check again.");
      return;
    }
    setError("");
    setChecked(true);
    onChecked?.(answers, correct / questions.length);
  };
  return (
    <div>
      <div className="space-y-6">
        {questions.map((question, questionIndex) => (
          <fieldset key={question.id}>
            <legend className="mb-3 text-small font-medium leading-6">{questions.length > 1 ? `${questionIndex + 1}. ` : ""}{question.question}</legend>
            <div className="space-y-2">
              {question.options.map((option, optionIndex) => {
                const selected = answers[questionIndex] === optionIndex;
                const correctOption = checked && optionIndex === question.correct_index;
                const wrongOption = checked && selected && !correctOption;
                return (
                  <label key={optionIndex} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-default border p-3 text-small leading-6 ${correctOption ? "border-success-text/30 bg-success-bg text-success-text" : wrongOption ? "border-danger-text/30 bg-danger-bg text-danger-text" : selected ? "border-accent-fill bg-accent-bg text-accent-text" : "border-border hover:border-border-strong"}`}>
                    <input type="radio" name={`${id}-${questionIndex}`} value={optionIndex} checked={selected} disabled={checked} onChange={() => selectAnswer(questionIndex, optionIndex)} className="mt-1 h-4 w-4 shrink-0 accent-accent-fill" />
                    <span className="flex-1">{option}</span>
                    {correctOption && <Icon name="check" size={17} className="mt-0.5 shrink-0" />}
                    {wrongOption && <Icon name="close" size={17} className="mt-0.5 shrink-0" />}
                  </label>
                );
              })}
            </div>
            {checked && <div className={`mt-3 rounded-default p-3 text-small ${answers[questionIndex] === question.correct_index ? "bg-success-bg text-success-text" : "bg-warning-bg text-warning-text"}`}><p className="font-medium">{answers[questionIndex] === question.correct_index ? "That's right." : "Not quite. Here's why."}</p><p className="mt-1">{question.explanation}</p></div>}
          </fieldset>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-small text-danger-text">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {checked ? <button type="button" className="btn-secondary" onClick={() => { setChecked(false); setError(""); onRetry?.(answers); }}><Icon name="rotate" size={15} />Try again</button> : <button type="button" className="btn-secondary" onClick={check}>Check {questions.length === 1 ? "answer" : "answers"}</button>}
        <p role="status" aria-live="polite" className="text-small text-text-secondary">{checked ? `${correct} of ${questions.length} correct` : ""}</p>
      </div>
    </div>
  );
}
