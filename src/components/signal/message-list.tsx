"use client";
import styles from "./signal.module.css";

const MARKS = ["heard", "with-you", "praying", "solid", "check-in"] as const;

type Message = {
  id: string;
  senderMemberId: string;
  kind: string;
  body: string | null;
  voiceUrl?: string | null;
  transcript?: string | null;
  visibility: string;
  witnessMode: boolean;
  createdAt: string;
};

export function MessageList({
  messages,
  onMark,
}: {
  messages: Message[];
  onMark?: (messageId: string, mark: string) => void;
}) {
  if (messages.length === 0) {
    return <div className={styles.empty}>Nothing here yet. First word is yours.</div>;
  }
  return (
    <>
      {messages.map((message) => (
        <div key={message.id} className={styles.card}>
          <div className={styles.rowBetween}>
            <div className={styles.meta}>
              {message.kind} • {message.visibility}
              {message.witnessMode ? " • witness" : ""}
            </div>
            <div className={styles.dim}>{new Date(message.createdAt).toLocaleString()}</div>
          </div>
          {message.body ? <p className={styles.msgBody}>{message.body}</p> : null}
          {message.transcript ? <div className={styles.transcript}>{message.transcript}</div> : null}
          {message.voiceUrl ? <audio style={{ marginTop: 10, width: "100%" }} controls src={message.voiceUrl} /> : null}
          {onMark ? (
            <div className={styles.markRow}>
              {MARKS.map((mark) => (
                <button key={mark} className={styles.markBtn} onClick={() => onMark(message.id, mark)}>
                  {mark.replace("-", " ")}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}
