"use client";
import { useEffect, useState } from "react";
import styles from "./trivia-widget.module.css";

type Question = { id: string; question: string; choices: string[]; category: string };
type ViewState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error" }
  | { status: "unanswered"; question: Question }
  | { status: "answered"; question: Question; correct: boolean; correctIndex: number };

export function TriviaWidget() {
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/arcade/games/trivia/today")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.empty || !data.question) {
          setState({ status: "empty" });
        } else if (data.alreadyAttempted) {
          setState({ status: "answered", question: data.question, correct: !!data.wasCorrect, correctIndex: -1 });
        } else {
          setState({ status: "unanswered", question: data.question });
        }
      })
      .catch(() => setState({ status: "error" }));
  }, []);

  async function submit(choiceIndex: number) {
    if (state.status !== "unanswered" || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/arcade/games/trivia/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: state.question.id, choiceIndex }),
      });
      const data = await res.json();
      if (res.ok) {
        setState({ status: "answered", question: state.question, correct: data.correct, correctIndex: data.correctIndex });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status === "loading") return <p className={styles.status}>Loading today's question…</p>;
  if (state.status === "error") return <p className={styles.status}>Couldn't load trivia right now.</p>;
  if (state.status === "empty") return <p className={styles.status}>No trivia questions yet — check back soon.</p>;

  const { question } = state;

  return (
    <div className={styles.card}>
      <span className={styles.category}>{question.category}</span>
      <p className={styles.question}>{question.question}</p>
      <div className={styles.choices}>
        {question.choices.map((choice, i) => {
          const isAnswered = state.status === "answered";
          const isCorrectChoice = isAnswered && state.correctIndex === i;
          return (
            <button
              key={i}
              disabled={isAnswered || submitting}
              className={[styles.choiceBtn, isCorrectChoice ? styles.correctChoice : ""].join(" ")}
              onClick={() => submit(i)}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {state.status === "answered" && (
        <p className={state.correct ? styles.correctText : styles.incorrectText}>
          {state.correct ? "Correct!" : "Not quite — come back tomorrow for a new question."}
        </p>
      )}
    </div>
  );
}
